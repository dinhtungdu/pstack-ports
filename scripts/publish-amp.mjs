import { cp, readdir, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Copies the built Amp skills into a clone of the personal skills repository.
// Review, commit, and push in that clone. Skills retired upstream must be removed there by hand.
const source = fileURLToPath(new URL('../pstack/skills/', import.meta.url))
const dest = resolve(process.argv[2] ?? join(homedir(), '.cache/amp/repositories/ampcode.com-user-skills'))
await stat(join(dest, '.git')).catch(() => { throw new Error(`Not a skills repository clone: ${dest}`) })
const names = await readdir(source)
for (const name of names) {
  await rm(join(dest, name), { recursive: true, force: true })
  await cp(join(source, name), join(dest, name), {
    recursive: true,
    filter: path => !['node_modules', '.DS_Store'].includes(path.split('/').at(-1)),
  })
}
console.log(`Copied ${names.length} skills to ${dest}`)
