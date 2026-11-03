import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'

const modelPattern = /^([^/\s#]+)\/([^/#\s]+)(?:#([^#\s]+))?$/

const agents = JSON.parse(await readFile(new URL('./agents.json', import.meta.url), 'utf8'))
const defaults = JSON.parse(await readFile(new URL('./model-routing.defaults.json', import.meta.url), 'utf8'))
const names = Object.keys(agents).sort()

const usage = [
  'Usage: node configure-models.mjs [settings-file] [--set agent=model]...',
  '',
  'Models are "inherit" (use the parent conversation model, the default) or',
  'provider/model, optionally with a variant: provider/model#variant.',
  'Without a settings file the installer path is used.',
  '',
  'Agents:',
  ...names.map(name => `  ${name}`),
].join('\n')

function settingsPath(argument) {
  return resolve(argument ?? resolve(
    process.env.XDG_CONFIG_HOME || resolve(homedir(), '.config'),
    'pstack-ports/opencode-models.json',
  ))
}

function validate(settings, path) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error(`${path} must be a JSON object mapping agent names to "inherit" or provider/model#variant`)
  }
  for (const [name, value] of Object.entries(settings)) {
    if (!Object.hasOwn(defaults, name)) throw new Error(`Unknown pstack agent in ${path}: ${name}`)
    if (value === 'inherit') continue
    if (typeof value !== 'string' || !modelPattern.test(value)) {
      throw new Error(`Invalid model for ${name} in ${path}: ${JSON.stringify(value)}. Use "inherit" or provider/model#variant.`)
    }
  }
  return settings
}

function parseArguments(argv) {
  const sets = {}
  let path
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--set') {
      index += 1
      const value = argv[index]
      if (value === undefined) throw new Error('--set requires agent=model')
      const separator = value.indexOf('=')
      if (separator < 1) throw new Error(`--set requires agent=model: ${value}`)
      sets[value.slice(0, separator)] = value.slice(separator + 1)
    } else if (argument.startsWith('--')) {
      throw new Error(`Unknown option: ${argument}`)
    } else {
      if (path !== undefined) throw new Error('Expected at most one settings-file argument')
      path = argument
    }
  }
  return { path, sets }
}

try {
  if (process.argv.includes('--help')) {
    console.log(usage)
  } else {
    const { path: argument, sets } = parseArguments(process.argv.slice(2))
    const path = settingsPath(argument)
    let settings
    let create = false
    let text
    try {
      text = await readFile(path, 'utf8')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      text = undefined
    }
    if (text === undefined) {
      settings = { ...defaults }
      create = true
    } else {
      try {
        settings = JSON.parse(text)
      } catch (error) {
        throw new Error(`Invalid JSON in ${path}: ${error.message}`)
      }
    }
    const merged = { ...settings, ...sets }
    // Validate the complete result before touching the filesystem.
    validate(merged, path)
    const ordered = Object.fromEntries(Object.keys(defaults).map(name => [name, merged[name] ?? 'inherit']))
    if (create || (sets && Object.keys(sets).length > 0)) {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, `${JSON.stringify(ordered, null, 2)}\n`)
    }
    const inherited = Object.values(ordered).filter(model => model === 'inherit').length
    console.log(`${create ? 'Created' : 'Loaded'} settings: ${path}`)
    for (const name of Object.keys(defaults)) {
      const model = ordered[name]
      if (model !== 'inherit') console.log(`  ${name}: ${model}`)
    }
    console.log(`${Object.keys(defaults).length - inherited} routed, ${inherited} inheriting the parent model. Start a new OpenCode conversation.`)
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
