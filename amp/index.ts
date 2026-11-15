import type { PluginAPI, ThreadID } from '@ampcode/plugin'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const description = "Lauren Tan's pstack engineering workflows and principles, ported to Amp."

// Skills an agent should pick from the situation alone. The rest are reached by
// name from poteto-mode, poteto-help, another skill, or the user, as upstream
// intends with disable-model-invocation, which Amp ignores.
export const listed = new Set([
	'poteto-mode',
	'poteto-help',
	'how',
	'why',
	'teach',
	'recall',
	'tdd',
	'unslop',
	'technical-writing',
	'typescript-best-practices',
	'benchmark-checklist',
	'blast-radius',
	'interrogate',
	'statechart',
])

const adapterPath = fileURLToPath(new URL('./adapter.md', import.meta.url))

const opus = { model: 'anthropic/claude-opus-5-5', label: 'Claude Opus 5.5' } as const
const fable = { model: 'anthropic/claude-fable-5-2', label: 'Claude Fable 5.2' } as const
const sonnet = { model: 'anthropic/claude-sonnet-5-5', label: 'Claude Sonnet 5.5' } as const
const haiku = { model: 'anthropic/claude-haiku-5-5', label: 'Claude Haiku 5.5' } as const

type Route = {
	model: string
	label: string
	effort: 'low' | 'medium' | 'high'
	use: string
	// Delegates that load poteto-mode first, as upstream's poteto-agent does.
	poteto?: true
	readOnly?: true
}

// The owner's routing for upstream's roles: Claude models only, effort never above
// high, Opus at high for code and medium for judgment.
export const routes: Record<string, Route> = {
	code: { ...opus, effort: 'high', poteto: true, use: 'poteto-agent for code in a playbook step: feature, refactoring, bug fix, perf issue, hillclimb' },
	hardest: { ...fable, effort: 'high', poteto: true, use: 'poteto-agent for the hardest changes: cross-cutting design, gnarly concurrency, subtle algorithms' },
	mechanical: { ...haiku, effort: 'medium', poteto: true, use: 'poteto-agent for trivial mechanical edits' },
	judgment: { ...opus, effort: 'medium', use: 'judgment and prose' },
	'swarm-worker': { ...sonnet, effort: 'medium', use: 'swarm workers and verification' },
	'history-search': { ...haiku, effort: 'low', readOnly: true, use: 'recall history search and reflect tooling' },
	'comment-sicko': { ...sonnet, effort: 'medium', readOnly: true, use: 'Comment Sicko, report only' },
	reviewer: { ...opus, effort: 'medium', readOnly: true, use: 'reflect reviewers and synthesizer' },
	'panel-fable': { ...fable, effort: 'high', use: 'Fable seat on arena, architect, and interrogate panels' },
	'panel-opus': { ...opus, effort: 'medium', use: 'Opus seat on arena, architect, and interrogate panels' },
	'panel-sonnet': { ...sonnet, effort: 'high', use: 'Sonnet seat on arena, architect, and interrogate panels' },
	judge: { ...fable, effort: 'high', readOnly: true, use: 'arena cross-judge' },
}

const potetoInstructions = `You are a poteto-agent: one delegate in a pstack poteto-mode run. The parent thread owns the playbook, the todo list, and every delegate. Do only the task in your brief.

Before any work, load \`pstack:poteto-mode\` with the skill tool and read it in full, including its Principles index and the Amp adapter that comes with it. Load each \`pstack:principle-*\` skill you apply. Do not run a playbook yourself.`

const subagentInstructions = `You are a subagent in a pstack workflow. Do only the task in your brief. Load any pstack skill your brief names, as \`pstack:<name>\`, with the skill tool before acting on it.`

const readOnlyInstructions = `You report only. Do not edit, create, or delete files, and do not change shared state such as branches, PRs, or tickets.`

const reportInstructions = `Do not start other pstack agents. End with a report for the parent: what you found or changed, with file paths, the evidence, and anything left open.`

const toolName = 'pstack_agent'

