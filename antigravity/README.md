# Install pstack for Antigravity

From your pstack-ports checkout, use the Antigravity CLI:

```sh
agy plugin install ./antigravity
agy plugin list --json
```

Expect plugin `pstack` with 52 skills and six agents. In the App or IDE, you can
instead copy this entire directory into `<project>/.agents/plugins/pstack/`
for one workspace, or `~/.gemini/config/plugins/pstack/` for all workspaces.
Do not merge with an existing pstack directory without reviewing its changes.
CLI-managed installation paths differ; let `agy plugin install` manage them.

Start a new conversation and invoke `/poteto-mode`, or ask for the bundled
poteto-mode skill. It does not auto-load. Check the discovered file path if
another installation provides the same skill names.

## Choose worker models

The six native roles are poteto-agent, comment-sicko, pstack-researcher,
pstack-reviewer, pstack-reviewer-alt, and pstack-synthesizer. The
[adapter](ADAPTER.md) maps upstream workflow roles to these names.
All roles default to `inherit`.

From your pstack-ports checkout, run the setup command against the installed
plugin directory. For a global App installation:

```sh
node antigravity/configure-models.mjs "$HOME/.gemini/config/plugins/pstack"
```

For a workspace installation, pass `<project>/.agents/plugins/pstack` instead.
For a CLI installation, get the installed path from `agy plugin list --json`.
The installed bundle also includes configure-models.mjs, so you can run that
copy after moving or removing the source checkout.

On first run, the command creates `~/.config/pstack-ports/antigravity-models.json`
with all six roles set to `inherit`. If `XDG_CONFIG_HOME` is set, it uses that
directory instead of `~/.config`. Settings stay outside the plugin bundle.
Edit this file to choose `inherit`, `flash`, or `pro` per role, then rerun the
same command. Omitted roles reset to `inherit`. Unknown roles, invalid tiers,
malformed JSON, or missing agent model fields fail before agent files change.

To keep separate settings for a project, pass an external settings file as the
second argument. A missing file is initialized with all-inherit defaults:

```sh
node antigravity/configure-models.mjs /path/to/installed/pstack /path/to/project-models.json
```

The command changes only each agent's frontmatter `model:` field. It preserves
other fields, prompts, and line endings. Reapplying unchanged settings writes
no agent files. Reapply after plugin updates or reinstallation, then start a
new Antigravity conversation. The command does not install a plugin or select
a model through the App UI.

Antigravity's documented agent configuration selects tiers, not arbitrary
provider/model IDs. Different tiers do not establish different model families.
The default review panel is not multi-model. Subagents are documented for the
App and CLI; standalone IDE support must be checked against its available tools.
Do not promise delegation when invoke_subagent is absent.

## Check the port

From the source checkout, run `agy plugin validate ./antigravity --strict`.
After installation, confirm the catalog with `agy plugin list --json`. Ask
the agent to read the bundled bro skill and its adapter. In the App or CLI,
give pstack-researcher a bounded report-only file lookup. Check its model,
workspace, evidence, and absence of file changes. Then test poteto-agent on a
disposable Git repository before using it for real work.

Verified with agy 1.4.1: strict validation has no findings, native installation
discovers all 52 skills and six agents, and installed definitions remain valid
after applying flash and pro settings. Tests use an isolated home directory
and leave the user's global plugins unchanged. Native CLI checks run when agy
is available. No model is invoked, so App delegation and actual tier selection
remain unverified.
