# pstack for Amp

Lauren Tan's [pstack](https://github.com/cursor/plugins/tree/main/pstack)
engineering workflows and principles, ported from Cursor to Amp. It registers 56
skills named `pstack:<name>`. The skill bodies are upstream's text, unchanged.
It is built in [pstack-ports](https://github.com/dinhtungdu/pstack-ports), whose README names the upstream
version and commit.

## Use it

Start a task with `/poteto-mode` or "use `pstack:poteto-mode`". Ask
`pstack:poteto-help` which skill fits a situation. A `/name` or `pstack:name` in
your message makes the agent load that skill.

Only 14 skills are in the skill list every thread sees, the ones an agent should
pick from the situation alone: poteto-mode, poteto-help, how, why, teach,
recall, tdd, unslop, technical-writing, typescript-best-practices,
benchmark-checklist, blast-radius, interrogate, and statechart. The other 42,
including every `principle-*` leaf, load by name when a skill or you name them.
Upstream hides them the same way in Cursor.

The first pstack skill loaded in a thread brings [`adapter.md`](adapter.md),
which maps Cursor tools, models, history, scheduling, and permissions to Amp.
Later loads add a one-line reminder instead.

The `pstack_agent` tool runs upstream's subagents, such as `poteto-agent`,
panel seats, reviewers, and the arena judge, on the model for their role. It
uses Claude models only and never more than high effort. Opus runs at high for
code and medium for judgment. The full table is in [`adapter.md`](adapter.md)
and comes from `routes` in [`index.ts`](index.ts). Each agent runs in a child
thread on the same machine and checkout. It waits for the report, or with
`background: true` returns the thread ID at once.

## What differs from Cursor

These Cursor parts are not shipped, because Amp has no equivalent:

- `setup-pstack` and its per-role model rule. The owner's routing table in
  `index.ts` replaces it.
- `make-bot-ui` and the Benny automations.
- Custom Modes, `/loop`, Bugbot, cloud agents, and the `cursor-team-kit` plugin.
- The Cursor README, logo, harness guide, and statechart test suite.

Three upstream scripts are patched so they never install into the plugin or call
a worktree safe to delete. The patches are in
[`scripts/patches/`](https://github.com/dinhtungdu/pstack-ports/tree/main/scripts/patches) in pstack-ports.

Plugins do not load in Puck or Spaces, so pstack is not available there.

To update or change the port, read [`MAINTAINING.md`](MAINTAINING.md).
