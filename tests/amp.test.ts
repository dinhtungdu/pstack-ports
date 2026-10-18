import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import register from '../pstack/index'
import upstreamBodies from '../upstream-bodies.json'

test('registers the complete skill catalog with portable adapter resources', async () => {
	const paths: string[] = []
	await register({ registerSkill: async ({ path }) => {
		paths.push(path)
		return { unsubscribe() {} }
	}, on: () => ({ unsubscribe() {} }) })
	const names = (await readdir('pstack/skills')).sort()
	expect(paths.sort()).toEqual(names.map(name => `skills/${name}`))
	expect(names).toEqual(Object.keys(upstreamBodies).sort())
	expect(existsSync('pstack/automations')).toBe(false)
	expect(existsSync('pstack/.cursor-plugin')).toBe(false)
	expect(existsSync('pstack/docs/harness')).toBe(false)
	const adapter = await readFile('pstack/AMP.md', 'utf8')
	for (const name of names) {
		const base = `pstack/skills/${name}`
		const text = await readFile(`${base}/SKILL.md`, 'utf8')
		expect(text).toContain(`name: ${name}\n`)
		expect(text).toContain('[amp-adapter.md](amp-adapter.md)')
		expect(await readFile(`${base}/amp-adapter.md`, 'utf8')).toBe(adapter)
	}
	expect(await readFile('pstack/skills/no-comments/comment-sicko.md', 'utf8')).toContain('Comment Sicko')
})

test('auto-loads only allowed repositories without runner settings or palette commands', async () => {
	const root = await mkdtemp(join(tmpdir(), 'pstack workspace '))
	const repo = join(root, 'repo')
	const git = (...args: string[]) => {
		expect(Bun.spawnSync(['git', ...args], { cwd: root }).exitCode).toBe(0)
	}
	let workspace: string | null = repo
	let start: () => unknown = () => { throw new Error('missing start handler') }
	const ctx = {
		system: { get workspaceRoot() {
			const path = workspace
			return path ? { toString: () => pathToFileURL(path).href } : null
		} },
		$: async (strings: TemplateStringsArray, ...values: unknown[]) => {
			const result = await Bun.$(strings, ...values).cwd(root).quiet().nothrow()
			return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() }
		},
	}
	try {
		git('init', '-b', 'main', repo)
		await register({
			registerSkill: async () => ({ unsubscribe() {} }),
			on: (_event, handler) => {
				start = () => Reflect.apply(handler, undefined, [{}, ctx])
				return { unsubscribe() {} }
			},
		})
		expect(await start()).toBeUndefined()
		git('-C', repo, 'remote', 'add', 'origin', 'https://github.com/woocommerce/woocommerce.git')
		for (const remote of ['https://github.com/woocommerce/woocommerce.git', 'git@github.com:WordPress/gutenberg.git', 'ssh://git@github.com/dinhtungdu/woocommerce', 'https://github.com/dinhtungdu/gutenberg']) {
			git('-C', repo, 'remote', 'set-url', 'origin', remote)
			expect(await start()).toEqual({ message: { content: expect.stringContaining('load pstack:poteto-mode') } })
		}
		for (const remote of ['https://github.com/other/woocommerce', 'https://github.com/woocommerce/woocommerce-product-filters', 'https://github.com/woocommerce/woocommerce-bulk-stock-management', 'https://github.com.evil.test/WordPress/gutenberg', 'https://github.com/dinhtungdu/factory']) {
			git('-C', repo, 'remote', 'set-url', 'origin', remote)
			expect(await start()).toBeUndefined()
		}
		git('-C', repo, 'remote', 'add', 'upstream', 'git@github.com:WordPress/gutenberg.git')
		expect(await start()).toBeDefined()
		git('-C', repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'fixture')
		workspace = join(root, 'linked worktree')
		git('-C', repo, 'worktree', 'add', '-b', 'worker', workspace)
		expect(await start()).toBeDefined()
		expect(existsSync(join(workspace, '.amp'))).toBe(false)
		workspace = null
		expect(await start()).toBeUndefined()
		workspace = root
		expect(await start()).toBeUndefined()
	} finally {
		await rm(root, { recursive: true, force: true })
	}
})

test('preserves every shipped skill body verbatim from upstream', async () => {
	expect(Object.keys(upstreamBodies)).toHaveLength(52)
	for (const [name, hash] of Object.entries(upstreamBodies)) {
		const text = await readFile(`pstack/skills/${name}/SKILL.md`, 'utf8')
		const marker = 'Load bundled skills as `pstack:<name>`.\n\n'
		const index = text.indexOf(marker)
		expect(index).toBeGreaterThan(-1)
		const body = text.slice(index + marker.length)
		expect(createHash('sha256').update(body).digest('hex')).toBe(hash)
	}
})

test('a clean merged worktree still requires review when Amp activity is unknown', async () => {
	const dir = await mkdtemp(join(tmpdir(), 'pstack-audit-'))
	const repo = join(dir, 'repo')
	const worktree = join(dir, 'worker')
	function git(...args: string[]) {
		const result = Bun.spawnSync(['git', ...args], { cwd: dir })
		expect(result.exitCode).toBe(0)
	}
	try {
		git('init', '-b', 'main', repo)
		git('-C', repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'fixture')
		git('-C', repo, 'worktree', 'add', '-b', 'worker', worktree)
		const result = Bun.spawnSync(['bash', join(import.meta.dir, '../pstack/skills/poteto-mode/scripts/worktree-audit.sh'), '-b', 'main', repo])
		expect(result.exitCode).toBe(0)
		expect(result.stdout.toString()).toContain(`\tunknown\treview\t${await realpath(worktree)}`)
		expect(result.stdout.toString()).not.toContain('\tsafe\t')
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})
