# Patterns

Modular, on-demand coding conventions. Each file in this directory captures one
cohesive pattern group. They are loaded by opencode via the `instructions` array
in `.opencode/opencode.json`.

## When to add a pattern

Add a new file when a rule set:

- Is non-trivial (more than a one-liner).
- Stands on its own and is reusable across multiple files/agents.
- Benefits from being a single, readable reference the model can pull from.

Avoid splitting trivial rules into their own file — keep them inline in
`AGENTS.md` instead.

## Naming

- `kebab-case.md`
- Prefer topic-first names: `angular-components.md`, not `inputs.md`.
- Keep one cohesive group per file. If a group grows large, split by concern
  (e.g. `angular-components-inputs.md`, `angular-components-state.md`).

## Authoring checklist

- Start with a short one-line summary of the rule.
- Use fenced `typescript` (or `bash`, `json`, etc.) blocks for code.
- Mark each snippet with `// ✅` (do this) or `// ❌` (do not do this).
- Include the rationale inline where it is not obvious from the example.
- Cross-link related patterns at the bottom when useful.
