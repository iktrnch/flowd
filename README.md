# Flowd

A local-first, frontend-only diagramming canvas built with SvelteKit, TypeScript, Tailwind CSS, and Svelte Flow.

## Interactions

- Right-click empty canvas to create a rectangle.
- Hold right-click to choose a shape from the radial wheel.
- Left-click a shape to select it, and left-drag it to move it.
- Right-drag from a shape to create an arrow; drop on empty canvas to create and connect a new shape.
- Left-drag empty canvas to select an area, and middle-drag to pan.
- Double-click a shape to edit its text.
- Use the bottom-right buttons for settings and SVG/PNG export.

Shape and edge context menus provide mouse-only duplicate, shape-change, and delete actions. The mouse wheel and trackpad zoom the canvas without a modifier key.

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
