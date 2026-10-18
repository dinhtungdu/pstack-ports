import type { PluginAPI } from '@ampcode/plugin'
import { readdirSync } from 'node:fs'

export const description = 'pstack engineering workflows, principles, and review skills adapted for Amp.'

export default async function (amp: Pick<PluginAPI, 'registerSkill'>) {
	for (const entry of readdirSync(new URL('./skills/', import.meta.url), { withFileTypes: true })) {
		if (entry.isDirectory()) {
			await amp.registerSkill({ path: `skills/${entry.name}` })
		}
	}
}
