import type { PluginAPI } from '@ampcode/plugin'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const description = 'pstack engineering workflows, principles, and review skills adapted for Amp.'

export default async function (amp: Pick<PluginAPI, 'registerSkill' | 'on'>) {
	for (const entry of readdirSync(new URL('./skills/', import.meta.url), { withFileTypes: true })) {
		if (entry.isDirectory()) {
			await amp.registerSkill({ path: `skills/${entry.name}` })
		}
	}
	amp.on('agent.start', async (_event, ctx) => {
		if (!ctx.system.workspaceRoot) return
		const result = await ctx.$`git -C ${fileURLToPath(ctx.system.workspaceRoot.toString())} remote -v`
		if (result.exitCode !== 0) return
		const enabled = result.stdout.split('\n').some(line => {
			const remote = line.split(/\s+/)[1] ?? ''
			return /^(?:https?:\/\/|ssh:\/\/(?:git@)?|git@)github\.com[:/](?:(?:woocommerce|dinhtungdu)\/woocommerce|(?:wordpress|dinhtungdu)\/gutenberg)(?:\.git)?\/?$/i.test(remote)
		})
		if (!enabled) return
		return {
			message: {
				content: 'Before handling this task, load pstack:poteto-mode unless it is already loaded in the current context. Follow its workflow and load other skills and playbooks only as needed. Respect an explicit user opt-out for its stated scope; do not re-enable it while that opt-out applies.',
			},
		}
	})
}
