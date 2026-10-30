import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import PstackPlugin from '../opencode/index.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = path => readFile(resolve(root, path), 'utf8')
const hashes = JSON.parse(await read('upstream-bodies.json'))
const names = Object.keys(hashes).sort()
const roles = JSON.parse(await read('agents.json'))

test('both bundles preserve all 56 pinned bodies, adapters, and complete skill resources', async () => {
  assert.equal(names.length, 56)
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

test('statechart refuses dependency installation by default in every bundle', async () => {
  await mkdir(resolve(root, '.amp/in'), { recursive: true })
  const scratch = await mkdtemp(resolve(root, '.amp/in/statechart-install-'))
  try {
    const bin = resolve(scratch, 'bin')
    const log = resolve(scratch, 'commands.log')
    const cache = resolve(scratch, 'cache')
    await mkdir(bin)
    await writeFile(resolve(bin, 'mise'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$COMMAND_LOG"\nprintf "not installed\\n" >&2\nexit 1\n', { mode: 0o755 })
    await writeFile(resolve(scratch, 'Flow.tla'), '---- MODULE Flow ----\nVARIABLE x\nInit == x = 0\nNext == x\' = 1 - x\n====\n')
    await writeFile(resolve(scratch, 'Flow.cfg'), 'INIT Init\nNEXT Next\n')
    const env = { ...process.env, PATH: `${bin}:${dirname(process.execPath)}:/usr/bin:/bin`, COMMAND_LOG: log, XDG_CACHE_HOME: cache, TLA2TOOLS: '', JAVA: '', PSTACK_ALLOW_INSTALL: '' }
    for (const harness of ['antigravity', 'opencode']) {
      const result = spawnSync(resolve(root, harness, 'skills/statechart/scripts/statechart'), ['Flow.tla', '--out', `chart-${harness}`], {
        cwd: scratch, env, encoding: 'utf8', timeout: 10000,
      })
      assert.equal(result.status, 2, result.error?.message ?? result.stderr)
      assert.match(result.stderr, /automatic dependency installation is disabled/)
    }
    assert.match(await readFile(log, 'utf8'), /^where\b/m)
    assert.doesNotMatch(await readFile(log, 'utf8'), /^install\b/m)
    assert.deepEqual((await readdir(scratch)).filter(name => name.startsWith('chart-') || name === 'cache'), [])
  } finally {
    await rm(scratch, { recursive: true, force: true })
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

test('OpenCode V2 registers complete skills and inherited-model subagents', async () => {
  const skills = new Map()
  const agents = new Map()
  assert.equal(PstackPlugin.id, 'pstack')
  await PstackPlugin.setup({
    skill: { transform: async transform => transform({ add: skill => skills.set(skill.id, skill) }) },
    agent: { transform: async transform => transform({ update: (id, update) => {
      const agent = { permissions: [] }
      update(agent)
      agents.set(id, agent)
    } }) },
  })
  assert.deepEqual([...skills.keys()].sort(), names)
  for (const [id, skill] of skills) {
    assert.equal(skill.path, resolve(root, 'opencode/skills', id, 'SKILL.md'))
    const text = await read(`opencode/skills/${id}/SKILL.md`)
    assert.equal(skill.content, text.slice(text.indexOf('\n---\n') + 5))
    assert.ok(skill.description.length > 0)
  }
  assert.match(skills.get('how').description, /^Use for "how does X work"/)
  assert.equal(agents.size, 6)
  for (const [name, role] of Object.entries(roles)) {
    const agent = agents.get(name)
    assert.equal(agent.mode, 'subagent')
    assert.equal(agent.model, undefined)
    assert.ok(agent.system.includes(role.prompt))
    assert.deepEqual(agent.permissions, role.reportOnly ? [{ action: 'edit', resource: '*', effect: 'deny' }] : [])
  }
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
    assert.equal(validation.components.skills, names.length)
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

const opencode = process.env.OPENCODE_V2_BIN ?? 'opencode2'
const version = spawnSync(opencode, ['--version'], { encoding: 'utf8', timeout: 10000 })
test('OpenCode V2 discovers the bundle and applies native user overrides through its real loader', {
  skip: !process.env.OPENCODE_V2_BIN && version.error?.code === 'ENOENT' ? 'Requires opencode2 or OPENCODE_V2_BIN' : false,
}, async () => {
  assert.equal(version.status, 0, version.error?.message ?? version.stderr)
  assert.match(version.stdout, /\b(?:v)?2\./)
  await mkdir(resolve(root, '.amp/in'), { recursive: true })
  const scratch = await mkdtemp(resolve(root, '.amp/in/opencode-test-'))
  let server
  try {
    const env = {
      ...process.env,
      HOME: resolve(scratch, 'home'),
      OPENCODE_TEST_HOME: resolve(scratch, 'home'),
      XDG_CONFIG_HOME: resolve(scratch, 'config'),
      XDG_DATA_HOME: resolve(scratch, 'data'),
      XDG_STATE_HOME: resolve(scratch, 'state'),
      XDG_CACHE_HOME: resolve(scratch, 'cache'),
      OPENCODE_DISABLE_PROJECT_CONFIG: 'true',
      OPENCODE_DISABLE_MODELS_FETCH: 'true',
      OPENCODE_CONFIG_DIR: resolve(scratch, 'config/opencode'),
      OPENCODE_CONFIG_CONTENT: '{}',
      OPENCODE_SERVER_PASSWORD: 'pstack-isolated-test',
    }
    await mkdir(env.HOME, { recursive: true })
    await mkdir(env.OPENCODE_CONFIG_DIR, { recursive: true })
    const configPath = resolve(env.OPENCODE_CONFIG_DIR, 'opencode.json')
    const config = { plugins: [resolve(root, 'opencode')] }
    await writeFile(configPath, JSON.stringify(config))
    server = spawn(opencode, ['serve', '--hostname', '127.0.0.1', '--port', '0'], { cwd: scratch, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let logs = ''
    server.stdout.on('data', data => { logs += data })
    server.stderr.on('data', data => { logs += data })
    const waitFor = async read => {
      const deadline = Date.now() + 30000
      while (Date.now() < deadline) {
        assert.equal(server.exitCode, null, logs)
        const value = await read()
        if (value) return value
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      assert.fail(`Timed out waiting for V2 loader: ${logs}`)
    }
    const url = await waitFor(() => logs.match(/server listening on (http:\/\/\S+)/)?.[1])
    const request = async (resource, method = 'GET') => {
      const query = new URLSearchParams({ 'location[directory]': scratch })
      const response = await fetch(`${url}/api/${resource}?${query}`, {
        method,
        headers: { Authorization: `Basic ${Buffer.from(`opencode:${env.OPENCODE_SERVER_PASSWORD}`).toString('base64')}` },
        signal: AbortSignal.timeout(30000),
      })
      assert.equal(response.ok, true, await response.clone().text())
      return response.status === 204 ? undefined : (await response.json()).data
    }
    const ready = () => waitFor(async () => {
      const plugins = await request('plugin')
      for (const id of ['pstack', 'opencode.config.agent', 'opencode.config.skill']) {
        const plugin = plugins.find(plugin => plugin.id === id)
        assert.notEqual(plugin?.state.status, 'error', JSON.stringify(plugin))
        if (plugin?.state.status !== 'active') return false
      }
      return true
    })
    await ready()
    const bundled = (await request('skill')).filter(skill => skill.path.startsWith(resolve(root, 'opencode/skills') + '/'))
    assert.deepEqual(bundled.map(skill => skill.name).sort(), names)
    assert.ok(bundled.every(skill => skill.content.includes('harness-adapter.md')))
    const agents = await request('agent')
    for (const [name, role] of Object.entries(roles)) {
      const agent = agents.find(agent => agent.id === name)
      assert.ok(agent, name)
      assert.equal(agent.mode, 'subagent')
      assert.equal(agent.model, undefined)
      assert.ok(agent.system.includes(role.prompt))
      assert.deepEqual(agent.permissions.filter(rule => rule.action === 'edit'), role.reportOnly ? [{ action: 'edit', resource: '*', effect: 'deny' }] : [])
    }

    const permissions = [{ action: 'edit', resource: '*.md', effect: 'ask' }, { action: 'shell', resource: '*', effect: 'deny' }]
    config.agents = {
      existing: { model: 'local/existing' },
      'pstack-reviewer': { model: 'local/reviewer-b#high', system: 'User-owned instructions', permissions },
      'pstack-reviewer-alt': { disabled: true },
    }
    await writeFile(configPath, JSON.stringify(config))
    await request('location/reload', 'POST')
    await ready()
    const overridden = await request('agent')
    const reviewer = overridden.find(agent => agent.id === 'pstack-reviewer')
    assert.deepEqual(reviewer.model, { providerID: 'local', id: 'reviewer-b', variant: 'high' })
    assert.equal(reviewer.system, 'User-owned instructions')
    assert.deepEqual(reviewer.permissions.filter(rule => ['edit', 'shell'].includes(rule.action)), [{ action: 'edit', resource: '*', effect: 'deny' }, ...permissions])
    assert.ok(!overridden.some(agent => agent.id === 'pstack-reviewer-alt'))
    assert.deepEqual(overridden.find(agent => agent.id === 'existing').model, { providerID: 'local', id: 'existing' })
  } finally {
    if (server && server.exitCode === null && server.signalCode === null) {
      const exited = new Promise(resolve => server.once('exit', resolve))
      server.kill('SIGTERM')
      await exited
    }
    await rm(scratch, { recursive: true, force: true })
  }
})
