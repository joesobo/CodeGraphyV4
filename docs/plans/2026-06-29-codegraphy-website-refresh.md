# CodeGraphy Website Refresh Plan

## Purpose

Build and ship a first-pass public CodeGraphy website while using the work as a
frontend refresh project for interview preparation.

The site should be simple, polished, and honest. It should explain what
CodeGraphy does, show real product visuals, make installation obvious, point to
the right docs, and give the project a professional web presence. The learning
path should make each frontend decision visible instead of hiding the work behind
one large generated implementation.

## Current Direction

- Use Next.js for the fresh website pass.
- Start a fresh PR and use the older `codex/codegraphy-website` work only as a
  reference and critique target.
- Do not include auth, sign-in, payments, subscriptions, private plugin flows,
  or account management in this first pass.
- Let each commit represent one website step or one frontend-refresh lesson.
- Codex may draft code, but the user reviews, cleans up, and decides what gets
  committed.
- Host the site end to end, including the purchased domain, after the first pass
  is polished locally.

## Product Scope

The first-pass website should cover:

- What CodeGraphy is.
- How the VS Code extension works.
- Why a Relationship Graph helps people understand and change a workspace.
- How to install the extension.
- How built-in plugins and the plugin API extend the graph.
- What languages and example workspaces are covered.
- Where to find GitHub, VS Code Marketplace, package, and documentation links.
- Real screenshots or GIFs showing CodeGraphy features in action.

## Audience

Primary:

- Developers who may install the VS Code extension.
- Hiring teams evaluating frontend/product judgment from a real public project.
- The user, as a hands-on frontend refresher before interviews.

Secondary:

- Plugin authors.
- Open-source contributors.
- Users trying to understand whether CodeGraphy is local-first and safe to try.

## Design Inspiration

Use Nuxt and Factorio as reference points, not as templates to copy.

Nuxt contributes:

- Clean developer-product structure.
- Confident framework/ecosystem presentation.
- Clear docs, install, and module/ecosystem paths.
- Polished but restrained visual design.

Factorio contributes:

- Direct product storytelling.
- Media-heavy proof of what the product actually does.
- Practical navigation to docs, community, downloads, and examples.
- A professional site that does not over-explain itself like generic SaaS.

CodeGraphy's site should feel clean, straightforward, visual, and technical. It
should not feel like an enterprise SaaS funnel.

The refined visual direction is more developer-tool focused than the rough
website branch. The site should feel like a serious tool for people who work in
editors, terminals, docs, and code review all day. It can borrow polish from
developer framework sites, but the final result should be recognizably
CodeGraphy rather than a uniform template.

## Working Principles

Move slowly and make the frontend reasoning explicit. Each work session should
teach or reinforce one narrow frontend concept before moving to the next one.
When Codex drafts code, the user should be able to read it, explain it, clean it
up, and defend the structure in an interview.

Code quality matters as part of the portfolio value:

- Prefer small, named components with clear responsibilities.
- Keep content data, layout components, and low-level UI primitives separate.
- Organize files by website section or behavior, not by junk-drawer folders.
- Make component names explain what the component does in the page.
- Use TypeScript types where they clarify component contracts.
- Avoid clever abstractions until repetition proves they are useful.
- Keep rendered HTML semantic and accessible from the start.
- Make CSS structure readable enough to show during an interview.

Style library direction:

- A style library is allowed if it helps with accessibility, primitives, or
  velocity.
- Do not let a component library dictate the site's personality.
- Prefer composable primitives over a full predesigned template.
- If using shadcn/Radix-style pieces, treat them as accessible building blocks
  and restyle them into CodeGraphy's own visual system.
- Decide on the library during the scaffold step, before building real sections.

Style system direction:

- Keep Tailwind and shadcn for the first pass; defer StyleX unless the site
  grows enough that Tailwind class strings become a real maintainability issue.
