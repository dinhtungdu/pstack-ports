# pstack on Amp

This adapter comes with the first pstack skill you load in a thread. It replaces
the Cursor-specific mechanics in the bundled skills and playbooks. Keep their
engineering checks, not their harness API names. The session's tool schemas,
permissions, and user instructions take precedence.

## Skills and resources

Every pstack skill loads as `pstack:<name>` with the `skill` tool, listed or
not. Most skills, including every `principle-*` leaf, are left out of the skill
list on purpose: load them by name when poteto-mode, poteto-help, another skill,
or the user names them. A slash invocation such as `/arena` means the skill
`pstack:arena`, not a shell command. A bare `poteto-mode` or `arena` from another
source, such as Claude Code's plugin cache, is a different copy without this
adapter. Do not use it.

Relative links between skills resolve on disk, because the plugin keeps
upstream's layout: `../<name>/SKILL.md` is a sibling skill, and
`../../docs/guide/` and `../../README.md` are the plugin's guide and README.
Resolve resources against the loaded skill's base directory, never the project's
working directory. Never search the disk for a pstack skill or follow a copy you
find there. Load it with the `skill` tool. If that fails, reload plugins once,
then report it.

These Cursor parts are not shipped, because Amp has no equivalent:
`setup-pstack` and its model rule, `make-bot-ui`, the Benny automations, Custom
Modes, `/loop`,
Bugbot, cloud agents, and the `cursor-team-kit` plugin. When unchanged upstream
text routes to one of them, skip that route with one line saying so. Do not
offer setup, install placeholders, or follow their installation links.

Cursor paths map to Amp ones. A project skill under `.cursor/skills/` goes in
`.agents/skills/`. A user skill under `~/.cursor/skills/` goes in the user's
personal skills repository, per `building-skills`. Always-applied
`.cursor/rules/` text goes in `AGENTS.md`. `~/.cursor/plugins/`,
`~/.cursor/projects/` transcripts, and `~/.cursor/rules/pstack-models.mdc` have
no Amp equivalent. Before writing skills, load Amp's `building-skills`. Never
edit a materialized plugin or skill cache. Use a Markdown task list when no todo
tool exists.

## Delegation and models

Use the native `Task` tool for bounded assignments. `mode: "wait"` blocks until
the worker finishes. Calls issued together run at the same time. Translate
background work to `mode: "async"` when the parent has independent work; its
result arrives as a message, so do not poll or wait on it. Use `id` to continue
a worker only when its retained context or local state is needed. Task has no
Cursor `model`, `subagent_type`, `readonly`, `run_in_background`, `resume`,
`environment`, or `file_attachments` fields. Do not pass them or invent aliases.
Give read-only workers an explicit no-edit scope, check their evidence and
diffs, and keep their writes disjoint. Do not claim worktree isolation without
creating it.

Upstream's per-role subagents map to the plugin's `pstack_agent` tool. Find it
with `tool_search` and call it through `code_exec`. Its `role` picks the model,
from the owner's routing table:

| Role | Upstream role | Model and effort |
| --- | --- | --- |
| `code` | `poteto-agent` for feature, refactoring, bug fix, perf issue, hillclimb | Opus 5.5, high |
| `hardest` | `poteto-agent` for the hardest changes | Fable 5.2, high |
| `mechanical` | `poteto-agent` for trivial mechanical edits | Haiku 5.5, medium |
| `judgment` | judgment and prose | Opus 5.5, medium |
| `swarm-worker` | swarm workers and verification | Sonnet 5.5, medium |
| `history-search` | recall history search, reflect tooling | Haiku 5.5, low, report only |
| `comment-sicko` | Comment Sicko | Sonnet 5.5, medium, report only |
| `reviewer` | reflect reviewers and synthesizer | Opus 5.5, medium, report only |
| `panel-fable`, `panel-opus`, `panel-sonnet` | one seat each on arena, architect, and interrogate panels | Fable 5.2 high, Opus 5.5 medium, Sonnet 5.5 high |
| `judge` | arena cross-judge | Fable 5.2, high, report only |

Use this table instead of upstream's model slugs, `/setup-pstack` rule, and
fast speed. Never use or ask for `xhigh` or `max` effort. A panel of three runs
one agent per panel role. The panels mix three Claude models, not three vendors,
so say so instead of calling them a multi-vendor panel. Arena's judge cannot come
from another vendor than a Claude parent; use `judge` and say so.

