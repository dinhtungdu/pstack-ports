# Install pstack for OpenCode V2

Add the absolute plugin directory to your project's `opencode.json` plugins list.
Preserve existing entries and settings:

```json
{
  "plugins": ["/absolute/path/to/pstack-ports/opencode"]
}
```

Use your global OpenCode configuration instead if you want the plugin available
in every project. Keep this whole directory at the configured path. Copying
only index.js loses its bundled skills, manifests, and agents. No npm publication or
dependency installation is required.

Restart OpenCode, then ask it to load `poteto-mode` with the native skill tool.
Skill names are unchanged from upstream. Remove conflicting independent copies
only after checking their ownership. The plugin does not auto-load a workflow.

This plugin targets the V2 setup/transform API, verified against 2.0.32. It
default-exports a plugin definition and registers skills and agents through
`ctx.skill.transform` and `ctx.agent.transform`. There is no V1 fallback.
Do not add a separate skills path: the plugin registers all 52 bundled skills.

## Choose worker models

Configure any of these native agents under `agents` in `opencode.json`:

- poteto-agent: implementation and swarm workers.
- comment-sicko: report-only comment review.
- pstack-researcher: source and evidence investigation.
- pstack-reviewer and pstack-reviewer-alt: independent review seats.
- pstack-synthesizer: evidence synthesis.

Set an agent's `model` to an available `provider/model#variant` ID (variant optional).
For a multi-model panel, configure the two reviewer seats with distinct models.
An omitted model inherits the invoking parent's model. No paid model is selected
by the plugin, and Cursor's pstack-models.mdc is ignored.

```json
{
  "agents": {
    "pstack-reviewer": {
      "model": "provider/model#variant",
      "system": "User-owned reviewer instructions",
      "permissions": [{ "action": "edit", "resource": "*", "effect": "deny" }]
    },
    "pstack-reviewer-alt": { "disabled": true }
  }
}
```

V2 applies user configuration after plugin defaults. Model, system prompt,
disabled, and permission overrides remain authoritative. Permission rules use
last-match precedence. Report-only roles default to denying the `edit` action;
shell and MCP safety still depend on permissions and report-only instructions.

## Check discovery

From a project with the plugin configured:

```sh
opencode --version
opencode debug agents
opencode api GET '/api/plugin?location[directory]=/absolute/project/path'
opencode api GET '/api/skill?location[directory]=/absolute/project/path'
opencode api GET '/api/agent?location[directory]=/absolute/project/path'
```

Use the V2 executable bundled with your desktop app (or `opencode2` if installed).
A separate `opencode` on PATH may still be V1. Expect plugin `pstack` active,
52 skills with `path` under this bundle, and six agents unless intentionally
disabled. Reload the project location or restart OpenCode after editing assets.
Check each configured model before requesting a paid multi-model run. The native
`subagent` tool takes `agent`, `description`, and `prompt`; optional `sessionID`
resumes a child, and `background` enables completion notification.
Read [ADAPTER.md](ADAPTER.md) for delegation, history, scripts, and authorization
boundaries. Runtime discovery does not prove that a model-driven workflow ran.

The repository's real-loader test runs when `opencode2` is available, or when
`OPENCODE_V2_BIN=/absolute/path/to/v2/opencode npm test` selects a V2 executable.