- Avoid one-off arbitrary Tailwind values such as `p-[17px]`,
  `text-[13px]`, or `bg-[#123456]` in ordinary page code.
- Prefer the shared Tailwind scale, CSS variables in `globals.css`, and
  component variants for spacing, color, radius, and typography decisions.
- Let `components/ui/*` define reusable primitive variants, such as button
  size and intent.
- Let page sections use named components once patterns repeat, instead of
  copying long class strings between sections.
- Allow rare arbitrary values for structural layout constraints when the
  Tailwind scale cannot express the design cleanly; keep those visible and
  easy to justify during review.
- The goal is not a heavy design system. The goal is a small, boring,
  reusable set of CodeGraphy decisions that keeps the site from drifting into
  random values.

## Website App Structure

Use the standard Next.js App Router package shape without a `src/` folder for
this first pass:

- `app/` owns routing, layouts, metadata, route-level pages, and global CSS
  imports required by Next.js.
- `app/layout.tsx` owns shared public-site chrome such as the header and
  primary nav while every route is part of the same simple public website.
- `app/page.tsx` owns the `/` home page route.
- `app/docs/page.tsx`, `app/plugins/page.tsx`, and `app/examples/page.tsx`
  own the first secondary routes.
- `components/site/navigation.tsx` owns the shared public-site navbar.
- `components/site/site-links.ts` owns shared public-site hrefs and primary
  navigation link labels.
- `components/site/link.tsx` owns internal vs external link behavior so
  GitHub and Marketplace links get safe defaults consistently.
- `components/site/page-header.tsx` owns the shared introductory page shell
  used by lightweight public-site routes such as `/docs`, `/plugins`, and
  `/examples`.
- `components/ui/` owns local shadcn UI primitives such as `button.tsx` and
  `navigation-menu.tsx`.
- `lib/` owns small framework-agnostic helpers, currently the `cn` class-name
  merge helper used by shadcn-style components.
- Colocated `*.test.tsx` files own component-level Vitest coverage when a
  component has behavior worth protecting.

For the scaffold, keep the `HomePage` route component directly in
`app/page.tsx`. Extract named section components only when the page has real
structure worth naming, such as `Hero`, `FeatureGrid`, `InstallPanel`, or
`MediaGallery`.

Future page examples:

```
app/
  layout.tsx
  page.tsx                    # /
  docs/page.tsx               # /docs
  plugins/page.tsx            # /plugins
  examples/page.tsx           # /examples
components/
  site/
    link.tsx
    navigation.tsx
    page-header.tsx
  ui/
    button.tsx
    navigation-menu.tsx
```

First-pass page map:

- `/` Home: what CodeGraphy is, product screenshots, install CTAs, GitHub and
  Marketplace links, and a short explanation of the Relationship Graph.
- `/docs` Docs hub: links to existing repo docs for core, extension, plugins,
  plugin API, examples, and MCP rather than a full documentation rewrite.
- `/plugins` Plugins: one dense index page with a section for each built-in
  plugin. A page-local nav, dropdown, or jump list should scroll to each plugin
  section by anchor rather than creating thin per-plugin pages for v1.
- `/examples` Language Examples: one dense index page with a section for each
  supported language/example workspace. Each section should show the matching
  example, a real screenshot when available, and a concise list of what
  CodeGraphy currently supports for that language.

Changelog and About are optional later pages, not v1 requirements. Prefer
linking to GitHub Releases or a generated changelog before adding a manual
`/changelog` page that can go stale. Keep project story/about copy on the home
page or footer until it earns a dedicated route.

No filler page rule:

- Do not create per-plugin or per-language detail pages just to make the site
  feel larger.
- Prefer long, useful index pages with anchor navigation while each section is
  still short.
- Split a section into its own route only after it has enough content,
  screenshots, install notes, examples, and docs links to stand on its own.

Navigation component direction:

- Use local shadcn primitives for reusable UI behavior, then compose them in
  CodeGraphy-specific site components.
