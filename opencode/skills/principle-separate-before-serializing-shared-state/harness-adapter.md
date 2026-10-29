# Pstack on OpenCode V2

This adapter replaces Cursor-specific mechanics in the unchanged skills and
playbooks. Preserve engineering checks, not Cursor API names. The active tool
schemas, permissions, and user instructions take precedence. This plugin targets
the V2 setup/transform API, verified against 2.0.32. V1 is not supported.

## Skills and resources

Load skills through the native skill tool by their installed names, such as
poteto-mode. Confirm that the returned path belongs to this plugin. Bare names
can collide with independently installed skills. Resolve references against the
loaded skill directory, never against the target project's working directory.
Use native file reads for sibling resources. Pass the absolute poteto-mode
skill path to every delegate. A slash invocation means a skill, not a shell
command. Use the native skill tool when a slash entry is unavailable.

For skill discovery and authoring, translate `.cursor/skills/` to the workspace's
`.agents/skills/` and `~/.cursor/skills/` to the OpenCode config directory's
`skills/`, by default `~/.config/opencode/skills/`. Honor XDG_CONFIG_HOME.
Search native skill locations, including `.opencode/skills/`, before creating a
skill. Preserve an existing editable skill's location and category. Copy plugin
skills to the chosen native location before editing; never edit plugin caches.
Apply these paths to generated skills, feature maps, and reflect's approved copies.
Replace Cursor's built-in `create-skill` with an installed skill-authoring skill.
If none is available, use native tools and the documented SKILL.md format.
Keep the requested draft, test, iterate, and description-optimization steps.
Report any evaluation capability the active tools cannot provide.

The 56 skill bodies and 23 playbooks are preserved. Cursor setup-pstack,
make-bot-ui, Benny automation, Custom Modes, and team-kit are excluded.
Skip their routes and upstream installation links. Do not invent placeholders.
For deslop, inspect the diff and run the project's lint. For control-ui or
control-cli, use an installed verification tool or the actual app. Preserve
real before/after proof. A mock or compile is not proof.

## Delegation and model routing

Use the native subagent tool with agent, description, and prompt. sessionID
resumes an existing child only when its retained local state is necessary.
background returns immediately and notifies the parent on completion. model is
an optional per-call override; use it only when the user explicitly requests a
model or variant. Cursor readonly, run_in_background, resume, environment, and
file_attachments fields are not subagent parameters. Use a fresh child for new
work and the following installed agent names:

- poteto-agent: implementation, refactoring, hillclimb, and swarm workers.
- comment-sicko: no-comments review, report only.
- pstack-researcher: how explorers, why investigators, recall, and source waves.
- pstack-reviewer: how explanation, arena judges, interrogate and reflect reviewers.
- pstack-reviewer-alt: another independent review seat.
- pstack-synthesizer: how, why, and reflect synthesis.

Configure models through OpenCode's native agents.<name>.model setting using
provider/model#variant IDs. Native configuration applies after plugin defaults,
preserving model, system, disabled, and permissions overrides. Without a tool or
agent model override, a child inherits the invoking parent's model.
pstack-models.mdc and Cursor model tables do not configure OpenCode. Never translate Cursor slugs or
silently choose a paid model. An unavailable model is a configuration error to
report, not permission to pick a different provider.

For a review panel, create the required number of independent children. Alternate
pstack-reviewer and pstack-reviewer-alt when configured with different models.
For more distinct models, explicitly configure more native subagents and name
their assignments. Default reviewers share the parent model. Report that gap;
never label a same-model panel multi-model. Preserve an incomplete gate when
the workflow requires unavailable independence.

subagent awaits a child result unless background is true. Calls may run
concurrently only when the native harness actually dispatches them together.
Completion notifications are not arbitrary asynchronous messaging or Cursor
cloud agents. Children share the project working directory by default.
Keep writes disjoint or create real isolated worktrees with a supported workflow.
A path in a prompt alone does not prove worktree isolation. Supply exact code,
context, paths, success criteria, and evidence requirements. Review every result.

OpenCode limits subagent nesting (default depth: one). Do not widen permissions
or depth settings to force nesting. The parent runs additional phases when needed.
Report-only agents default to a deny rule for action edit on resource *.
Shell and MCP permissions still come from user configuration, so report-only scope also forbids mutating shell and
MCP calls. This is not a read-only filesystem sandbox.

## History, authorization, and lifecycle

Use the current conversation for current-session evidence. For authorized older
sessions, use supported V2 session APIs with the exact session ID. Do not run
Cursor transcript globs or scan other projects. Give reviewers a scoped digest if raw history is unavailable, and
identify tool-level claims that cannot be verified. Use only installed tools
and configured MCP servers. Do not assume a read-only role loses all MCP access.

A native skill load or file read of its SKILL.md or resources counts as
skill-use evidence at the actual installed path, including plugin paths.
A delegate prompt naming that path or a call matching documented commands also
counts. Cursor tool names and directories are not required. Include this mapping
in reviewer briefs alongside unchanged reflect templates. Preserve the distinction
between a used skill and a missed trigger. A summary alone does not prove use.

Loading a skill grants no permission to publish, push, merge, post, deploy,
change shared data, or delete work. Existing user authorization and OpenCode
permissions govern actions. Approval gates remain gates, including reflect's
approval before skill edits. Preserve unrelated changes and explicit draft PRs.
Do not reset another actor's work to make a playbook convenient.

Cursor /loop is not available. Use a supported watcher only when the user asks
for monitoring or scheduling. Otherwise continue with ordinary subagent waits and
report the stopping point. The plugin starts no process or service, writes no
configuration files, and does not auto-load poteto-mode. Use native todo
when available, otherwise a Markdown task list.

## Bundled scripts

Scripts are inherited from the reviewed Amp port, not claimed as unmodified
Cursor resources. watch-pr requires Bun plus locked dependencies.
check-plan.mjs requires Node. log.sh requires Bash. Forge commands require
authenticated Git and the relevant CLI. Copy the complete poteto-mode/scripts
directory to writable task-owned scratch and run bun install --frozen-lockfile
there. Run that copy with the target repository as cwd, not in the plugin cache.

Statechart's `scripts/statechart` wrapper runs `statechart.ts` with
Node 22.18 to 22.x or 23.6 or later, Bun 1.1.5 or later, or Deno 2. Model
checking requires Java 11 or later and TLC (`tla2tools.jar`). The first-run mise
install of Java and TLC is disabled by default, overriding the upstream skill
text. Use provisioned TLA2TOOLS and JAVA paths, or approve the downloads before
setting PSTACK_ALLOW_INSTALL=1 for one command. Rendering per
`references/render.md` requires `pele@1.9.0` from npm; install it only with
approval, in task-owned scratch outside the repository and the plugin cache. The
script tests need `fast-check` and download Pele, Mermaid, and jsdom into
`$XDG_CACHE_HOME/statechart`; run them only in a scratch copy with
XDG_CACHE_HOME in scratch. Keep specs, configs, views, and `--out` folders in
task-owned scratch, never in shared plugin-cache inputs. View modules are
executable code; review them and their imports before running them.

worktree-audit.sh fetches refs and queries PRs. Its unknown Amp activity column
also means unknown OpenCode activity. No row establishes that deletion is safe.
Confirm ownership, active sessions, untracked files, and unpushed commits.
Deletion requires explicit authorization.
