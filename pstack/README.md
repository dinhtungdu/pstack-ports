# pstack for Amp

An Amp directory plugin containing pstack's engineering workflows and principles.
It registers 52 qualified skills, including `pstack:poteto-mode`, `pstack:architect`,
`pstack:interrogate`, and `pstack:swarm`. Automatic loading is on for the
WooCommerce monorepo and Gutenberg. An `agent.start` hook asks the agent to load `pstack:poteto-mode`
before each task unless already loaded, respecting explicit user opt-outs.
Other skills and playbooks remain on demand.
It adds no tools or services. The hook supplies instructions, not enforcement.

## Use the port

From the cloned repository root, copy the complete directory into a project's
plugin directory (only if `pstack` is not already installed there):

```sh
mkdir -p /path/to/project/.amp/plugins
cp -R ./pstack /path/to/project/.amp/plugins/pstack
```

For this machine's user-local installation, use `~/.config/amp/plugins/pstack`
instead. For a managed User Plugins repository, copy only this `pstack/` directory
into its root and follow Amp's signed commit and push workflow. Do not copy the
Antigravity or OpenCode bundles into an Amp plugins repository.

Keep the directory named `pstack`: it determines the `pstack:*` skill namespace.
Start a new thread or reload plugins after installation. Publishing this GitHub
repository alone does not install or update the plugin. Skills remain available
for manual loading everywhere. Auto-loading uses a hard-coded GitHub repository list:

- `woocommerce/woocommerce` and `dinhtungdu/woocommerce`
- `WordPress/gutenberg` and `dinhtungdu/gutenberg`

Any matching Git remote, including `upstream`, enables it. HTTPS and SSH remotes
are supported. Worktrees use their active workspace path. Other repositories,
including standalone WooCommerce plugins, remain manual-only.

There are no palette commands or saved-setting checks. Old `pstack.autoLoad`
settings are ignored. The same repository rule runs on Mac, Lima, and orbs;
no local configuration or synchronization is needed. Already-loaded instructions
remain in a thread even if its repository changes.
Ask for `pstack:poteto-help` for guidance, or explicitly opt out for a task or thread.

Existing bare skills such as `architect` are separate installations. This plugin
does not overwrite them. Use `pstack:*` names to select this copy.

## Port boundaries

[AMP.md](AMP.md) defines the translation from Cursor instructions to Amp tools.
Each registered skill includes a local copy so it remains available when the
skill package is materialized separately. The bodies of 52 skills remain verbatim
from upstream, including their model tables. Amp frontmatter normalization and
the adapter preface are generated separately. There are no replacement bodies.

- Native Task delegates inherit the available worker model. Cursor role-model
  rules do not apply. Multi-model review requires explicitly supported threads.
- The adapter maps history and delegation to Amp capabilities. Comment
  Sicko is a worker brief, not a registered custom agent.
- Cursor model setup, bot webhooks, and Benny automation are excluded, along
  with non-Amp plugin manifests and installation docs. The adapter skips their
  references in unchanged upstream skills and guides.
- Scripts never install dependencies automatically. Copy the complete
  `skills/poteto-mode/scripts/` directory to writable scratch and run
  `bun install --frozen-lockfile` there before using `orch` or `watch-pr`.
- The worktree audit reports unknown Amp activity and never labels a row safe
  to delete. It still fetches refs and queries the forge.
- Instructions do not grant publishing, merging, deletion, or shared-write
  authorization. Existing user permissions and Amp's tool rules govern actions.

## Verify changes

From the repository root, run `npm run build`, `bun test ./tests/amp.test.ts`, and
`amp plugins exec ./pstack session.start --data '{"thread":{"id":"test"}}'`.
Run `npm run build` after changing `pstack/AMP.md` to refresh bundled adapters.
The build uses the shared `upstream/` source and rejects skill bodies differing
from `upstream-bodies.json`. See the [repository README](../README.md) for importing
a reviewed upstream checkout and updating the pin. Review resources and scripts
separately; skill-body hashes do not cover those files.

In a scratch copy of `skills/poteto-mode/scripts/`, run
`bun install --frozen-lockfile`, `bun run test`, and `bun run typecheck`.
Live GitHub writes and complete agent-driven workflows are not part of these
local checks.

## Upstream and license

Based on Lauren Tan's pstack 0.15.25 at
[cursor/plugins revision 101b274](https://github.com/cursor/plugins/tree/101b274dd991f694e1f7024be2157e5f3adf07de/pstack).
The [MIT license](LICENSE) and attribution are retained. The original guide and
assets remain as workflow reference. Follow this README and the Amp adapter for
installation and tool usage, not Cursor instructions in upstream reference text.
