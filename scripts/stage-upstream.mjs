// Stages pstack from an upstream cursor/plugins commit for `node scripts/build.mjs <out>/pstack`.
// Usage: node scripts/stage-upstream.mjs <cursor/plugins checkout> <commit> <empty scratch dir>
// It drops Cursor-only parts, applies the safety patches, keeps each skill's local
// frontmatter with upstream's new description, and rewrites upstream-bodies.json.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const [source, commit, out] = process.argv.slice(2)
if (!source || !commit || !out) throw new Error('Usage: node scripts/stage-upstream.mjs <cursor/plugins checkout> <commit> <empty scratch dir>')
if (existsSync(out) && readdirSync(out).length) throw new Error(`${out} must be empty.`)

mkdirSync(out, { recursive: true })
const archive = join(out, 'pstack.tar')
execFileSync('git', ['-C', source, 'archive', '-o', archive, commit, 'pstack'])
execFileSync('tar', ['-x', '-f', archive, '-C', out])
rmSync(archive)
const upstream = join(out, 'pstack')

// Cursor-only parts with no equivalent in any port.
for (const path of ['skills/setup-pstack', 'skills/make-bot-ui', 'docs/harness', 'automations', '.cursor-plugin']) {
  rmSync(join(upstream, path), { recursive: true, force: true })
}
const patches = resolve(root, 'scripts/patches')
for (const patch of readdirSync(patches).sort()) {
  execFileSync('git', ['apply', '-p1', join(patches, patch)], { cwd: upstream, stdio: 'inherit' })
}
cpSync(join(upstream, 'agents/comment-sicko.md'), join(upstream, 'skills/no-comments/comment-sicko.md'))

const split = text => {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) throw new Error('Missing skill frontmatter')
  return { header: match[1], body: text.slice(match[0].length) }
}
const hashesPath = resolve(root, 'upstream-bodies.json')
const hashes = JSON.parse(readFileSync(hashesPath, 'utf8'))
const skills = readdirSync(join(upstream, 'skills')).sort()
const added = skills.filter(name => !(name in hashes))
const removed = Object.keys(hashes).filter(name => !skills.includes(name))
if (added.length || removed.length) {
  throw new Error(`Upstream skills changed. Added: ${added.join(', ') || 'none'}. Removed: ${removed.join(', ') || 'none'}. Review them, then update upstream-bodies.json and the counts by hand.`)
}
const changed = []
for (const name of skills) {
  const file = join(upstream, 'skills', name, 'SKILL.md')
  const fresh = split(readFileSync(file, 'utf8'))
  const local = split(readFileSync(resolve(root, 'upstream/skills', name, 'SKILL.md'), 'utf8'))
  const description = fresh.header.match(/^description: .*$/m)?.[0]
  if (!description || !/^description: /m.test(local.header)) throw new Error(`${name}: description must be one line`)
  writeFileSync(file, `---\n${local.header.replace(/^description: .*$/m, () => description)}\n---\n${fresh.body}`)
  const hash = createHash('sha256').update(fresh.body).digest('hex')
  if (hash !== hashes[name]) changed.push(name)
  hashes[name] = hash
}
writeFileSync(hashesPath, `${JSON.stringify(hashes, null, 2)}\n`)
const version = JSON.parse(readFileSync(join(upstream, 'plugin.json'), 'utf8')).version
console.log(`Staged pstack ${version} in ${upstream}. Changed bodies: ${changed.join(', ') || 'none'}.`)
console.log(`Next: node scripts/build.mjs ${upstream}`)
