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
Cursor resources. They require Bun and locked dependencies for orch and watch-pr,
Node for check-plan.mjs, Bash for log.sh, and authenticated Git and forge tools.
Copy the complete poteto-mode/scripts directory to task-owned scratch and run
bun install --frozen-lockfile there. Never install into a shared plugin cache.
Run that copy with the target repository as the working directory.

Statechart requires Node, Java 11 or later, and TLC. PNG output also requires
Pele and resvg. Dependency installation is disabled by default, overriding the
upstream skill text. Use provisioned TLA2TOOLS and JAVA paths, or approve the
downloads before setting PSTACK_ALLOW_INSTALL=1 for one command. Set
XDG_CACHE_HOME to task-owned scratch when installing renderer dependencies.
Copy inputs into task-owned scratch too: --out does not relocate adjacent
mapping and model files, and reruns replace generated output. Never overwrite
unrelated files or run against shared plugin-cache inputs. Mapping modules are
executable JavaScript; review them and their imports before running them.

worktree-audit.sh fetches remote refs and queries PRs. Its unknown Amp activity
column is also unknown Antigravity activity. No row proves deletion safe.
Confirm ownership, active sessions, untracked files, and unpushed work first.
Deletion requires explicit authorization.
