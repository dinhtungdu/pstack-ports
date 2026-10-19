import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export default {
  id: 'pstack',
  async setup(ctx) {
    const agents = JSON.parse(await readFile(new URL('./agents.json', import.meta.url), 'utf8'))
    const manifest = JSON.parse(await readFile(new URL('./skills.json', import.meta.url), 'utf8'))
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
        })
      }
    })
  },
}
