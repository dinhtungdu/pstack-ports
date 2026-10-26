import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir, realpath, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import upstreamBodies from '../upstream-bodies.json'

test('builds self-contained text-only skill directories for a skills repository', async () => {
	const names = (await readdir('pstack/skills')).sort()
	expect(names).toEqual(Object.keys(upstreamBodies).sort())
	expect((await readdir('pstack')).sort()).toEqual(['.gitignore', 'AMP.md', 'README.md', 'skills'])
	const adapter = await readFile('pstack/AMP.md', 'utf8')
	const license = await readFile('upstream/LICENSE', 'utf8')
	for (const name of names) {
		const base = `pstack/skills/${name}`
		const text = await readFile(`${base}/SKILL.md`, 'utf8')
		expect(text).toContain(`name: ${name}\n`)
		expect(text).toContain('[amp-adapter.md](amp-adapter.md)')
		expect(await readFile(`${base}/amp-adapter.md`, 'utf8')).toBe(adapter)
		expect(await readFile(`${base}/LICENSE`, 'utf8')).toBe(license)
		for (const file of await readdir(base, { recursive: true })) {
			const path = join(base, file)
			if ((await stat(path)).isFile()) expect([path, (await readFile(path)).includes(0)]).toEqual([path, false])
		}
	}
	const help = await readFile('pstack/skills/poteto-help/SKILL.md', 'utf8')
	const guides = [...help.matchAll(/\(\.\.\/\.\.\/docs\/guide\/([^)#]+)/g)].map(match => match[1])
	expect(guides.length).toBeGreaterThan(0)
	for (const guide of guides) expect(existsSync(`pstack/skills/poteto-help/docs/guide/${guide}`)).toBe(true)
	expect(await readFile('pstack/skills/no-comments/comment-sicko.md', 'utf8')).toContain('Comment Sicko')
})

test('preserves every shipped skill body verbatim from upstream', async () => {
	expect(Object.keys(upstreamBodies)).toHaveLength(56)
	for (const [name, hash] of Object.entries(upstreamBodies)) {
		const text = await readFile(`pstack/skills/${name}/SKILL.md`, 'utf8')
		const marker = 'Load sibling skills by bare name.\n\n'
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