- Use `NavigationMenu` for the primary nav so the navbar has the same base
  semantics and interaction model it will need if dropdowns are added later.
- Use `Button asChild` for navigation actions so links remain real anchors
  while taking on button styling.
- Do not use a route group until the app has multiple layout families, such as
  a docs layout that differs meaningfully from the home/plugins/examples
  layout. For this first pass, removing `(site)` makes `app/page.tsx` easier to
  teach and review.

Frontend tests should focus on durable behavior and contracts, not fragile page
copy. Avoid broad page tests that fail whenever public-site copy changes. Test
local primitives or components when CodeGraphy adds behavior or relies on a
contract, such as the `Button` primitive's `asChild` link behavior.

The empty `src/` folder from the older package-style web target is intentionally
removed. If the project later chooses `src/`, move the whole Next app shape
under `src/app`, `src/components`, and `src/lib` in one explicit migration.

Package-owned commands should live in `apps/web/package.json`. Avoid adding
root-level `web:*` shortcuts unless repeated day-to-day use proves they are
worth the extra monorepo surface area.

## Information Architecture

First pass can be a focused home page plus a few lightweight public-site pages.

Recommended sections:

1. Header
   - Logo/name.
   - Anchor links for Features, Plugins, Examples, Docs, Install.
   - GitHub and Marketplace actions.

2. Hero
   - One-sentence product explanation.
   - Primary install CTA.
   - Secondary GitHub CTA.
   - Large real CodeGraphy visual.

3. How It Works
   - Open a workspace.
   - Build the Relationship Graph.
   - Tune Graph Scope, search, filters, and view modes.
   - Use the graph to understand or change code.

4. Product Features
   - Sidebar and editor graph views.
   - Search and filtering.
   - Graph Scope.
   - 2D and 3D views.
   - Depth mode and focus workflows.
   - Export/share visuals if current behavior is strong enough to show.

5. Plugins and Language Coverage
   - Explain built-in plugins.
   - Explain that plugins can add node and edge types.
   - Link to the `/plugins` page for plugin-by-plugin detail.
   - Link to plugin docs and plugin API docs.
   - Link to the `/examples` page for language-by-language proof.

6. Language Examples
   - Use real screenshots/GIFs from CodeGraphy running on supported example
     workspaces.
   - Organize by language and supported plugin.
   - Include concise support notes for each language, such as files, imports,
     symbols, routes, scenes, assets, or other graph concepts where applicable.
   - Favor proof over decorative mockups.
   - Include captions that explain what the viewer is seeing.

7. Install and Docs
   - VS Code Marketplace link.
   - GitHub link.
   - Copyable install commands only where the command is real and useful.
   - Links for core, extension, plugins, plugin API, examples, and MCP if useful.

8. Final CTA
   - Install CodeGraphy.
   - Explore GitHub.

## Screenshot and GIF Checklist

Capture real product media before final design polish:

- Hero-quality Relationship Graph screenshot.
- Sidebar mode in VS Code.
- Expanded editor graph view.
- Search narrowing the graph.
- Graph Scope toggling node or edge types.
- Depth mode around a selected node.
- 2D and 3D view comparison if both are visually clear.
- Plugin panel or plugin-provided graph concepts.
- Example workspace gallery shots:
  - CodeGraphy itself.
  - A Next or Nuxt-style web app if available locally.
  - A Godot project if plugin visuals are strong.
  - A compact Rust or TypeScript project if it produces a readable graph.

Media rules:

- Prefer latest local CodeGraphy build.
- Use real UI, not recreated product mockups.
- Keep captions factual.
- Store source screenshots separately from optimized public assets.
- Optimize public assets before shipping.

## Frontend Refresh Learning Path

Each step should include a short explanation of why the frontend decision matters
and what tradeoffs are being made.

1. Project Scaffold
   - Next.js app shape.
   - App Router basics.
   - Package scripts and monorepo wiring.
   - Why this belongs in `apps/web`.

