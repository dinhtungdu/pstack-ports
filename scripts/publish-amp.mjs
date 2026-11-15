// Copies the built Amp plugin into a clone of an Amp plugins repository as pstack/.
// Usage: node scripts/publish-amp.mjs <plugins repository clone>
// Clone it with `amp clone user-plugins`. Review, commit, and push there yourself.
import { cp, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../amp', import.meta.url))
const clone = process.argv[2] && resolve(process.argv[2])
if (!clone || !existsSync(resolve(clone, '.git'))) throw new Error('Pass the path to a clone of an Amp plugins repository.')

// The directory name sets the pstack:<name> skill namespace.
const dest = resolve(clone, 'pstack')
await rm(dest, { recursive: true, force: true })
await cp(source, dest, { recursive: true, filter: path => !['node_modules', '.DS_Store'].includes(basename(path)) })
const files = (await readdir(dest, { recursive: true, withFileTypes: true })).filter(entry => entry.isFile()).length
console.log(`Copied the Amp plugin to ${dest} (${files} files). Review, commit, and push there.`)