export default async function (amp: Pick<PluginAPI, 'registerSkill' | 'on' | 'registerTool' | 'createAgent'>) {
	const skills = readdirSync(new URL('./skills/', import.meta.url), { withFileTypes: true })
		.filter(entry => entry.isDirectory())
		.map(entry => entry.name)
	for (const name of skills) {
		await amp.registerSkill({ path: `skills/${name}`, listed: listed.has(name) })
	}

	const agents = Object.fromEntries(
		Object.entries(routes).map(([role, route]) => [
			role,
			amp.createAgent({
				name: route.poteto ? 'poteto-agent' : `pstack ${role}`,
				model: route.model as `${string}/${string}`,
				reasoningEffort: route.effort,
				instructions: [route.poteto ? potetoInstructions : subagentInstructions, route.readOnly && readOnlyInstructions, reportInstructions]
					.filter(Boolean)
					.join('\n\n'),
				tools: { exclude: [toolName, `plugin__pstack__${toolName}`, ...(route.readOnly ? ['edit_file', 'create_file'] : [])] },
			}),
		]),
	)

	amp.registerTool({
		name: toolName,
		description: [
			'Start a pstack subagent on the model its role routes to. It runs in a child thread on the same machine and checkout and sees nothing of this thread, so pass the full brief.',
			"Use it where pstack text spawns a subagent for one of these roles: upstream's poteto-agent, a panel seat, a judge, a reviewer, or a worker. Use a fresh agent for each new task.",
			'Roles:',
			...Object.entries(routes).map(([role, route]) => `- ${role}: ${route.use} (${route.label}, ${route.effort} effort${route.readOnly ? ', report only' : ''}).`),
			'With background true, it returns the thread ID at once; follow it with wait_for_threads and read_thread. Otherwise it waits for the report.',
		].join('\n'),
		inputSchema: {
			type: 'object',
			properties: {
				role: { type: 'string', enum: Object.keys(routes), description: 'The role, which picks the model.' },
				brief: {
					type: 'string',
					description: "The full brief: the user's goal, the task, file paths, the exact revision, what not to touch, and the checks to run.",
				},
				background: { type: 'boolean', description: 'Return the thread ID at once instead of waiting. Defaults to false.' },
			},
			required: ['role', 'brief'],
		},
		async execute(input, ctx) {
			const role = typeof input.role === 'string' ? input.role : ''
			const route = routes[role]
			if (!route) throw new Error(`Unknown role "${role}". Use one of: ${Object.keys(routes).join(', ')}.`)
			const brief = typeof input.brief === 'string' ? input.brief.trim() : ''
			if (!brief) throw new Error('brief is required.')
			const thread = await agents[role].createThread({ parentThreadID: ctx.thread.id })
			const reply = input.background ? undefined : thread.waitForResponse({ timeoutMs: 60 * 60 * 1000 })
			reply?.catch(() => {})
			await thread.appendUserMessage({ type: 'user-message', content: brief })
			const header = `pstack ${role} thread ${thread.id} (${route.label}, ${route.effort} effort).`
			if (!reply) return `${header} Started in the background. Use wait_for_threads, then read_thread, to get its report.`
			const cancel = () => void thread.cancel()
			ctx.signal.addEventListener('abort', cancel, { once: true })
			try {
				const message = await reply
				const text = message.content
					.filter(block => block.type === 'text')
					.map(block => (block as { text: string }).text)
					.join('\n')
					.trim()
				return `${header}\n\n${text || '(The agent ended without a text report. Read its thread.)'}`
			} catch (error) {
				if (ctx.signal.aborted) throw error
				return `${header} It has not finished: ${error instanceof Error ? error.message : String(error)}. Use wait_for_threads, then read_thread.`
			} finally {
				ctx.signal.removeEventListener('abort', cancel)
			}
		},
	})

	const adapter = readFileSync(adapterPath, 'utf8')
	// Task subagents share their parent's thread ID, so a subagent's first load
	// gets the reminder, not the adapter.
	const reminder = `Before following this skill, read ${adapterPath} in full unless "# pstack on Amp" is already in your context.`
	const adapted = new Set<ThreadID>()

	amp.on('tool.result', event => {
		const name = event.input.name
		if (event.tool !== 'skill' || event.status !== 'done' || typeof name !== 'string' || !name.startsWith('pstack:')) {
			return
		}
		const note = adapted.has(event.thread.id) ? reminder : adapter
		adapted.add(event.thread.id)
		return { status: 'done', output: appendText(event.output, note) }
	})

	amp.on('agent.start', event => {
		const named = new Set<string>()
		for (const match of event.message.matchAll(/(?:^|[\s(`'"])(?:\/|pstack:)([a-z0-9-]+)/g)) {
			if (skills.includes(match[1])) named.add(`\`pstack:${match[1]}\``)
		}
		if (named.size === 0) return {}
		return { message: { content: `The user named pstack skills. Load ${[...named].join(', ')} with the skill tool before acting on them.` } }
	})
}

function appendText(output: unknown, text: string): unknown {
	if (typeof output === 'string') return `${output}\n\n${text}`
	if (output && typeof output === 'object' && Array.isArray((output as { content?: unknown }).content)) {
		const result = output as { content: unknown[] }
		return { ...result, content: [...result.content, { type: 'text', text }] }
	}
	return `${JSON.stringify(output)}\n\n${text}`
}
