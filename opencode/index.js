import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const PstackPlugin = async () => {
  const agents = JSON.parse(await readFile(new URL('./agents.json', import.meta.url), 'utf8'))
  const skills = fileURLToPath(new URL('./skills/', import.meta.url))
  return {
    config: async config => {
      config.skills ??= {}
      config.skills.paths = [...new Set([...(config.skills.paths ?? []), skills])]
      config.agent ??= {}
      for (const [name, defaults] of Object.entries(agents)) {
        const user = config.agent[name]
        config.agent[name] = {
          ...defaults,
          ...user,
          permission: typeof user?.permission === 'string'
            ? user.permission
            : { ...defaults.permission, ...user?.permission },
        }
      }
    },
  }
}
