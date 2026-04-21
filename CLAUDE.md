# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev       # Start dev server at localhost:4321
npm run build     # Build production site to ./dist/
npm run preview   # Preview production build locally
npm run astro ... # Run Astro CLI commands (e.g. astro add, astro check)
```

Requires Node >=22.12.0.

## Architecture

This is an [Astro](https://astro.build) v6 project (static site generator). Key conventions:

- **`src/pages/`** — File-based routing. Each `.astro` file becomes a route.
- **`src/layouts/`** — Reusable page shells. Components use `<slot />` to inject content.
- **`src/components/`** — Reusable `.astro` components.
- **`src/assets/`** — Images and other assets processed by Astro's asset pipeline.
- **`public/`** — Static files served as-is (favicons, etc.).

Astro's component syntax uses a frontmatter fence (`---`) for server-side JavaScript/TypeScript, followed by HTML-like template markup. No framework (React, Vue, etc.) is currently integrated — components are pure Astro.
