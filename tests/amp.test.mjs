import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import register, { listed, routes } from '../amp/index.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const plugin = resolve(root, 'amp')
const hashes = JSON.parse(await readFile(resolve(root, 'upstream-bodies.json'), 'utf8'))
const names = Object.keys(hashes).sort()

async function load() {
  const registered = []
  const handlers = {}
  const tools = {}
  const started = []
  await register({
    registerSkill: async skill => {
      registered.push(skill)
      return { unsubscribe() {} }
    },
    on: (name, handler) => {
      handlers[name] = handler
      return { unsubscribe() {} }
    },
    registerTool: tool => {
      tools[tool.name] = tool
      return { unsubscribe() {} }
    },
    createAgent: config => ({
      async createThread(options) {
        const run = { ...config, parent: options.parentThreadID }
        started.push(run)
        return {
          id: `T-child-${started.length}`,
          async appendUserMessage(message) {
            run.brief = message.content
          },
          async waitForResponse() {
            await null
            return { role: 'assistant', content: [{ type: 'text', text: `done: ${run.brief}` }] }
          },
          async cancel() {},
        }
      },
    }),
  })
  return { registered, handlers, tools, started }
}

const skillResult = (thread, name, output = { content: [{ type: 'text', text: 'BODY' }] }) => ({
  thread: { id: thread },
  toolUseID: 'toolu_1',
  tool: 'skill',
  input: { name },
  status: 'done',
  output,
})

