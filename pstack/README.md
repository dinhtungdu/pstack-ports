# pstack for Amp

pstack's engineering workflows and principles as 56 Amp skills, published to the
personal Amp skills repository (`https://ampcode.com/git/@000/-/skills`). Skills
use bare names, such as `poteto-mode`, `architect`, `interrogate`, and `swarm`,
and load on demand. They add no tools, hooks, services, or project-specific
behavior.

## Publish

`skills/` holds one self-contained directory per skill, each named after its
frontmatter `name`, with its own adapter and license. Amp serves text files only
and installs each skill as a separate directory, so skills cannot share files.

After `npm run build` and the checks below, copy the skills into the canonical
clone of the personal skills repository:

```sh
node scripts/publish-amp.mjs ~/.cache/amp/repositories/ampcode.com-user-skills
```

The script replaces only the directories of skills built here. Delete skills
retired upstream from the clone by hand. Review the diff, commit, and push there.
New threads pick up pushed skills; existing threads need `reload_skills`.

A local skill with the same name, for example in `~/.agents/skills`, masks the
published copy. Remove or move such copies. Ask for `poteto-mode` to use the
workflow or `poteto-help` for guidance.

## Port boundaries

[AMP.md](AMP.md) defines the translation from Cursor instructions to Amp tools.
Each skill includes a local copy of the adapter. The bodies of 56 skills remain
verbatim from upstream, including their model tables. Amp frontmatter normalization and
the adapter preface are generated separately. There are no replacement bodies.

- Native Task delegates inherit the available worker model. Cursor role-model
  rules do not apply. Multi-model review requires explicitly supported threads.
- The adapter maps history and delegation to Amp capabilities. Comment
  Sicko is a worker brief, not a registered custom agent.
- Cursor model setup, bot webhooks, and Benny automation are excluded, along
  with non-Amp plugin manifests and installation docs. The adapter skips their
  references in unchanged upstream skills and guides.
- Scripts do not install dependencies by default. Copy the complete
  `skills/poteto-mode/scripts/` directory to writable scratch and run
  `bun install --frozen-lockfile` there before using `orch` or `watch-pr`.
- Statechart needs Java and TLC. PNG output also needs Pele and resvg.
  Provision dependencies explicitly, or approve the downloads and set
  `PSTACK_ALLOW_INSTALL=1` for that command. Keep inputs and `XDG_CACHE_HOME` in
  task-owned scratch. The adapter overrides upstream's automatic-install text.
- The worktree audit reports unknown Amp activity and never labels a row safe
  to delete. It still fetches refs and queries the forge.
- Instructions do not grant publishing, merging, deletion, or shared-write
  authorization. Existing user permissions and Amp's tool rules govern actions.

## Verify changes

From the repository root, run `npm run build`, `npm test`, and `npm run lint`.
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

Based on Lauren Tan's pstack 0.15.32 at
[cursor/plugins revision 9580c23](https://github.com/cursor/plugins/tree/9580c23696ac8d7abed0c166f2f9918800afb819/pstack).
The [MIT license](../LICENSE) and attribution are retained in every skill. The
original guide pages ship in `poteto-help/docs/guide/` as workflow reference,
without images. Follow this README and the Amp adapter for installation and tool
usage, not Cursor instructions in upstream reference text.
