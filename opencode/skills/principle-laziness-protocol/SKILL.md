---
name: principle-laziness-protocol
description: "Apply when refactoring, evaluating diff size, or tempted to add abstractions, layers, or signal threading. Bias toward deletion and the smallest change that solves the problem."
metadata:
  opencode/slash: "true"
---

**OpenCode port.** Read [harness-adapter.md](harness-adapter.md) before following this skill. It replaces Cursor tool, model, history, scheduling, and authorization instructions below.


# Laziness Protocol

- **Consolidate decisions.** Do not repeat the same choice in several places. Put it behind one source of truth and pass the result as a simple flag.
- **Minimize the diff.** Make the smallest change that solves the problem. Fewer lines beat "elegant" boilerplate.
