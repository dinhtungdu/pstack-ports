import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const hashes = JSON.parse(await readFile(resolve(root, 'upstream-bodies.json'), 'utf8'))
const names = Object.keys(hashes).sort()
const ampPreface = '**Amp port.** Read [amp-adapter.md](amp-adapter.md) before following this skill. It replaces Cursor tool, model, history, scheduling, and authorization instructions below. Load bundled skills as `pstack:<name>`.\n\n'

function splitSkill(text) {
  const header = text.match(/^---\n([\s\S]*?)\n---\n/)
  if (!header) throw new Error('Missing skill frontmatter')
  return { header: header[1], body: text.slice(header[0].length) }
}

if (process.argv[2]) {
  const source = resolve(process.argv[2])
  if (source === resolve(root, 'upstream')) throw new Error('Import source must differ from upstream/')
  // Validate every body before replacing the pinned source.
  const skills = []
  for (const name of names) {
    const text = await readFile(resolve(source, 'skills', name, 'SKILL.md'), 'utf8')
    const { header, body: original } = splitSkill(text)
    const body = original.startsWith(`\n${ampPreface}`) ? original.slice(ampPreface.length + 1) : original
    if (createHash('sha256').update(body).digest('hex') !== hashes[name]) {
      throw new Error(`Pinned upstream body mismatch: ${name}`)
    }
    skills.push({ name, header, body })
  }
  await mkdir(resolve(root, 'upstream/skills'), { recursive: true })
  for (const { name, header, body } of skills) {
    const dest = resolve(root, 'upstream/skills', name)
    await rm(dest, { recursive: true, force: true })
    await cp(resolve(source, 'skills', name), dest, { recursive: true })
    await rm(resolve(dest, 'amp-adapter.md'), { force: true })
    await writeFile(resolve(dest, 'SKILL.md'), `---\n${header}\n---\n${body}`)
  }
  for (const resource of ['LICENSE', 'docs', 'assets']) {
    await cp(resolve(source, resource), resolve(root, 'upstream', resource), { recursive: true })
  }
  await cp(resolve(source, 'agents/comment-sicko.md'), resolve(root, 'upstream/comment-sicko.md'))
}

const roles = JSON.parse(await readFile(resolve(root, 'agents.json'), 'utf8'))
const commentSicko = splitSkill(await readFile(resolve(root, 'upstream/comment-sicko.md'), 'utf8')).body.trimEnd()
for (const harness of ['antigravity', 'opencode', 'pstack']) {
  const dest = resolve(root, harness)
  const isAmp = harness === 'pstack'
  const adapter = await readFile(resolve(dest, isAmp ? 'AMP.md' : 'ADAPTER.md'), 'utf8')
  await rm(resolve(dest, 'skills'), { recursive: true, force: true })
  await cp(resolve(root, 'upstream/skills'), resolve(dest, 'skills'), { recursive: true })
  const skillDescriptions = {}
  for (const name of names) {
    const base = resolve(dest, 'skills', name)
    const { header, body } = splitSkill(await readFile(resolve(base, 'SKILL.md'), 'utf8'))
    if (createHash('sha256').update(body).digest('hex') !== hashes[name]) {
      throw new Error(`Pinned upstream body mismatch: ${name}`)
    }
    const description = header.match(/^description: (.+)$/m)?.[1]
    if (!description) throw new Error(`Missing description: ${name}`)
    skillDescriptions[name] = description.startsWith('"') ? JSON.parse(description) : description
    const preface = isAmp ? ampPreface : `**${harness === 'opencode' ? 'OpenCode' : 'Antigravity'} port.** Read [harness-adapter.md](harness-adapter.md) before following this skill. It replaces Cursor tool, model, history, scheduling, and authorization instructions below.\n\n`
    await writeFile(resolve(base, 'SKILL.md'), `---\n${isAmp ? header : `name: ${name}\ndescription: ${description}`}\n---\n\n${preface}${body}`)
    await writeFile(resolve(base, isAmp ? 'amp-adapter.md' : 'harness-adapter.md'), adapter)
  }
  for (const resource of ['LICENSE', 'docs', 'assets']) {
    await cp(resolve(root, 'upstream', resource), resolve(dest, resource), { recursive: true })
  }
  if (isAmp) continue
  await rm(resolve(dest, 'agents'), { recursive: true, force: true })
  await mkdir(resolve(dest, 'agents'), { recursive: true })
  const definitions = {}
  for (const [name, role] of Object.entries(roles)) {
    const prompt = `Read the bundled poteto-mode SKILL.md and its harness-adapter.md in full before working, including applicable principle skills. The parent must supply the absolute skill path. If unavailable, report the blocker; never search Cursor caches.\n\n${role.prompt}${name === 'comment-sicko' ? `\n${commentSicko}` : ''}\n`
    definitions[name] = {
      description: role.description,
      mode: 'subagent',
      system: prompt,
      ...(role.reportOnly ? { permissions: [{ action: 'edit', resource: '*', effect: 'deny' }] } : {}),
    }
    if (harness === 'antigravity') {
      const tools = ['view_file', 'grep_search', 'run_command']
      if (!role.reportOnly) tools.push('replace_file_content')
      const header = [
        `name: ${name}`,
        `description: ${JSON.stringify(role.description)}`,
        'mainAgent: false',
        'subagent: true',
        'model: inherit',
        'commandExecutionPolicy: sandbox',
        'tools:',
        ...tools.map(tool => `  - ${tool}`),
      ].join('\n')
      await writeFile(resolve(dest, 'agents', `${name}.md`), `---\n${header}\n---\n\n${prompt}`)
    }
  }
  if (harness === 'opencode') {
    await writeFile(resolve(dest, 'agents.json'), `${JSON.stringify(definitions, null, 2)}\n`)
    await writeFile(resolve(dest, 'skills.json'), `${JSON.stringify(skillDescriptions, null, 2)}\n`)
    await rm(resolve(dest, 'agents'), { recursive: true })
  } else {
    const defaults = Object.fromEntries(Object.keys(roles).map(name => [name, 'inherit']))
    await writeFile(resolve(dest, 'model-routing.defaults.json'), `${JSON.stringify(defaults, null, 2)}\n`)
  }
}
console.log(`Built ${names.length} skills for Amp, Antigravity, and OpenCode; ${Object.keys(roles).length} native agents each for Antigravity and OpenCode`)