The `code`, `hardest`, and `mechanical` agents load `pstack:poteto-mode` before
any work. Every agent runs in a child thread on the same machine and checkout and
sees nothing of this thread, so pass the full brief, including the pstack skills
it needs by full name. For Comment Sicko, also pass `pstack:no-comments`' sibling
`comment-sicko.md` as the brief. Upstream's `run_in_background: true` is
`background: true`, which returns the thread ID at once; collect the report with
`wait_for_threads` and `read_thread`. Calls awaited together with `Promise.all`
run at the same time, so keep their writes disjoint. Report-only agents return a
report; the parent decides and applies accepted changes. Use `Task` for helpers
no role covers; Task workers run on the session's model. Do not launch agents
through shell CLI commands.

Separate threads do not inherit code, uncommitted changes, loaded skills, or
running processes. Establish the exact revision, file transfer, environment, and
ownership before delegating. Use `get_thread_status` for liveness and the native
message and wait tools for coordination. If required independence cannot be
provided, report the incomplete gate.

## History, tools, and verification

Use the current conversation for current-thread evidence. For other threads,
find them with `amp.find_thread`, then use `read_thread` with full context for
decisions and history, or current context for quick status. Cite Amp thread
URLs, not Cursor UUIDs. Do not run Cursor transcript searches or guess Amp's
on-disk history format. An Amp skill call or resource read counts as skill-use
evidence. A summary alone does not prove a tool was used.

Use `shell_command` with an explicit `workdir`, `rg` for exact searches, a
searching subagent for behavioral code searches, and `view_media` for media.
Discover MCP tools with `tool_search` and call them through `code_exec`.

For `deslop`, review the diff for unnecessary code and run the project's lint.
For `control-ui` or `control-cli`, use an installed verification or browser
skill, or the application's real CLI. Keep the real before and after proof; a
mock or a compile is not a substitute. Use `ask_user_choice` only when the user
asked for questions. Otherwise ask in the final response.

## Authorization and lifecycle

Loading a skill grants no permission to publish, push, open or merge PRs, post
comments, file tickets, deploy, change shared data, or delete existing work.
This replaces upstream's blanket permission for external actions and automatic
maintenance PRs. Carry forward explicit user authorization, and ask for any
missing permission. Do not reset or overwrite unrelated changes. Approval gates
in workflows remain gates.

For PR comments, reviews, and exact-head CI, prefer GitHub event subscriptions
under Amp's follow-up rules. Subscriptions do not authorize fixes or pushes.
Create schedules only when the user asks for scheduling, monitoring, or
follow-up, and load `building-schedules` first. Do not promise background work
after the turn ends.

## Bundled executables

Scripts need their real runtimes: Bun and the locked dependencies for
`watch-pr`, Node for `check-plan.mjs`, Bash for `log.sh`, and Git and GitHub CLI
authentication for forge queries. Before using `watch-pr`, copy the whole
`scripts` directory to task-owned scratch, run `bun install --frozen-lockfile`
there, and run that copy with the target repository as the working directory.
Never install into the plugin directory.

Statechart's `scripts/statechart` wrapper runs `statechart.ts` with Node 22.18
to 22.x or 23.6 or later, Bun 1.1.5 or later, or Deno 2. Model checking needs
Java 11 or later and TLC (`tla2tools.jar`). The first-run mise install of Java
and TLC is off, which overrides the skill text: use provisioned `TLA2TOOLS` and
`JAVA` paths, or get approval for the downloads before setting
`PSTACK_ALLOW_INSTALL=1` for one command. Rendering per `references/render.md`
needs `pele@1.9.0` from npm; install it only with approval, in task-owned
scratch outside the repository and the plugin. The statechart test suite is not
shipped. Keep specs, configs, views, and `--out` folders in task-owned scratch.
View modules are executable code, so review them and their imports before
running them.

The worktree audit fetches remote refs and queries PRs. Its chat-activity column
is always unknown in Amp, so no row proves a worktree is safe to delete. Confirm
ownership, active threads, untracked files, and unpushed commits before
proposing cleanup. Deletion needs explicit authorization.
