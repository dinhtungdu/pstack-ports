# Install pstack for OpenCode 1.14.30

Add the absolute plugin file URL to your project's `opencode.json` plugin list.
Preserve existing entries and settings:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/pstack-ports/opencode/index.js"]
}
```

Use your global OpenCode configuration instead if you want the plugin available
in every project. Keep this whole directory at the configured path. Copying
only index.js loses its bundled skills and agents. No npm publication or
dependency installation is required.

Restart OpenCode, then ask it to load `poteto-mode` with the native skill tool.
Skill names are unchanged from upstream. Remove conflicting independent copies
only after checking their ownership. The plugin does not auto-load a workflow.

This plugin targets the installed 1.14.30 API: `config.skills.paths` and
`config.agent`. OpenCode's development branch has a different plugin API.
Do not assume this plugin supports it without rerunning the runtime checks.

## Choose worker models

Configure any of these native agents under `agent` in `opencode.json`:

- poteto-agent: implementation and swarm workers.
- comment-sicko: report-only comment review.
- pstack-researcher: source and evidence investigation.
- pstack-reviewer and pstack-reviewer-alt: independent review seats.
- pstack-synthesizer: evidence synthesis.

Set an agent's `model` to an actual `provider/model` ID listed by `opencode models`.
For a multi-model panel, configure the two reviewer seats with distinct models.
An omitted model inherits the invoking parent's model. No paid model is selected
by the plugin, and Cursor's pstack-models.mdc is ignored.

The config hook keeps existing model, prompt, variant, disable, and permission
overrides. Report-only roles default to `edit: deny`; shell and MCP safety still
depend on your permissions and the report-only instructions.

## Check discovery

From a project with the plugin configured:

```sh
opencode debug skill
opencode debug agent pstack-reviewer
```

Expect 52 skills with locations under this bundle. Use `opencode debug agent`
with each of the six role names to check its resolved configuration. This
command also resolves provider tools and can require a configured model.
In 1.14.30, `opencode agent list` does not initialize plugin config hooks,
so that command omits plugin-registered agents even when sessions load them.
Check each configured model before requesting a paid multi-model run.
Read [ADAPTER.md](ADAPTER.md) for delegation, history, scripts, and authorization
boundaries. Runtime discovery does not prove that a model-driven workflow ran.
