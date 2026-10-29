# Pstack on Antigravity

This adapter replaces Cursor-specific mechanics in the unchanged skills and
playbooks. Preserve engineering checks, not Cursor API names. The active
surface's tool schemas, permissions, and user instructions take precedence.

## Skills and resources

Read the bundled skill's SKILL.md, including this adapter, before following it.
Use its discovered absolute path for sibling resources. Slash invocations in
upstream text mean the corresponding installed skill, not shell commands.
Pass the absolute poteto-mode skill path to every delegate. Bare skill names
can collide with separately installed copies; select this plugin's path.

For skill discovery and authoring, translate `.cursor/skills/` to the workspace's
`.agents/skills/` and `~/.cursor/skills/` to `~/.gemini/config/skills/`.
Search native skill locations before creating a skill. Preserve an existing
editable skill's location and category. Copy plugin skills to the chosen native
location before editing; never edit installed plugin caches. Apply these paths
to generated skills, feature maps, and reflect's approved copies too.
Replace Cursor's built-in `create-skill` with an installed skill-authoring skill.
If none is available, use native tools and the documented SKILL.md format.
Keep the requested draft, test, iterate, and description-optimization steps.
Report any evaluation capability the active tools cannot provide.

The 56 skill bodies and 23 playbooks are preserved. Cursor setup-pstack,
make-bot-ui, Benny automation, Custom Modes, and team-kit are not implemented.
Skip their routes and installation links. Do not offer placeholder commands.
For deslop, inspect the diff and run the project's lint. For control-ui or
control-cli, use the actual app and available browser or terminal tools.
Keep the real before/after proof requirement. A compile or mock is not proof.

## Delegation and model routing

Custom subagents are documented for the Antigravity App and CLI. Do not assume
the standalone IDE exposes them. Check the active tool catalog first. If
invoke_subagent is absent, do bounded work directly where possible and report
any incomplete independence or parallel-review gate. Do not spawn via shell.

When available, use invoke_subagent with the actual runtime schema. Use native
messages and status tools for coordination. Never pass Cursor Task fields such
as subagent_type, readonly, run_in_background, or environment to Antigravity.
Select the bundled native agent for the upstream role:

- poteto-agent: implementation, refactoring, hillclimb, and swarm workers.
- comment-sicko: no-comments review, report only.
- pstack-researcher: how explorers, why investigators, recall, and source waves.
- pstack-reviewer: how explanation, arena judges, interrogate and reflect reviewers.
- pstack-reviewer-alt: another independent review seat.
- pstack-synthesizer: how, why, and reflect synthesis.

Use a fresh child for new work. A child starts without the parent's history.
Supply the consolidated brief, exact revision, paths, rubric, and required
evidence. Use a native branch workspace when concurrent writers need isolated
Git worktrees. inherit and share workspaces are not isolated. Confirm the
selected mode through the runtime schema. Review returned diffs and evidence.
Do not kill a branch worker until its changes are recovered: generated worktrees
can be cleaned up when the worker is killed. Nesting is capped at 10 levels
in the documented App model; never assume nesting or restart survival.

All bundled agents default to model: inherit. Native agent model choices are
inherit, flash, and pro, not Cursor model slugs. The bundle's configure-models.mjs
command applies the user's external antigravity-models.json settings to installed
agent model fields. Run it only when asked to configure routing. All roles and
omitted settings default to inherit. Reapply saved settings after plugin updates.
pstack-models.mdc has no effect. A tier change does not prove a different model
family. Do not call same-model reviewers
a multi-model panel. Disclose actual model diversity or the missing gate.
No automatic provider routing, paid tier selection, or Cursor setup wizard exists.

Report-only agents have no direct file-edit tool, but run_command is still
available for source inspection. Their scope forbids mutating commands; this
is not a read-only filesystem sandbox. Parent permissions and sandbox policies
remain authoritative. Do not widen permissions to satisfy a playbook.
Workers have only the documented tools in their agent definitions. The parent
must handle unsupported browser or MCP steps, or report a capability gap.

## History, authorization, and lifecycle

Use the current conversation for current-session evidence. For other sessions,
use native history or explicitly scoped, authorized transcripts. Never run the
upstream Cursor transcript globs or search unrelated projects. If raw history
is unavailable, provide a scoped digest and disclose unverified tool claims.
Give native tools their real arguments. Do not invent Amp or Cursor APIs.

A native skill load or file read of its SKILL.md or resources counts as
skill-use evidence at the actual installed path, including plugin paths.
A delegate prompt naming that path or a call matching documented commands also
counts. Cursor tool names and directories are not required. Include this mapping
in reviewer briefs alongside unchanged reflect templates. Preserve the distinction
between a used skill and a missed trigger. A summary alone does not prove use.

Loading a skill does not authorize publishing, pushing, merging, posting,
deploying, shared writes, or deletion. Preserve explicit user permissions and
approval gates, including reflect's approval before edits. Never reset or
overwrite unrelated work. Do not interpret upstream blanket permission as consent.

Cursor /loop is unavailable. Do not create a schedule, background service, or
promise continued execution after the turn without an explicit user request
and supported native mechanism. This plugin installs no hooks or services and
does not auto-load poteto-mode. Use the native task list when available.

## Bundled scripts

Scripts are inherited from the reviewed Amp port, not claimed as unmodified
Cursor resources. They require Bun and locked dependencies for watch-pr,
Node for check-plan.mjs, Bash for log.sh, and authenticated Git and forge tools.
Copy the complete poteto-mode/scripts directory to task-owned scratch and run
bun install --frozen-lockfile there. Never install into a shared plugin cache.
Run that copy with the target repository as the working directory.

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

worktree-audit.sh fetches remote refs and queries PRs. Its unknown Amp activity
column is also unknown Antigravity activity. No row proves deletion safe.
Confirm ownership, active sessions, untracked files, and unpushed work first.
Deletion requires explicit authorization.
