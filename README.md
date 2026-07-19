# Flowd

A local-first, frontend-only diagramming canvas built with SvelteKit, TypeScript, Tailwind CSS, and Svelte Flow.

## Interactions

- Right-click empty canvas to create a rectangle.
- Hold right-click to choose a shape from the radial wheel.
- Left-drag from a shape to create an arrow; drop on empty canvas to create and connect a new shape.
- Hold Alt/Option while dragging to move shapes.
- Double-click a shape to edit its text.
- Use the bottom-right buttons for settings and SVG/PNG export.

Standard selection, delete, duplicate, undo/redo, select-all, keyboard movement, middle-mouse pan, Space-drag pan, and wheel zoom shortcuts are supported.

## Commands

```sh
npm run dev
npm run format
npm run lint
npm run check
npm test
npm run build
```

`npm run build` uses `@sveltejs/adapter-static` and writes the Cloudflare Pages-ready site to `build/`.
