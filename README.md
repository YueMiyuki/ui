# miyuki-ui

React components for Next.js and Tailwind CSS v4, installed with the shadcn CLI. Each component is a file you copy into your project and own.

## Use a component

```bash
npx shadcn@latest init
npx shadcn@latest registry add @miyuki-ui=https://ui.miyuki-yue.dev/r/{name}.json
npx shadcn@latest add @miyuki-ui/button
```

Components install to `components/miyuki-ui/`, beside shadcn's `components/ui/`, and never overwrite shadcn's files. Shared helpers go to `components/miyuki-ui/lib/`. `npx shadcn@latest add @miyuki-ui/theme` applies the full palette.

## Work on the library

```bash
pnpm install
pnpm dev              # registry watcher and the docs site on http://localhost:3210
pnpm registry         # rebuild the catalogue, registry.json and public/r once
pnpm registry:shadcn  # rebuild public/r with the official shadcn builder, to compare
pnpm thumbs           # re-shoot the gallery pictures in public/thumbs (needs pnpm dev running)
pnpm art              # render the demo pictures to public/art (needs pnpm dev running)
pnpm typecheck
pnpm lint
```

`pnpm build` writes `https://ui.miyuki-yue.dev` into `registry.json` and `public/r`; `pnpm dev` and `pnpm registry` write `http://localhost:3210` so the CLI can be tried against the local server. Set `MIYUKI_SITE_URL` to build for another address.

Source lives in `src/components/miyuki-ui/<slug>.tsx`, with catalogue entries and demos in `src/registry/items/<slug>/`.

## Licence

MIT. See [LICENSE](LICENSE).
