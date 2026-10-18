# Pstack ports

Pstack's 52 engineering skills and 23 playbooks, packaged for
[Amp](pstack/README.md), [Antigravity](antigravity/README.md), and
[OpenCode 1.14.30](opencode/README.md). Each port adds a harness adapter;
Antigravity and OpenCode also add six native agent roles. No package dependencies
are needed to build or load these ports. Bundled helper scripts have their own
runtime dependencies.

## Install a port

Clone this repository, then follow the port's README:

- [Install Amp](pstack/README.md): native directory plugin, named `pstack`.
- [Install Antigravity](antigravity/README.md): native directory plugin.
- [Install OpenCode](opencode/README.md): native JavaScript config-hook plugin.

Nothing installs globally on its own. All ports load workflows on demand,
without project-specific behavior. Existing user permissions remain authoritative. Cursor setup,
webhook automation, and Cursor model configuration do not execute in any port.

## Build and verify

Use Node 22 or newer and Bun for the Amp tests. From this repository root:

```sh
npm run build
npm test
npm run lint
```

Edit `pstack/AMP.md`, `antigravity/ADAPTER.md`, `opencode/ADAPTER.md`, or `agents.json`, then rebuild.
Do not edit generated skills or generated agent definitions. Tests verify body
hashes, complete resources, model inheritance, and preservation of user settings.
Amp registers skills and includes worker briefing templates, not the
six native agent definitions used by the other ports.

`upstream/` is the maintained source. The build makes three self-contained bundles,
without symlinks or runtime access to `upstream/`. Keeping a single runtime shared
directory was rejected because copying an Antigravity plugin must not break it.
The OpenCode plugin adds a skills path and agents in memory instead of copying
files into the user's configuration directory.

To reimport the pinned version from a reviewed Cursor or Amp pstack checkout:

```sh
node scripts/build.mjs /absolute/path/to/pstack
```

The importer rejects bodies that differ from `upstream-bodies.json`. For an
upstream upgrade, review the new source first, then deliberately update that
manifest and the pin below. Review resource and script changes separately.
The hash manifest verifies skill bodies, not every bundled script.

## Sources and limits

Based on Lauren Tan's pstack 0.15.25 at
[cursor/plugins revision 101b274](https://github.com/cursor/plugins/tree/101b274dd991f694e1f7024be2157e5f3adf07de/pstack),
seeded from the reviewed Amp port at
[amp-plugins revision 620fcf1](https://github.com/dinhtungdu/amp-plugins/commit/620fcf1420fb97c3f5685f6124de8e9136a222d5).
The skill bodies remain verbatim. Resources include that port's script safety
adaptations. The original guide describes Cursor; use each port's README and
adapter for installation and harness behavior. MIT attribution is retained.

Guidelines consulted on 2026-10-17:

- Antigravity: [plugins](https://antigravity.google/docs/plugins),
  [skills](https://antigravity.google/docs/skills), and
  [custom subagents](https://antigravity.google/docs/subagents).
- OpenCode: [plugins](https://opencode.ai/docs/plugins/),
  [skills](https://opencode.ai/docs/skills/), and
  [agents](https://opencode.ai/docs/agents/).
- Version-specific OpenCode contracts: [plugin initialization](https://github.com/anomalyco/opencode/blob/v1.14.30/packages/opencode/src/plugin/index.ts),
  [skill discovery](https://github.com/anomalyco/opencode/blob/v1.14.30/packages/opencode/src/skill/index.ts),
  [agent configuration](https://github.com/anomalyco/opencode/blob/v1.14.30/packages/opencode/src/agent/agent.ts),
  and [task parameters](https://github.com/anomalyco/opencode/blob/v1.14.30/packages/opencode/src/tool/task.ts).

Antigravity CLI 1.4.1 passes strict plugin validation and discovers all 52 skills
and six agents after an isolated native install. Its validator also accepts
installed agents after applying flash and pro routing settings. These checks
do not invoke a model or prove App delegation. OpenCode model calls and paid
provider routing also remain unverified. Configuration checks alone do not
prove model-driven workflows.
