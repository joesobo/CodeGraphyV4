# CodeGraphy website

The public CodeGraphy website is a Next.js application in the CodeGraphy pnpm workspace.

## Local development

Run these commands from `apps/web`:

```sh
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

The site uses `https://codegraphy.dev` as its default public origin. Set
`NEXT_PUBLIC_SITE_URL` only when a deployment needs a different canonical origin.

## Vercel project settings

Import the `joesobo/CodeGraphyV4` repository as a Vercel monorepo project with these settings:

- Root Directory: `apps/web`
- Framework Preset: Next.js
- Production Branch: `main`
- Include source files outside the Root Directory: enabled
- Install Command: use Vercel automatic detection
- Output Directory: use the Next.js default

`vercel.json` runs the filtered Turbo build from the repository root. This builds workspace
dependencies before the website.

After the first production deployment, add `codegraphy.dev` and `www.codegraphy.dev` in the
project domain settings. Choose one as the primary domain and redirect the other to it.
