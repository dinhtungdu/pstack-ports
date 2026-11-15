# Pstack ports

Pstack's 56 engineering skills and 23 playbooks, packaged for
[Amp](amp/README.md), [Antigravity](antigravity/README.md), and
[OpenCode V2](opencode/README.md). The Antigravity and OpenCode ports each add a
harness adapter and six native agent roles. The Amp port is a directory plugin
with an adapter, hidden principle skills, and a `pstack_agent` tool that routes
subagent roles to Claude models. No package dependencies
are needed to build or load these ports. Bundled helper scripts have their own
runtime dependencies.

## Install a port

Clone this repository, then follow the port's README:

- [Install Amp](amp/README.md): directory plugin, published to an Amp plugins
  repository with `node scripts/publish-amp.mjs <clone>`.
- [Install Antigravity](antigravity/README.md): native directory plugin.
- [Install OpenCode](opencode/README.md): native V2 JavaScript setup/transform plugin.

Nothing installs globally on its own. All ports load workflows on demand,
without project-specific behavior. Existing user permissions remain authoritative. Cursor setup,
webhook automation, and Cursor model configuration do not execute in any port.

## Build and verify

Use Node 22 or newer. From this repository root:

```sh
npm run build
npm test
npm run lint
```

Edit `antigravity/ADAPTER.md`, `opencode/ADAPTER.md`, `agents.json`, or the
hand-written Amp files (`amp/index.ts`, `amp/adapter.md`, `amp/README.md`,
`amp/MAINTAINING.md`), then rebuild.
Do not edit generated skills or generated agent definitions. Tests verify body
hashes, complete resources, model inheritance, and preservation of user settings.

`upstream/` is the maintained source. The build makes three self-contained bundles,
without symlinks or runtime access to `upstream/`. Keeping a single runtime shared
directory was rejected because copying an Antigravity plugin must not break it.
The OpenCode plugin registers skills and agents in memory instead of copying
files into the user's configuration directory. V1 is not supported.

To upgrade from upstream, stage the last `cursor/plugins` commit that touched
`pstack`, then build from the staged copy:

```sh
node scripts/stage-upstream.mjs /path/to/cursor-plugins <commit> /tmp/empty-dir
node scripts/build.mjs /tmp/empty-dir/pstack
```

Review the upstream changes first, including resource and script changes,
because the hash manifest verifies skill bodies, not every bundled script. The
staging script drops `setup-pstack`, `make-bot-ui`, `docs/harness`, and the
Benny automations, applies the safety patches in `scripts/patches/`, keeps each
skill's normalized frontmatter with upstream's new description, and rewrites
`upstream-bodies.json`. If a patch fails, merge the upstream change into the
patch rather than copying an old file over the new one. It stops when upstream
adds or removes a skill, so you can review it and update the counts. Then update
the pin below and run the checks above. [`amp/MAINTAINING.md`](amp/MAINTAINING.md)
has the full procedure and the lessons from earlier updates.

Weekly updates run through an Amp schedule in the
[upstream maintenance thread](https://ampcode.com/threads/T-01a16cdc-2b09-73cf-8c64-b8c44c76673a).
It reviews upstream changes, updates this checkout, rebuilds all three bundles,
and reports verification. It does not push or publish the Amp plugin.
The local runner must be available for the scheduled run.

## Sources and limits

Based on Lauren Tan's pstack 0.15.42 at
[cursor/plugins revision bf0c7cd](https://github.com/cursor/plugins/tree/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack),
seeded from the reviewed Amp port at
[amp-plugins revision 620fcf1](https://github.com/dinhtungdu/amp-plugins/commit/620fcf1420fb97c3f5685f6124de8e9136a222d5).
The skill bodies remain verbatim. Resources retain that port's script safety
adaptations and require explicit opt-in for statechart dependency downloads.
The original guide describes Cursor; use each port's README and
adapter for installation and harness behavior. MIT attribution is retained.

Guidelines consulted on 2026-10-19:

- Antigravity: [plugins](https://antigravity.google/docs/plugins),
  [skills](https://antigravity.google/docs/skills), and
  [custom subagents](https://antigravity.google/docs/subagents).
- OpenCode: [V2 documentation](https://opencode.ai/v2/docs/).
- OpenCode V2 2.0.32 contracts: [plugin definition](https://github.com/anomalyco/opencode/blob/815de9950b205cd734c9962c4629b07d3b83ee07/packages/plugin/src/promise/plugin.ts),
  [skill registration](https://github.com/anomalyco/opencode/blob/815de9950b205cd734c9962c4629b07d3b83ee07/packages/plugin/src/promise/skill.ts),
  [agent configuration](https://github.com/anomalyco/opencode/blob/815de9950b205cd734c9962c4629b07d3b83ee07/packages/core/src/config/plugin/agent.ts),
  and [subagent parameters](https://github.com/anomalyco/opencode/blob/815de9950b205cd734c9962c4629b07d3b83ee07/packages/core/src/tool/plugin/subagent.ts).

Antigravity CLI 1.4.1 passes strict plugin validation and discovers all 57 skills
and six agents after an isolated native install. Its validator also accepts
installed agents after applying flash and pro routing settings. These checks
do not invoke a model or prove App delegation. OpenCode V2 2.0.32 and 2.2.5 load
all 57 skills and six agents in an isolated server. Their native configuration
keeps model, variant, system prompt, disabled-agent, and permission overrides.
Run this check with `OPENCODE_V2_BIN=/absolute/path/to/v2/opencode npm test`.
On 2.2.5, a native per-agent model and variant override were applied to subagent
session records, so the override mechanism was observed end to end. Plugin and
settings-file routing were also observed: routed agents reported the configured
model, and native per-agent configuration still won. Out of the box the port
writes no model defaults; agents inherit the invoking parent's model until a
user opts into routing. Paid provider routing remains unverified. Configuration
checks alone do not prove model-driven workflows.