test('Amp plugin ships every pinned skill unchanged, without the statechart tests', async () => {
  assert.deepEqual((await readdir(resolve(plugin, 'skills'))).sort(), names)
  for (const name of names) {
    const text = await readFile(resolve(plugin, 'skills', name, 'SKILL.md'), 'utf8')
    const body = text.slice(text.match(/^---\n[\s\S]*?\n---\n/)[0].length)
    assert.equal(createHash('sha256').update(body).digest('hex'), hashes[name], name)
  }
  const source = resolve(root, 'upstream/skills')
  const files = (await readdir(source, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile())
    .map(entry => resolve(entry.parentPath, entry.name).slice(source.length + 1))
  for (const path of files) {
    if (path.startsWith('statechart/scripts/test/')) continue
    assert.deepEqual(await readFile(resolve(plugin, 'skills', path)), await readFile(resolve(source, path)), path)
  }
  await assert.rejects(readdir(resolve(plugin, 'skills/statechart/scripts/test')))
  const total = (await readdir(plugin, { recursive: true, withFileTypes: true })).filter(entry => entry.isFile()).length
  assert.ok(total <= 500, `${total} files is past the hosted plugin limit`)
})

test('Amp plugin registers every skill and lists only the chosen ones', async () => {
  const { registered } = await load()
  assert.deepEqual(registered.map(skill => skill.path).sort(), names.map(name => `skills/${name}`))
  const shown = registered.filter(skill => skill.listed).map(skill => skill.path.slice('skills/'.length))
  assert.deepEqual(shown.sort(), [...listed].sort())
  assert.ok(!shown.some(name => name.startsWith('principle-')))
})

test('the first pstack skill in a thread brings the adapter, later ones a reminder', async () => {
  const { handlers } = await load()
  const adapter = await readFile(resolve(plugin, 'adapter.md'), 'utf8')
  const first = handlers['tool.result'](skillResult('T-1', 'pstack:poteto-mode'))
  assert.deepEqual(first.output.content, [{ type: 'text', text: 'BODY' }, { type: 'text', text: adapter }])
  const second = handlers['tool.result'](skillResult('T-1', 'pstack:arena', 'BODY'))
  assert.ok(second.output.startsWith('BODY\n\nBefore following this skill, read '))
  assert.ok(second.output.includes(resolve(plugin, 'adapter.md')))
  assert.equal(handlers['tool.result'](skillResult('T-2', 'pstack:arena')).output.content[1].text, adapter)
  assert.equal(handlers['tool.result'](skillResult('T-3', 'building-skills')), undefined)
  assert.equal(handlers['tool.result']({ ...skillResult('T-3', 'pstack:arena'), tool: 'Read' }), undefined)
})

test('a slash or qualified skill name in the user message asks the agent to load it', async () => {
  const { handlers } = await load()
  const start = message => handlers['agent.start']({ thread: { id: 'T-1' }, id: 'm1', message })
  assert.equal(
    start('Do it with /arena and pstack:principle-fix-root-causes, then (/ketchup).').message.content,
    'The user named pstack skills. Load `pstack:arena`, `pstack:principle-fix-root-causes`, `pstack:ketchup` with the skill tool before acting on them.',
  )
  assert.deepEqual(start('Read /usr/bin/env and src/how/why.ts, then run /setup-pstack.'), {})
})

test("pstack_agent starts a child thread on the role's model and returns its report", async () => {
  const { tools, started } = await load()
  const ctx = { thread: { id: 'T-parent' }, signal: new AbortController().signal }
  const report = await tools.pstack_agent.execute({ role: 'hardest', brief: 'Fix the bug.' }, ctx)
  assert.equal(started[0].model, 'anthropic/claude-fable-5-2')
  assert.equal(started[0].reasoningEffort, 'high')
  assert.equal(started[0].parent, 'T-parent')
  assert.equal(started[0].brief, 'Fix the bug.')
  assert.match(started[0].instructions, /load `pstack:poteto-mode`/)
  assert.ok(report.startsWith('pstack hardest thread T-child-1 (Claude Fable 5.2, high effort).'))
  assert.ok(report.endsWith('done: Fix the bug.'))
  const background = await tools.pstack_agent.execute({ role: 'judge', brief: 'Score A and B.', background: true }, ctx)
  assert.match(started[1].instructions, /You report only\./)
  assert.doesNotMatch(started[1].instructions, /pstack:poteto-mode/)
  assert.match(background, /T-child-2/)
  assert.match(background, /wait_for_threads/)
  assert.doesNotMatch(background, /done:/)
  await assert.rejects(tools.pstack_agent.execute({ role: 'default', brief: 'x' }, ctx), /Unknown role/)
})

test("routing follows the owner's rules, and the adapter table matches it", async () => {
  const adapter = await readFile(resolve(plugin, 'adapter.md'), 'utf8')
  for (const [role, route] of Object.entries(routes)) {
    assert.ok(route.model.startsWith('anthropic/claude-'), role)
    assert.ok(['low', 'medium', 'high'].includes(route.effort), role)
    assert.ok(adapter.includes(`\`${role}\``), `adapter.md lacks ${role}`)
  }
  assert.deepEqual([routes.code.model, routes.code.effort], ['anthropic/claude-opus-5-5', 'high'])
  assert.deepEqual([routes.judgment.model, routes.judgment.effort], ['anthropic/claude-opus-5-5', 'medium'])
  assert.equal(routes['panel-opus'].effort, 'medium')
  for (const role of ['mechanical', 'swarm-worker', 'history-search', 'comment-sicko']) {
    assert.doesNotMatch(routes[role].model, /opus/, role)
  }
})

test('the worktree audit never calls a worktree safe to delete', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pstack-audit-'))
  const git = (...args) => assert.equal(spawnSync('git', args, { cwd: dir }).status, 0)
  try {
    const repo = join(dir, 'repo')
    const worktree = join(dir, 'worker')
    git('init', '-b', 'main', repo)
    git('-C', repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'fixture')
    git('-C', repo, 'worktree', 'add', '-b', 'worker', worktree)
    const result = spawnSync('bash', [resolve(plugin, 'skills/poteto-mode/scripts/worktree-audit.sh'), '-b', 'main', repo], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.ok(result.stdout.includes(`\tunknown\treview\t${await realpath(worktree)}`))
    assert.ok(!result.stdout.includes('\tsafe\t'))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('poteto-mode helper scripts refuse to install into the plugin', {
  skip: spawnSync('bun', ['--version']).status !== 0 && 'Requires bun',
}, () => {
  const bootstrap = resolve(plugin, 'skills/poteto-mode/scripts/bootstrap.ts')
  const result = spawnSync('bun', ['-e', `import { ensureDependenciesInstalled } from ${JSON.stringify(bootstrap)}; ensureDependenciesInstalled()`], { encoding: 'utf8' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Do not install into Amp's plugin cache/)
})
