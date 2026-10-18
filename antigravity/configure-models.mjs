import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'

const usage = 'Usage: node configure-models.mjs <installed-pstack-directory> [settings-file]'
try {
  if (process.argv[2] === '--help') {
    console.log(usage)
  } else {
    if (!process.argv[2] || process.argv.length > 4) throw new Error(usage)
    const target = resolve(process.argv[2])
    const settingsPath = resolve(process.argv[3] ?? resolve(
      process.env.XDG_CONFIG_HOME || resolve(homedir(), '.config'),
      'pstack-ports/antigravity-models.json',
    ))
    const defaults = JSON.parse(await readFile(new URL('./model-routing.defaults.json', import.meta.url), 'utf8'))
    const manifest = JSON.parse(await readFile(resolve(target, 'plugin.json'), 'utf8'))
    if (manifest.name !== 'pstack') throw new Error('Target is not the pstack plugin')
    let settings
    let create = false
    try {
      settings = JSON.parse(await readFile(settingsPath, 'utf8'))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      settings = defaults
      create = true
    }
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new Error('Model settings must be a JSON object mapping agent names to tiers')
    }
    for (const [name, tier] of Object.entries(settings)) {
      if (!Object.hasOwn(defaults, name)) throw new Error(`Unknown pstack agent: ${name}`)
      if (!['inherit', 'flash', 'pro'].includes(tier)) throw new Error(`Invalid model tier for ${name}: ${tier}`)
    }
    const updates = []
    for (const [name, fallback] of Object.entries(defaults)) {
      const path = resolve(target, 'agents', `${name}.md`)
      const before = await readFile(path, 'utf8')
      const frontmatter = before.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0]
      if (!frontmatter || [...frontmatter.matchAll(/^model:[^\r\n]*/gm)].length !== 1) {
        throw new Error(`Expected one model field in ${path}`)
      }
      const tier = Object.hasOwn(settings, name) ? settings[name] : fallback
      const after = frontmatter.replace(/^model:[^\r\n]*/m, `model: ${tier}`) + before.slice(frontmatter.length)
      if (before !== after) updates.push({ path, after })
    }
    // Preflight every agent before creating settings or changing installed files.
    if (create) {
      await mkdir(dirname(settingsPath), { recursive: true })
      await writeFile(settingsPath, `${JSON.stringify(defaults, null, 2)}\n`, { flag: 'wx' })
    }
    for (const { path, after } of updates) await writeFile(path, after)
    console.log(`${create ? 'Created' : 'Loaded'} settings: ${settingsPath}`)
    console.log(`Applied model routing; ${updates.length} agent files changed. Start a new Antigravity conversation.`)
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