2. Content Model
   - Turn site sections into typed data.
   - Separate durable copy/data from presentational components.
   - Decide when a component should be data-driven.

3. Layout System
   - Semantic HTML.
   - Header, main, section, figure, nav, footer.
   - CSS Grid vs Flexbox.
   - Responsive layout constraints.

4. Design Tokens
   - Colors, typography, spacing, border radius, shadows.
   - How tokens prevent random one-off styling.
   - How to keep the site clean without making it bland.

5. Hero and Primary CTA
   - Product positioning.
   - Above-the-fold hierarchy.
   - Real image handling.
   - Accessible link and button semantics.

6. Feature Sections
   - Reusable feature cards or rows.
   - When repetition helps comprehension.
   - How to avoid card soup.

7. Plugin and Docs Sections
   - Link architecture.
   - Copyable commands.
   - External link behavior.
   - How to explain capabilities without overclaiming.

8. Media Gallery
   - Image sizing.
   - Captions and alt text.
   - Performance and optimization.
   - GIF/video tradeoffs.

9. Responsive and Accessibility Pass
   - Mobile layout.
   - Keyboard navigation.
   - Focus states.
   - Heading order.
   - Color contrast.

10. Local Verification
    - Dev server smoke test.
    - Build test.
    - Typecheck and lint.
    - Screenshot review.

11. Hosting
    - Choose hosting path.
    - Deploy preview.
    - Connect domain.
    - Verify production URL, metadata, and sharing cards.

## Commit Sequence

Each commit should be small enough to review as one learning unit.

1. `docs: plan website refresh`
   - Add this plan.
   - Capture the v1 scope and learning flow.

2. `chore: scaffold web app`
   - Add fresh `apps/web` Next.js app.
   - Add scripts and workspace wiring.
   - No real public-site content yet.

3. `feat(web): add site content model`
   - Add typed content objects for nav, features, docs, installs, and examples.

4. `feat(web): add layout shell`
   - Add root layout, metadata, header, footer, and global styles.

5. `feat(web): build hero`
   - Add hero copy, CTAs, and first real or temporary product image slot.

6. `feat(web): explain workflow`
   - Add How It Works section.

7. `feat(web): add feature coverage`
   - Add feature section for graph views, search, Graph Scope, depth mode, and
     plugins.

8. `feat(web): add plugins and docs`
   - Add plugin story, docs links, and install/package links.

9. `feat(web): add product media gallery`
   - Add screenshot/GIF gallery with captions and alt text.

10. `style(web): polish responsive design`
    - Tune mobile, tablet, and desktop layouts.
    - Fix text wrapping, spacing, and focus states.

11. `test(web): add smoke coverage`
    - Add the smallest useful test coverage for rendered content and links.

12. `chore(web): prepare hosting`
    - Add hosting configuration or deployment notes.
    - Verify production build.

## Hosting Direction

Preferred first pass:

- Deploy the Next.js site through Vercel unless the chosen domain/provider makes
  another host clearly better.
- Keep the first deployment static and content-driven.
- Use preview deployments for review.
- Connect the purchased domain after the site passes local and preview review.

Before launch, verify:

- The production URL loads.
- The custom domain resolves.
- Metadata title and description are correct.
- Social preview image exists or the default preview is acceptable for v1.
- Marketplace and GitHub links work.
- No auth, billing, or private-plugin copy appears by accident.

## Not In First Pass

- Sign in.
- Accounts.
- Payments.
- Subscriptions.
- Trial flows.
- Private plugin marketplace.
- Hosted Graph Cache upload.
- Team collaboration.
- Source-code sync.
- A full documentation site.
- A blog.

## First Working Session

1. Run the older rough website branch locally as a critique exercise.
2. Write down what to reuse, what to discard, and what visual/content gaps remain.
3. Start the fresh Next.js scaffold on this branch.
4. Stop after the scaffold is verifiably running so the first commit can stay
   small and understandable.
