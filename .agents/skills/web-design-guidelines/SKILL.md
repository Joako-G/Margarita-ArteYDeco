---
name: web-design-guidelines
description: Review Margarita Arte & Deco UI code for accessibility, responsive behavior, usability, and Web Interface Guidelines compliance. Use when asked to review the UI or UX, check accessibility, audit design, or verify frontend best practices. Treat AGENTS.md and docs/ as higher-priority project requirements.
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read `AGENTS.md`, `docs/DESIGN-SYSTEM.md`, `docs/CONVENTIONS.md`, and the relevant frontend or admin specification.
2. Fetch the latest external guidelines from the source URL below.
3. Read the specified files or infer the smallest relevant scope from the request.
4. Check accessibility, responsive behavior, usability, project consistency, and applicable external rules.
5. Output findings in Spanish using concise `file:line` references, severity, impact, and an actionable recommendation.

## Guidelines Source

Fetch fresh guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use the available web browsing tool to retrieve the latest rules. If external access is unavailable, disclose that limitation and complete the review using the repository documentation and established web standards.

## Project precedence

- `AGENTS.md` and the ordered documents under `docs/` override external guidelines.
- Do not recommend Tailwind, shadcn/ui, another icon library, dark mode, or new dependencies.
- Require 44×44px interactive areas, WCAG AA contrast, visible focus, keyboard support, informative `alt`, and reduced-motion handling.
- Distinguish documented violations from optional improvements.
- A review request is read-only unless the user also asks to implement fixes.

## Usage

When a user provides a file or pattern argument:
1. Fetch guidelines from the source URL above
2. Read the specified files
3. Apply all rules from the fetched guidelines
4. Output findings using the format specified in the guidelines

If no files are specified, infer the relevant changed files or feature directory when the scope is clear. Ask only when multiple materially different scopes remain.
