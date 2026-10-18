import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, open, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PstackPlugin } from '../opencode/index.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = path => readFile(resolve(root, path), 'utf8')
const hashes = JSON.parse(await read('upstream-bodies.json'))
const names = Object.keys(hashes).sort()
const roles = JSON.parse(await read('agents.json'))

test('both bundles preserve all 52 pinned bodies, adapters, and complete skill resources', async () => {
  assert.equal(names.length, 52)
  const sourceFiles = (await readdir(resolve(root, 'upstream/skills'), { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile())
    .map(entry => resolve(entry.parentPath, entry.name).slice(resolve(root, 'upstream/skills').length + 1))
  assert.equal(sourceFiles.filter(path => path.startsWith('poteto-mode/playbooks/') && path.endsWith('.md')).length, 23)
  for (const harness of ['antigravity', 'opencode']) {
    assert.deepEqual((await readdir(resolve(root, harness, 'skills'))).sort(), names)
    const adapter = await read(`${harness}/ADAPTER.md`)
    for (const name of names) {
      const text = await read(`${harness}/skills/${name}/SKILL.md`)
      const body = text.split('instructions below.\n\n')[1]
      assert.ok(body, `${harness}/${name}: missing adapter preface`)
      assert.equal(createHash('sha256').update(body).digest('hex'), hashes[name], `${harness}/${name}`)
      assert.match(text, new RegExp(`^---\nname: ${name}\ndescription: .+\n`))
      assert.equal(await read(`${harness}/skills/${name}/harness-adapter.md`), adapter)
    }
    for (const path of sourceFiles.filter(path => !path.endsWith('/SKILL.md'))) {
      assert.deepEqual(
        await readFile(resolve(root, harness, 'skills', path)),
        await readFile(resolve(root, 'upstream/skills', path)),
        `${harness}/${path}`,
      )
    }
    for (const excluded of ['setup-pstack', 'make-bot-ui']) assert.ok(!names.includes(excluded))
    assert.equal(await read(`${harness}/LICENSE`), await read('upstream/LICENSE'))
  }
})

test('Antigravity exposes native inherited-model agents with documented tool names', async () => {
  const manifest = JSON.parse(await read('antigravity/plugin.json'))
  assert.deepEqual(Object.keys(manifest).sort(), ['$schema', 'description', 'name'])
  assert.equal(manifest.name, 'pstack')
  assert.deepEqual((await readdir(resolve(root, 'antigravity/agents'))).sort(), Object.keys(roles).map(name => `${name}.md`).sort())
  for (const [name, role] of Object.entries(roles)) {
    const agent = await read(`antigravity/agents/${name}.md`)
    assert.match(agent, /^model: inherit$/m)
    assert.match(agent, /^mainAgent: false$/m)
    assert.match(agent, /^subagent: true$/m)
    assert.match(agent, /^commandExecutionPolicy: sandbox$/m)
    const tools = [...agent.matchAll(/^  - (.+)$/gm)].map(match => match[1])
    assert.deepEqual(tools, ['view_file', 'grep_search', 'run_command', ...(role.reportOnly ? [] : ['replace_file_content'])])
  }
})

test('Antigravity settings default to inherit, survive reinstall, and change only model fields', async () => {
  await mkdir(resolve(root, '.amp/in'), { recursive: true })
  const scratch = await mkdtemp(resolve(root, '.amp/in/antigravity-models-'))
  try {
    const target = resolve(scratch, 'installed-pstack')
    await cp(resolve(root, 'antigravity/agents'), resolve(target, 'agents'), { recursive: true })
    for (const file of ['plugin.json', 'configure-models.mjs', 'model-routing.defaults.json']) {
      await cp(resolve(root, 'antigravity', file), resolve(target, file))
    }
    const configRoot = resolve(scratch, 'user-config')
    const settings = resolve(configRoot, 'pstack-ports/antigravity-models.json')
    const run = (...extra) => spawnSync(process.execPath, [resolve(target, 'configure-models.mjs'), target, ...extra], {
      env: { ...process.env, XDG_CONFIG_HOME: configRoot }, encoding: 'utf8', timeout: 10000,
    })
    assert.equal(run().status, 0)
    const defaults = JSON.parse(await readFile(settings, 'utf8'))
    assert.deepEqual(defaults, Object.fromEntries(Object.keys(roles).map(name => [name, 'inherit'])))
    assert.deepEqual(JSON.parse(await read('antigravity/model-routing.defaults.json')), defaults)

    const originals = {}
    for (const name of Object.keys(roles)) {
      const path = resolve(target, 'agents', `${name}.md`)
      let text = await readFile(path, 'utf8')
      text += '\nCustom prompt remains.\nmodel: body-only\n'
      if (name === 'poteto-agent') text = text.replaceAll('\n', '\r\n')
      originals[name] = text
      await writeFile(path, text)
    }
    const custom = { 'poteto-agent': 'flash', 'pstack-reviewer': 'pro' }
    await writeFile(settings, JSON.stringify(custom))
    assert.equal(run().status, 0)
    for (const [name, before] of Object.entries(originals)) {
      const actual = await readFile(resolve(target, 'agents', `${name}.md`), 'utf8')
      assert.equal(actual, before.replace('model: inherit', `model: ${custom[name] ?? 'inherit'}`))
    }
    assert.match(run().stdout, /0 agent files changed/)
    await writeFile(settings, '{}')
    assert.equal(run().status, 0)
    assert.match(await readFile(resolve(target, 'agents/pstack-reviewer.md'), 'utf8'), /^model: inherit$/m)
    await writeFile(settings, JSON.stringify(custom))
    assert.equal(run().status, 0)

    const snapshot = await Promise.all(Object.keys(roles).map(name => readFile(resolve(target, 'agents', `${name}.md`), 'utf8')))
    for (const invalid of [null, [], { 'poteto-agent': 'gemini-model-id' }, { 'unknown-agent': 'pro' }, { 'pstack-reviewer': true }]) {
      await writeFile(settings, JSON.stringify(invalid))
      const result = run()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /JSON object|Unknown pstack agent|Invalid model tier/)
      assert.deepEqual(await Promise.all(Object.keys(roles).map(name => readFile(resolve(target, 'agents', `${name}.md`), 'utf8'))), snapshot)
    }
    await writeFile(settings, '{invalid JSON')
    assert.equal(run().status, 1)
    assert.deepEqual(await Promise.all(Object.keys(roles).map(name => readFile(resolve(target, 'agents', `${name}.md`), 'utf8'))), snapshot)

    const customPath = resolve(scratch, 'custom-settings.json')
    await writeFile(customPath, JSON.stringify({ 'poteto-agent': 'pro' }))
    const broken = resolve(target, 'agents/pstack-synthesizer.md')
    const before = await readFile(broken, 'utf8')
    await writeFile(broken, before.replace('model: inherit', 'missing-model: inherit'))
    const failed = run(customPath)
    assert.equal(failed.status, 1)
    assert.match(failed.stderr, /Expected one model field/)
    assert.equal(await readFile(resolve(target, 'agents/poteto-agent.md'), 'utf8'), snapshot[0])

    await cp(resolve(root, 'antigravity/agents'), resolve(target, 'agents'), { recursive: true })
    await writeFile(customPath, JSON.stringify(custom))
    assert.equal(run(customPath).status, 0)
    assert.match(await readFile(resolve(target, 'agents/poteto-agent.md'), 'utf8'), /^model: flash$/m)
    assert.match(await readFile(resolve(target, 'agents/pstack-reviewer.md'), 'utf8'), /^model: pro$/m)
    assert.equal(await readFile(customPath, 'utf8'), JSON.stringify(custom))
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
})

test('OpenCode registers inherited-model agents without replacing unrelated configuration', async () => {
  const { config: configure } = await PstackPlugin()
  const config = { skills: { paths: ['/existing'], urls: ['https://example.com/skills'] }, agent: { existing: { model: 'local/existing' } } }
  await configure(config)
  await configure(config)
  assert.deepEqual(config.skills, { paths: ['/existing', resolve(root, 'opencode/skills') + '/'], urls: ['https://example.com/skills'] })
  assert.deepEqual(config.agent.existing, { model: 'local/existing' })
  for (const [name, role] of Object.entries(roles)) {
    assert.equal(config.agent[name].mode, 'subagent')
    assert.equal(config.agent[name].model, undefined)
    assert.equal(config.agent[name].permission.edit, role.reportOnly ? 'deny' : undefined)
  }
})

test('OpenCode preserves user model, disable, prompt, and nested permission overrides', async () => {
  const { config: configure } = await PstackPlugin()
  const override = {
    model: 'local/reviewer-b',
    variant: 'high',
    prompt: 'User-owned instructions',
    disable: true,
    permission: { edit: { '*': 'deny', '*.md': 'ask' }, bash: { '*': 'deny', 'git diff*': 'allow' } },
  }
  const config = { agent: { 'pstack-reviewer': structuredClone(override), 'pstack-reviewer-alt': { permission: 'deny' } } }
  await configure(config)
  assert.deepEqual(config.agent['pstack-reviewer'], { description: roles['pstack-reviewer'].description, mode: 'subagent', ...override })
  assert.equal(config.agent['pstack-reviewer-alt'].permission, 'deny')
  assert.equal(config.agent['pstack-researcher'].permission.edit, 'deny')
})

const agyVersion = spawnSync('agy', ['--version'], { encoding: 'utf8' })
test('agy validates, installs, discovers, and accepts routing on an isolated native installation', {
  skip: agyVersion.status !== 0 ? 'Requires agy' : false,
}, async () => {
  await mkdir(resolve(root, '.amp/in'), { recursive: true })
  const home = await mkdtemp(resolve(root, '.amp/in/agy-test-'))
  try {
    const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: resolve(home, '.config') }
    const run = (...args) => {
      const result = spawnSync('agy', args, { cwd: home, env, encoding: 'utf8', timeout: 30000 })
      assert.equal(result.status, 0, `${args.join(' ')}: ${result.error ?? result.stderr}`)
      return result.stdout
    }
    const validation = JSON.parse(run('plugin', 'validate', resolve(root, 'antigravity'), '--strict', '--json'))
    assert.deepEqual(validation.findings, [])
    assert.equal(validation.components.skills, 52)
    assert.equal(validation.components.agents, 6)
    run('plugin', 'install', resolve(root, 'antigravity'))
    const installed = JSON.parse(run('plugin', 'list', '--json')).find(plugin => plugin.name === 'pstack')
    assert.equal(installed.enabled, true)
    assert.deepEqual(installed.skills.sort(), names)
    assert.deepEqual(installed.agents.sort(), Object.keys(roles).sort())
    assert.ok((await realpath(installed.path)).startsWith(home + '/'))

    const settings = resolve(home, '.config/pstack-ports/antigravity-models.json')
    await mkdir(resolve(home, '.config/pstack-ports'), { recursive: true })
    await writeFile(settings, JSON.stringify({ 'poteto-agent': 'flash', 'pstack-reviewer': 'pro' }))
    const apply = spawnSync(process.execPath, [resolve(installed.path, 'configure-models.mjs'), installed.path], {
      cwd: home, env, encoding: 'utf8', timeout: 10000,
    })
    assert.equal(apply.status, 0, apply.stderr)
    assert.match(await readFile(resolve(installed.path, 'agents/poteto-agent.md'), 'utf8'), /^model: flash$/m)
    assert.match(await readFile(resolve(installed.path, 'agents/pstack-reviewer.md'), 'utf8'), /^model: pro$/m)
    assert.deepEqual(JSON.parse(run('plugin', 'validate', installed.path, '--strict', '--json')).findings, [])
    for (const name of Object.keys(roles)) {
      assert.match(await read(`antigravity/agents/${name}.md`), /^model: inherit$/m)
    }
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})

const version = spawnSync('opencode', ['--version'], { encoding: 'utf8' })
test('OpenCode 1.14.30 discovers all bundled skills and custom agents through its real loader', {
  skip: version.status !== 0 || version.stdout.trim() !== '1.14.30' ? 'Requires opencode 1.14.30' : false,
}, async () => {
  await mkdir(resolve(root, '.amp/in'), { recursive: true })
  const scratch = await mkdtemp(resolve(root, '.amp/in/opencode-test-'))
  try {
    const env = {
      ...process.env,
      HOME: resolve(scratch, 'home'),
      XDG_CONFIG_HOME: resolve(scratch, 'config'),
      XDG_DATA_HOME: resolve(scratch, 'data'),
      XDG_STATE_HOME: resolve(scratch, 'state'),
      XDG_CACHE_HOME: resolve(scratch, 'cache'),
      OPENCODE_DISABLE_EXTERNAL_SKILLS: 'true',
      OPENCODE_CONFIG_DIR: resolve(scratch, 'config/opencode'),
      OPENCODE_CONFIG_CONTENT: JSON.stringify({ plugin: [pathToFileURL(resolve(root, 'opencode/index.js')).href] }),
    }
    await mkdir(env.HOME, { recursive: true })
    const run = async args => {
      const path = resolve(scratch, 'output.json')
      const output = await open(path, 'w')
      try {
        // This CLI exits before large piped stdout finishes flushing.
        const result = spawnSync('opencode', args, { cwd: scratch, env, encoding: 'utf8', timeout: 60000, stdio: ['ignore', output.fd, 'pipe'] })
        assert.equal(result.status, 0, `${args.join(' ')}: ${result.error ?? result.stderr}`)
      } finally {
        await output.close()
      }
      return readFile(path, 'utf8')
    }
    const skills = JSON.parse(await run(['debug', 'skill']))
    const bundled = skills.filter(skill => skill.location.startsWith(resolve(root, 'opencode/skills') + '/'))
    assert.deepEqual(bundled.map(skill => skill.name).sort(), names)
    assert.ok(bundled.every(skill => skill.content.includes('harness-adapter.md')))
    for (const [name, role] of Object.entries(roles)) {
      const agent = JSON.parse(await run(['debug', 'agent', name]))
      assert.equal(agent.name, name)
      assert.equal(agent.mode, 'subagent')
      assert.equal(agent.model, undefined)
      if (role.reportOnly) {
        assert.equal(agent.tools.edit, false)
        assert.equal(agent.tools.write, false)
      }
    }
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
})
