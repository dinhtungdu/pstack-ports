# pstack on Amp

This adapter replaces Cursor-specific mechanics in the bundled skills and
playbooks. Preserve their engineering checks, not their harness API names.
The session's tool schemas, permissions, and user instructions take precedence.

## Skills and resources

Load bundled skills by bare name with `skill(name: "<name>")`, including
principles. Slash invocations in the upstream text mean that skill, not a shell
command. Resolve resources against the loaded skill's base directory, never the
project's working directory. Each skill is installed as its own directory, so
paths into another skill, such as `../<name>/SKILL.md` or the guide's
`../../skills/<name>/SKILL.md`, do not resolve: load that skill by name and
resolve the rest of the path against its base directory. Upstream
`../../docs/guide/` pages are bundled in `poteto-help` under `docs/guide/`.
Guide images and the upstream Cursor README are not bundled.

`setup-pstack`, `make-bot-ui`, and Benny automation are excluded because their
Cursor integrations have no implemented Amp equivalent. References to them in
unchanged upstream text are not available commands. Skip those routes; do not
offer setup, install placeholders, or follow their upstream installation links.

Before writing skills, load Amp's `building-skills`; use `skill-creator` for
evaluation when available. Project skills live in `.agents/skills/`. Follow
`building-skills` for user/global placement. Never edit a materialized cache.
Use a Markdown task list when no todo tool exists.

## Delegation and models

Use the native `Task` tool for bounded assignments within its stated conditions.
`mode: "wait"` blocks until completion. Calls issued together can run concurrently.
Translate background work to `mode: "async"` when the parent has independent work.
Completion arrives as a message. Do not poll or wait on an async worker.
Use `id` to continue a worker when its retained context or local state is needed.
Use a fresh worker for a new independent assignment. Task has no Cursor
`model`, `subagent_type`, `readonly`, `run_in_background`, `resume`,
`environment`, or `file_attachments` fields. Do not pass them or invent aliases.
Give read-only workers explicit no-edit scope; check returned evidence and diffs.
Keep workers' writes disjoint. Do not claim worktree isolation without creating it.

For a poteto delegate, include the resolved `poteto-mode` skill path and
require a full read, including this adapter and applicable principle leaves.
For Comment Sicko, load `no-comments` and supply its sibling
`comment-sicko.md` as the brief. Require a report only.
The parent decides and applies accepted changes.

Upstream model tables and `pstack-models.mdc` do not configure Amp. Default to the
session's native worker model. Report missing model diversity; never label
same-model reviewers as a multi-model panel. If distinct models are essential,
use supported separate threads only when authorized by the user's request and
the thread tool's conditions. Discover modes with `amp.list_agent_modes`; honor
the user's selection and model-cost restrictions. Do not translate Cursor slugs.
Do not launch agents through shell CLI commands.

Separate threads do not inherit code, uncommitted changes, skills already loaded,
or running processes. Establish exact revision, file transfer, environment, and
ownership before delegation. Use `get_thread_status` for liveness and native
message/wait tools for coordination. No guaranteed nesting depth or automatic
restart survival. Use an explicit task-owned path for orchestration state.
If required independence cannot be provided, report the incomplete gate.

## History, tools, and verification

Use the current conversation for current-thread evidence. For other threads,
discover `amp.find_thread`, then use `read_thread` with full context for decisions
and history, or current context only for quick status. Scope searches to the
requested workspace/topic/time range. Cite Amp thread URLs, not Cursor UUIDs.
Do not run Cursor transcript search commands or guess Amp's on-disk history
format. Give reviewers a scoped digest when raw history is unavailable; say
which tool-level claims cannot be verified. An Amp skill call or resource read
counts as skill-use evidence. A summary alone does not prove a tool was used.

Use `shell_command` with an explicit `workdir`, `rg` for exact searches, `finder`
for behavioral code searches, and `view_media` to inspect media. Discover MCP
capabilities with `tool_search` and call through `code_exec`. Read-only scope
does not imply that MCP access disappears. Report unavailable evidence sources.

Cursor team-kit is not bundled. For `deslop`, review the diff for unnecessary
code and run the project's lint. For `control-ui`/`control-cli`, use an installed
verification/browser skill or the actual application CLI. Preserve the real
before/after proof requirement; a mock or compile is not a substitute.
Use `ask_user_choice` only when the user explicitly asked for questions;
otherwise ask needed questions in the final response.

## Authorization and lifecycle

Loading a skill grants no permission to publish, push, open or merge PRs, post
comments, file tickets, deploy, change shared data, or delete existing work.
Carry forward explicit user authorization; ask for any missing permission.
This replaces upstream blanket permission for external actions and automatic
maintenance PRs. Do not reset or overwrite unrelated changes. Preserve explicit
draft-PR requests. Approval gates in workflows remain gates.

For PR comments/reviews and exact-head CI, prefer native GitHub event
subscriptions under Amp's follow-up rules. Subscriptions do not authorize fixes
or pushes. `/loop` is not an Amp command. Only create schedules when the user
asks for scheduling, monitoring, or follow-up; load `building-schedules` first.
Otherwise continue the current task using native waits. Do not promise an
always-on custom mode or background execution after the turn ends.

## Bundled executables

Scripts require their actual runtimes: Bun plus the locked dependencies for
`orch`/`watch-pr`, Node for `check-plan.mjs`, Bash for `log.sh`, and Git/GitHub CLI
authentication for forge queries. Before using `orch` or `watch-pr`, copy the
complete scripts directory to task-owned scratch, install with
`bun install --frozen-lockfile` there, and run that copy with the target repository
as cwd. Never install into the shared skill cache. The skills install
nothing and start no process on their own.

Statechart requires Node, Java 11 or later, and TLC. PNG output also requires
Pele and resvg. Dependency installation is disabled by default, overriding the
upstream skill text. Use provisioned TLA2TOOLS and JAVA paths, or approve the
downloads before setting PSTACK_ALLOW_INSTALL=1 for one command. Set
XDG_CACHE_HOME to task-owned scratch when installing renderer dependencies.
Copy inputs into task-owned scratch too: --out does not relocate adjacent
mapping and model files, and reruns replace generated output. Never overwrite
unrelated files or run against shared skill-cache inputs. Mapping modules are
executable JavaScript; review them and their imports before running them.

The worktree audit fetches remote refs and queries PRs. Its Amp chat-activity
column is unknown; no row is proof that deleting a worktree is safe. Confirm
ownership, active threads, untracked files, and unpushed commits before proposing
cleanup. Deletion needs explicit authorization.
