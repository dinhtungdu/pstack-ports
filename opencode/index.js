import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODEL = /^([^/\s#]+)\/([^/#\s]+)(?:#([^#\s]+))?$/

const settingsPath = () => resolve(
  process.env.XDG_CONFIG_HOME || resolve(homedir(), '.config'),
  'pstack-ports/opencode-models.json',
)

function parseModel(agent, value) {
  if (value === 'inherit') return undefined
  const match = typeof value === 'string' ? MODEL.exec(value) : undefined
  if (!match) throw new Error(`Invalid model for ${agent}: ${JSON.stringify(value)}. Use "inherit" or provider/model#variant.`)
  const [, providerID, id, variant] = match
  return { providerID, id, ...(variant === undefined ? {} : { variant }) }
}

async function loadRouting(agentIDs) {
  const path = settingsPath()
  let text
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return {}
    throw error
  }
  let settings
  try {
    settings = JSON.parse(text)
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${error.message}`)
  }
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error(`${path} must be a JSON object mapping agent names to "inherit" or provider/model#variant`)
  }
  const routing = {}
  for (const [id, value] of Object.entries(settings)) {
    if (!agentIDs.has(id)) throw new Error(`Unknown pstack agent in ${path}: ${id}`)
    const model = parseModel(id, value)
    if (model) routing[id] = model
  }
  return routing
}

export default {
  id: 'pstack',
  async setup(ctx) {
    const agents = JSON.parse(await readFile(new URL('./agents.json', import.meta.url), 'utf8'))
    const manifest = JSON.parse(await readFile(new URL('./skills.json', import.meta.url), 'utf8'))
    const routing = await loadRouting(new Set(Object.keys(agents)))
    const skills = await Promise.all(Object.entries(manifest).map(async ([id, description]) => {
      const url = new URL(`./skills/${id}/SKILL.md`, import.meta.url)
      const text = await readFile(url, 'utf8')
      return { id, name: id, description, path: fileURLToPath(url), content: text.replace(/^---\n[\s\S]*?\n---\n/, '') }
    }))
    await ctx.skill.transform(editor => {
      for (const skill of skills) editor.add(skill)
    })
    await ctx.agent.transform(editor => {
      for (const [id, defaults] of Object.entries(agents)) {
        editor.update(id, agent => {
          agent.description = defaults.description
          agent.mode = defaults.mode
          agent.system = defaults.system
          agent.permissions.push(...(defaults.permissions ?? []))
          if (routing[id]) agent.model = routing[id]
        })
      }
    })
  },
}
