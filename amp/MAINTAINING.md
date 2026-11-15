# Maintaining the Amp port

The Amp plugin is built in [pstack-ports](https://github.com/dinhtungdu/pstack-ports) as `amp/`, from the same
`upstream/` copy as the Antigravity and OpenCode ports. Edit only its
hand-written files: `index.ts`, `adapter.md`, `README.md`, this file, and
`.gitignore`. `npm run build` generates `skills/`, `docs/`, and `LICENSE`.

## Update from upstream

Run these from the pstack-ports root. They update all three ports at once.

1. Clone upstream into scratch outside the repository:
   `git clone --filter=blob:none https://github.com/cursor/plugins <scratch>`.
2. Review what changed since the pin in the root README:
   `git -C <scratch> log --oneline <pin>..origin/main -- pstack` and
   `git -C <scratch> diff --stat <pin> origin/main -- pstack`. Have a read-only
   subagent review new or changed scripts for installs, network access,
   credentials, and writes outside task scratch.
3. Stage the last commit that touched `pstack`:
   `node scripts/stage-upstream.mjs <scratch> <commit> <empty dir>`. It drops
   Cursor-only parts, applies `scripts/patches/`, and updates
   `upstream-bodies.json`. If a patch fails, merge the upstream change into the
   patch by hand; never copy an old file over a new one. If upstream added or
   removed skills, it stops so you can review them first.
4. Build with `node scripts/build.mjs <empty dir>/pstack`. It fails if the Amp
   plugin passes the hosted limits of 500 files or 25 MiB.
5. Check new and removed skills. A new skill is unlisted in Amp until you add it
   to `listed` in `index.ts`; add it only if an agent should pick it from the
   situation alone. A new Cursor-only skill goes in the exclusion list in
   `scripts/stage-upstream.mjs`, with a line in `adapter.md` and `README.md`.
6. Read the changed skill bodies for new Cursor-only features, tools, or paths,
   and map them in `adapter.md` and the other adapters. When upstream adds or
   renames a subagent role, add it to `routes` in `index.ts` and the table in
   `adapter.md`. The owner's routing rules: Claude models only, effort never
   above `high`, Opus at `high` for code and `medium` for judgment, and small
   models (Haiku, Sonnet) for mechanical, search, and worker roles. Check model
   IDs with `amp plugins show-agent-options --json`.
7. Update the pin and counts in the root README, then run `npm run build`,
   `npm test`, and `npm run lint`.
8. Test the Amp plugin for real. Copy `amp/` to `~/.config/amp/plugins/pstack`
   in a scratch orb, reload plugins, load a listed and an unlisted skill, and run
   one `pstack_agent` role. Delete that copy afterwards, because a system plugin
   masks the published one.
9. Commit. With the owner's approval, push pstack-ports, then publish:
   `amp clone user-plugins`, `node scripts/publish-amp.mjs <clone>`, review the
   diff there, commit, and push. Reload plugins in running threads that need the
   new version.

## Lessons

These come from running and updating pstack on Amp since October 2026. Each
names the thread where it was learned.

### Packaging

- Amp ignores upstream's `disable-model-invocation: true`. It logs "Unknown
  frontmatter field" and lists the skill anyway. Only `registerSkill` with
  `listed: false` keeps a skill out of the list. Its other unknown fields
  (`paths`, `icon`, `color`) are ignored the same way, so `SKILL.md` files are
  copied unchanged.
  ([verdict thread](https://ampcode.com/threads/T-01a1de62-45f5-749e-9a56-417e3987a3e3))
- A listed plugin skill costs more than a personal skill, because its list entry
  adds the file path and plugin name. As personal skills, all 57 pstack skills
  took about 3.7k tokens of every thread's skill list. Keep `listed` short.
  (verdict thread)
- A hosted plugin over 500 files or 25 MiB does not load, and the push still
  succeeds. Upstream's statechart test suite alone is 377 files, so the build
  drops it and fails past the limits. (verdict thread)
- In a plugin, upstream's relative links between skills and to `docs/guide/`
  resolve. Skills repositories install each skill as its own directory, so 52
  sibling links and 10 guide links broke there. Skills repositories also serve
  text only, so the guide images were dropped.
  ([migration](https://ampcode.com/threads/T-01a17849-d32c-742c-adff-e1e6286b4bea))
- One adapter delivered once beats a copy in every skill. 56 copies of a
  129-line adapter loaded again with every skill. The `pstack-amp` skill fixed
  that by hand on Nov 4, and the `tool.result` hook now does it.
  ([Alfred](https://ampcode.com/threads/T-01a17682-22ff-768a-a08a-e24ca053fc19))
- Task subagents share their parent's thread ID in plugin events. A subagent's
  first pstack skill gets the reminder, not the adapter, so the reminder tells it
  to read `adapter.md`. (verdict thread)
- A plugin tool that calls `createAgent(...).createThread` gives upstream's
  per-role subagents back, `poteto-agent` included: the child thread runs on the same machine and checkout,
  gets its own thread ID and so the full adapter, and loads plugin skills. Plugin
  tools are deferred, so the agent finds them with `tool_search` and calls them
  through `code_exec`; `Promise.all` runs delegates at the same time. Create the
  thread and wait with `waitForResponse`, not `run`, so a timeout still returns
  the thread ID. (verdict thread)
- `amp plugins exec` prints no handler result. Test hooks with unit tests that
  call the plugin with a fake API. (verdict thread)
- Plugin precedence is project, system, personal, then workspace. A test copy in
  `~/.config/amp/plugins/pstack` masks the published plugin until deleted.
- Plugins do not load in Puck or Spaces.
- `~/.claude/plugins/cache/` ranks above personal skills. Upstream's Claude Code
  plugin there once masked all 56 Amp skills with copies that lacked the Amp
  adapter and its permission guard. `amp.skills.disableClaudeCodeSkills: true`
  stops that. Plugin skills use `pstack:` names, so a bare `poteto-mode` always
  comes from another source. (Alfred)
- Running threads keep the plugins and skills they started with until they
  reload. Skills materialize only when loaded, so a cache can look stale right
  after a reload. ([0.15.36 update](https://ampcode.com/threads/T-01a189e1-909d-75c6-9cf2-18bb802e3ca8))

### Updating

- Stage from a pinned commit with `git archive`, not from a working tree. The
  build is deterministic; a second run must give byte-identical output.
  ([0.15.32 update](https://ampcode.com/threads/T-01a16cdc-2b09-73cf-8c64-b8c44c76673a))
- Keep the safety changes as patches in `scripts/patches/`. Earlier updates copied the adapted
  `worktree-audit.sh` over upstream, which would have dropped upstream's GNU
  stat fix (#805) if the change had touched kept code. (0.15.32 update)
- Upstream's statechart installs about 305 MB of Java and TLC through mise on
  first run, and its tests call the installers when imported. Hence the install
  gate patch and the dropped test suite. (0.15.32 and 0.15.36 updates)
- Rebuild after every edit. A safety test once failed only because the bundle
  was stale. (0.15.32 update)
- Use Node scripts, not `sed`, for checks. A body check written for GNU `sed`
  silently passed on macOS BSD `sed`. (0.15.36 update)
- Rerun the whole suite before saying it passes. The 0.15.36 update claimed
  367/367 after rerunning only the three tests that had failed.
- `git diff --check` misses untracked files. Check new files with
  `git diff --no-index --check /dev/null <file>`. (0.15.32 update)
- Upstream changed far less than a brief claimed once: 8 of 56 bodies, not all
  56. Measure the diff before planning the update. (0.15.36 update)
- `amp clone` uses the signed-in account. Copy out before switching accounts, or
  a push goes to the wrong repository.
  ([Amp port addition](https://ampcode.com/threads/T-01a1af99-6236-7256-a2c9-a5ae7fcc1a43))
- Scheduled maintenance never publishes. Pushing the plugin or pstack-ports
  needs the owner's explicit approval. (0.15.32 update)

### Using

- Name pstack skills by their full name in briefs. A thread told only "use
  poteto-mode" did not load the skill, searched the disk, and followed a stale
  draft it found instead. The adapter now forbids following disk copies.
  (Alfred)
- Reload before calling a skill missing. Lima's "plugin skills are not listed"
  report turned into 58 listed `pstack:*` skills after `reload_skills`, after a
  bug report had already been drafted. (Alfred)
- Subagents run on the thread's model. Same-model reviewers are not a
  multi-model panel, so report the missing diversity. (adapter)
- Loading a skill grants no permission to push, post, or open PRs. Upstream's
  Claude Code adapter lacks this guard, which matters most for security work.
  (Alfred)
