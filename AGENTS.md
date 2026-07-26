# Repository Guidelines

## Handoff Contract (required)

This repo has `HANDOFF.md` at its root, which means handoffs are **enabled** here.
Work gets banked and logged in the same motion as the change, not as a separate
chore afterwards. This applies to every tool: Codex, ChatGPT, Claude Code, and
Claude desktop.

**Banked** means committed **and** pushed. A dirty tree or an unpushed commit is
not banked.

### On every change, before you finish

1. Commit the work with a real message whose last line is `NEXT: <single next step>`.
2. Capture the short SHA: `git rev-parse --short HEAD`.
3. Prepend a newest-first entry directly under the `## Log` heading in `HANDOFF.md`:

       ### YYYY-MM-DD HH:MM ET · Codex
       - **Changed:** what changed, 1 to 3 lines
       - **Commit:** `<short-sha>`
       - **Next:** the one clear next action
       - **Watch out:** gotcha (optional)

4. Update the "what's next" block at the top of the file **only if the next
   action actually changed**. It frequently holds a standing multi-step work
   order; do not clear or overwrite it for an incidental change.
5. Commit `HANDOFF.md` as `docs: handoff update (<short-sha>)`, then push.

### Rules

- 🛑 **Do not restructure `HANDOFF.md`.** Preserve whatever section headings it
  already uses. A reformat on 2026-07-17 silently broke the vault dashboard's
  parser, which reads these files mechanically.
- **Label every log entry with the tool that wrote it.** Use one of these exact
  strings, after the timestamp and a `·` separator:

  | Label | Use when you are |
  |---|---|
  | `Codex` | OpenAI Codex (CLI or IDE) |
  | `ChatGPT` | ChatGPT, when it authored the change rather than Codex |
  | `Claude Code` | Claude Code CLI or IDE extension |
  | `Claude desktop` | Claude desktop app or claude.ai chat |

  `Claude chat` is the legacy name for `Claude desktop`; leave old entries alone.
  Never omit the label and never invent a new one. The dashboard groups on these
  strings, and collapsing `Codex` into `ChatGPT` loses which tool did what.

- Keep the live `## Log` to the last 15 entries. Move older ones to
  `handoff-archive/YYYY-MM.md` and leave a one-line pointer where they were.
- ⚠️ Never amend or force-push a commit that is already pushed in order to fix
  its message. It is frozen on purpose; correct it in the next entry instead.
- If a push fails (no upstream, auth, conflict), say so plainly and leave the
  commits in place. Do not silently swallow it and do not claim the work is banked.

