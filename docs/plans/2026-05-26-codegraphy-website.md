# CodeGraphy Website Plan

## Source

- Trello: [CodeGraphy Website](https://trello.com/c/xnumixTi/142-codegraphy-website)
- Trello card id: #142
- Related Trello card: [Extract Pro](https://trello.com/c/x2WvUEPs/141-extract-pro)
- Card labels at time of synthesis: Website, Pro
- Trello last activity at time of synthesis: 2026-05-26T19:07:02.989Z
- Domain language source: root `CONTEXT.md`
- Structure reference: [SaaS landing page structure image](../media/website/saas-landing-page-structure-reference.png), copied from the Trello card attachment.

This doc consolidates the website card into repo-native planning language. It is the working source for the website package, landing-page direction, launch scope, and follow-up grill questions.

## Goal

Create the CodeGraphy website as its own app in the monorepo. The website should explain CodeGraphy clearly, support free account signup and CodeGraphy Pro package flows, and give the VS Code Extension a place to send users for login, pricing, checkout, account management, and entitlement status.

The first public launch should not be marketing-only. The website can be built incrementally, but public launch requires the landing page, pricing, FAQ, account, billing, and VS Code handoff path to be coherent enough to install, sign in, start a trial, manage a subscription, and report entitlement state back to the extension.

## Product Language

Use existing CodeGraphy terms:

- **Relationship Graph**, not dependency graph, for the main product concept.
- **CodeGraphy Workspace** or workspace when the product scope includes code, Markdown, docs, and plugin-defined concepts.
- **Graph Cache** for `.codegraphy/graph.lbug`.
- **Graph Query** for agent/query access, but do not make Graph Query/MCP a main launch-gallery demo.
- **CodeGraphy Account** for the signed-in website account.
- **Free Account** for a CodeGraphy Account without an active paid Pro package.
- **CodeGraphy Pro** for the paid tier.
- **Pro Package** for paid entitlements inside CodeGraphy Pro.
- **Organize** for the first planned Pro Package.

Avoid leading website copy with generic "visualize your codebase" language by itself. Prefer language that combines workspace maps, structure, relationships, and useful graph understanding.

Starting copy direction:

- Hero headline: `See how everything connects.`
- Primary hero CTA: `Install CodeGraphy Free`
- Launch pricing/final CTA after checkout exists: `Start 7-day Pro trial`
- Starter Organize pricing CTA before checkout exists: `Coming soon`
- Core story: CodeGraphy turns a local workspace into a useful Relationship Graph so users can see how files and concepts connect before they edit, explain, or ask an agent to work.

Use `workspace` instead of `codebase` when the broader product scope matters. CodeGraphy is often used for code, but Markdown support and plugin-defined graph concepts mean the product should not be over-narrowed to source code only.

## App Shape

Resolved stack direction:

- Next.js
- TypeScript
- shadcn
- Vercel-compatible hosting

Resolved package/app path direction:

- App path: `apps/web`
- Keep shadcn components local to `apps/web` for launch.
- Do not create a shared `packages/ui` package yet.
- Add `apps/*` to workspace configuration when implementation starts.

Open package-name grill question:

- The Trello card recommends `@codegraphy/web`.
- The current monorepo package convention is `@codegraphy-dev/*`.
- Recommended answer: keep `apps/web`, but use `@codegraphy-dev/web` unless there is a concrete publishing or branding reason to introduce a new npm scope.

Do not create a separate backend package for launch. The website app owns account, billing, and entitlement backend routes until that backend grows enough to deserve its own package. In this sentence, "backend package" means a monorepo code package, not a Pro Package.

## Ownership Boundaries

The website card owns:

- `apps/web` package setup.
- Landing page structure, copy, and design.
- shadcn-local website UI.
- Gallery layout and asset slots.
- Integration points to account, billing, and entitlements.
- Overall public-launch completeness.

The related Pro/account/billing card owns:

- Supabase Auth details.
- Stripe checkout and customer portal details.
- Trial, refund, cancellation, and offline entitlement policy.
- Entitlement API details.
- Account/status data model.

The website still needs to expose these flows at launch; it should not duplicate the lower-level billing design if that belongs to the linked Pro work.

## Landing Page Flow

The Trello attachment's SaaS landing page structure is a loose guide for the starter website, not a required checklist. Use it to keep the page's conversion rhythm clear, but include only the sections that fit the agreed CodeGraphy story.

The reference frames a typical page as:

- Hook: Hero.
- Trust: Social proof.
- Educate: Problem/pain, how it works, and features as benefits.
- Convert: Pricing, FAQ, and final CTA.

Use this first-launch page structure:

1. Hero: `See how everything connects.` plus one beautiful real CodeGraphy graph visual.
2. Problem / pain: file trees hide relationships and make workspace structure hard to hold in your head.
3. How it works: index, tune, explore.
4. Gallery: curated workspace maps across CodeGraphy, Next.js, Godot Open RPG, ripgrep, and qmd.
5. Pro Organize: shown through the CodeGraphy repo itself, using launch-ready organization features.
6. Founder note: why spatial workspace maps matter.
7. Pricing: Free vs Organize, $5/month or $50/year, 7-day trial.
8. FAQ: privacy, account, billing, support, cancellation, refund, offline use, and source-code upload concerns.
9. Final CTA: repeat the main action without adding new concepts.

Adapt the reference image's trust sections honestly. Skip dedicated Social Proof and Testimonials sections for the starter website and first launch unless real proof exists. Do not fake testimonials. A roughly 9k install count can appear as a small trust detail later if it feels natural, but it should not carry a full standalone social-proof band.

## Launch Scope

First public launch requires:

- Landing page with final-enough copy and temporary or approved CodeGraphy visuals.
- Pricing section for Free and Organize.
- FAQ covering privacy, account, billing, support, cancellation, refund, offline use, and source-code upload concerns.
- Supabase auth with email/password, Google OAuth, and GitHub OAuth.
- Stripe checkout for monthly and annual Organize.
- 7-day paid trial flow.
- Stripe customer portal or equivalent subscription-management path.
- Account/status page showing signed-in user, Pro Package status, current plan, trial/subscription period, and renewal/cancel state.
- Entitlement API for Organize verification from the extension.
- VS Code login/account handoff path.

Implementation can happen in milestones, but do not ship the public website as a pure marketing page.

## Pricing And Account Policy

Free:

- Users can install the VS Code Extension and explore the Relationship Graph without an account.
- Free use should not require signing in.
- Users can also navigate to the website and create a Free Account.
- A Free Account is useful for account setup and later upgrade, but it should not be required for basic extension exploration.

Organize:

- $5/month per user or $50/year per user.
- 7-day trial.
- Launch copy should describe only launch-ready Organize features.
- Current likely Organize features: Bookmarks or saved graph setups once named, pinned nodes, Graph Sections, and selected polished graph exports if launch-ready.

Account language:

- CodeGraphy Account is the signed-in website account.
- Free Account is a CodeGraphy Account without an active paid Pro package.
- CodeGraphy Pro is the paid tier.
- Organize is the first Pro Package inside CodeGraphy Pro.
- A user becomes Pro by paying for one or more Pro Packages.

VS Code account entry:

- Preferred initial placement: under `Open in Editor` in the bottom-right Graph Stage Corner Controls.
- The VS Code Extension should show a subtle account icon when the user is not logged in.
- Use a small door/login-style icon rather than a prominent banner or blocking prompt.
- The unauthenticated tooltip text is `Sign in or create a free account`.
- Clicking the unauthenticated icon navigates to the website login page by default.
- After login, replace the door/login icon with a small circular profile picture or profile fallback.
- Prefer the auth provider avatar when available.
- Keep the profile picture small in the graph UI.
- For users without a provider avatar, use a deterministic generated SVG avatar instead of an initial-only colored circle.
- Recommended fallback avatar package: `boring-avatars`, using an organic variant such as `marble` or `sunset` with a restrained two-color CodeGraphy palette seeded by the account email.
- Generated fallback avatars should be deterministic from the account email for the first implementation.
- Do not add stored custom avatar state until users need profile-avatar editing or cross-provider avatar control.
- Backup package if we want a raw SVG string instead of a React component: `gradient-avatar`.
- Avoid a broad avatar system such as DiceBear for the first graph-corner implementation unless the website/account app needs the extra avatar styles too.
- The authenticated tooltip should identify the signed-in account and summarize Pro Package status.
- Authenticated tooltip format: `Account: {email}`, then active or trial Pro Packages such as `Organize: Active` or `Organize: Trial`, or `No Pro packages` when no package entitlement exists.
- Clicking the authenticated profile entry navigates to the website account page.
- The account page is where users manage their profile, account settings, and Pro Package subscriptions.
- The account entry is an affordance for account and Pro Package flows, not a requirement for using the base Relationship Graph.
- Keep it visually quieter than a callout and separated from zoom/fit/open controls with the same bar-separator treatment used between Settings and Plugins in the main graph toolbar.
- The login page should include normal login buttons plus a `Don't have an account? Sign up` action that goes to the signup page.
- The signup page should include normal signup buttons plus an `Already have an account? Log in` action that goes back to the login page.
- Login and signup pages should offer three account methods: email, Google, and GitHub.
- Email auth uses email + password for the first implementation.
- Signup should ask for email and password only; do not include confirm password in the first implementation.
- Login page should include a forgot-password link.
- Use a GitHub-style auth layout: email form first, an `or` divider, then social buttons.
- Social button order: `Continue with Google`, then `Continue with GitHub`.
- Do not include Apple in the first auth implementation.
- First VS Code account-entry pass should fake account/package state locally instead of wiring the real backend.
- Initial VS Code account-entry states: logged out, logged in with `No Pro packages`, logged in with `Organize: Trial`, and logged in with `Organize: Active`.
- Use the fake states to evaluate placement, tooltip wording, avatar fallback, separator treatment, and website navigation before adding Supabase, Stripe, or entitlement API integration.

Entitlement states should stay simple for the first version:

- trialing
- active
- canceled-until-period-end
- expired/unpaid

Existing local Organize data should not be deleted when access expires.

Open policy question:

- Money-back/refund policy is not resolved in the card. It needs one clear FAQ answer before launch.

## Privacy And Trust

Make local-first privacy a central trust point, not only a technical FAQ.

Website and FAQ copy should say:

- CodeGraphy runs locally.
- Relationship Graph indexing runs locally.
- Graph Cache stays folder-local.
- Free use, Free Accounts, and Organize do not upload source code or Graph Cache data.
- Bookmarks or saved graph setups stay local unless the user explicitly uses a future sync, share, or export service.
- The account backend stores account, billing, and entitlement data, not source code.

Bookmark sync is a future team sync idea, not part of launch. Later team sync may become a separate Pro Package because it requires shared accounts, permissions, conflict handling, and server-backed value.

## Design Direction

Use a dark, high-contrast, graph-native website theme that stays calm and legible.

Design guidance:

- The page should feel like a gallery wall for beautiful workspace maps, not a neon developer dashboard.
- Use dark canvas/background, crisp off-white text, restrained panels, and vivid graph colors as accents.
- Pull color energy from tuned CodeGraphy Legend themes and graph screenshots/GIFs.
- Include pastel accents where appropriate so the page feels approachable.
- Avoid a single dominant purple/blue developer-SaaS palette.
- Use varied accent families: teal, amber, coral, green, violet, blue, white, graphite.
- Keep UI chrome simple so graph visuals carry most of the richness.
- Explore subtle background texture such as paper grain or a light dot grid only if it improves physicality without reducing readability.

Color should support clarity and structure. It should make clusters, important nodes, and workspace maps easier to read, not merely decorative.

## Product Visuals And Gallery

Use real CodeGraphy screenshots/GIFs from small or well-tuned public repos/workspaces. Do not use abstract decoration for primary product visuals.

Build the website first with temporary CodeGraphy images/placeholders, then replace them with approved gallery screenshots/GIFs as each workspace audition finishes. Temporary visuals should make layout and copy feel real, but remain obviously replaceable.

Launch gallery direction:

- CodeGraphy itself: dogfooding, public monorepo shape, extension/core split, plugin API, built-in plugins, CLI/MCP packages, and how the product is assembled. Do not make this an MCP demo.
- vercel/next.js: Graph Scope, filtering, search, and making a huge workspace readable.
- gdquest-demos/godot-open-rpg: plugin-powered relationships and non-web-code workspace structure.
- BurntSushi/ripgrep: compact Rust architecture and relationship evidence; well-structured projects should look structured.
- tobi/qmd: local-first docs/code hybrid, Markdown/docs support, and Legend clarity.

Backups or later candidates:

- earendil-works/pi / pi.dev for terminal coding-agent/package architecture.
- openclaw/openclaw as a future stress test, probably too sprawling for the first landing-page gallery.
- vuejs/core can be styled visually, but do not claim deep `.vue` Single File Component relationship extraction until CodeGraphy adds parser/plugin support.

Gallery audition loop:

1. Clone or update candidate workspace locally.
2. Index the workspace with CodeGraphy.
3. Inspect the first raw Relationship Graph and note visual problems.
4. Filter junk/noise and tune Graph Scope/search/toggles.
5. Create custom Legend/theme groups for important folders, file types, and concepts.
6. Adjust icons, shapes, colors, and node sizing until useful patterns emerge.
7. Create 2-3 candidate views for the workspace.
8. Capture screenshot/GIF candidates.
9. Review whether the graph is both beautiful and useful.
10. Iterate until the workspace earns a gallery slot or gets rejected.

### Website Media Shot List

Status: wait until the Pro extraction work lands before capturing final website screenshots/GIFs.

Example map targets:

- **CodeGraphy**: dogfood map for the CodeGraphy repo itself. Use this to show the product understands its own core, extension, CLI/MCP, Plugin API, built-in plugins, docs, and examples.
- **Godot**: public Godot map for an engine-scale codebase with a very different shape than a TypeScript monorepo.
- **OpenHands**: exact AI repo target for the open-source AI example map: `OpenHands/OpenHands` (`https://github.com/OpenHands/OpenHands`). Use this instead of a vague "Open-source AI" placeholder because it is a recognizable AI coding-agent platform with Python agent/SDK code, TypeScript UI, CLI, tests, containers, and product boundaries that should form useful visual neighborhoods.

Gallery media:

- **Folder view**: still image showing folder/package context visible in the graph without making folders the only organizing principle.
- **3D view**: still image showing the graph in depth, framed clearly enough to read clusters.
- **Search and filters**: still image showing search/filter controls narrowing the graph to a useful subset.
- **Plugin system**: GIF of turning on multiple plugins and watching the graph/legend become richer.
- **Examples and natural clusters**: combine the old "Natural clusters" and "Examples folder" slots into one image. Use the examples folder because small multi-language examples naturally show CodeGraphy physics forming readable groups.

Pricing and Organize media:

- **Sections**: image with many section nodes or sectioned graph areas, making the grouping behavior obvious at a glance.
- **Pinned nodes**: image with several nodes pinned in an intentionally obvious layout so the viewer can see that important code can stay in place.
- **Bookmarks**: image standing in for saved graph setups/bookmarks. Until Bookmarks exist, use a filters/settings screenshot that implies a reusable saved view.

## Feature Claims

Lead with outcomes and avoid overclaiming implementation.

Use launch-ready benefit cards only:

- See how files connect before you edit.
- Jump from the graph to code.
- Tune graph scope and filters so large workspaces become readable.
- Use Legend/theming to make workspace structure visually meaningful.
- Organize important areas with launch-ready Pro Package features.
- Export or present a graph only if that export path is launch-ready.

Do not market Saved Views as available until implemented.

Graph Query/MCP is important, but it should live later in docs, blog, or advanced sections. The launch landing page should stay visual and immediately understandable.

## Founder Note

Include a short founder-style section lower on the landing page after the main product/gallery sections.

Guidelines:

- Keep it roughly 3-5 sentences.
- Do not make it a long personal essay.
- Explain that CodeGraphy came from thinking about workspaces spatially: files and concepts as points, relationships as closeness, hubs and clusters as structure.
- Connect the philosophy back to the product: CodeGraphy makes that mental map visible so users can understand, navigate, organize, and explain a workspace.
- Avoid making the copy feel overly sentimental or medicalized.

Possible section titles:

- `Why CodeGraphy Exists`
- `A Map For How Workspaces Feel`
- `The Mental Map, Made Visible`
- `Built For Spatial Understanding`

## Domain Direction

Current likely primary domain:

- `codegraphy.dev`

Reasoning:

- Clearly signals a developer/workspace tool.
- Fits CodeGraphy's VS Code, CLI, plugin, and local-first developer ecosystem.
- Memorable and direct.
- Avoids positioning the product as AI-first.

Optional secondary domains:

- `codegraphy.co` as a company/product-home redirect or backup.
- `getcodegraphy.com` as a fallback.

The card has earlier RDAP notes that `codegraphy.com` was registered and several alternatives returned no RDAP record on 2026-05-15. Treat those as research notes only. Verify availability and pricing at registrar checkout before finalizing or announcing a domain.

## Implementation Slices

Recommended initial slices:

1. Update workspace/package configuration for `apps/web`.
2. Scaffold the Next.js + TypeScript app under `apps/web`.
3. Add shadcn to `apps/web` with local components.
4. Draft landing page copy in CodeGraphy product language before polishing layout.
5. Build the launch landing structure with temporary visuals.
6. Add pricing and FAQ content, including privacy, support, cancellation, refund, offline use, and source-code upload concerns.
7. Add login/account routes.
8. Add Supabase Auth.
9. Add Stripe checkout and customer portal handoff.
10. Add API route for Organize entitlement status.
11. Connect VS Code login/account handoff.
12. Replace temporary visuals with approved gallery captures as auditions finish.

Do not let gallery perfection block package setup, copy, pricing, auth, billing, or account flow work. Do not let temporary visuals become permanent without review.

## Starter Website Scope

First website pages:

- `/` landing page with pricing and FAQ sections.
- `/login` page for signing into an existing CodeGraphy Account.
- `/signup` page for creating a Free Account.
- `/account` page for account email, Pro Package status, and Pro Package subscription management.

Landing page starter rule:

- Use the Trello SaaS landing page structure reference as a loose guide for section order and conversion rhythm.
- Include whichever reference sections support the agreed CodeGraphy story; do not include a section just because the reference image has one.
- Start from the selected light website direction, not the discarded multi-variant prototype lab.
- Use the real CodeGraphy icon in website branding.
- Skip social proof/trust as a dedicated starter section.
- Organize pricing CTA should say `Coming soon` until checkout exists.
- Do not link Organize pricing to checkout or signup until the checkout path exists.

First account page sections:

- Account: `Account: {email}` with avatar preview.
- Packages: `No Pro packages` or current Organize status.
- Manage subscription: placeholder-only until Stripe/customer portal work starts.
- Sign out action.

Do not build a checkout route yet. Keep checkout as later Stripe integration work.

First VS Code account-entry scope:

- Add the graph-corner account entry with local fake states only.
- Clicking the logged-out state should navigate to `/login`.
- Clicking the logged-in state should navigate to `/account`.
- Do not wire Supabase, Stripe, or entitlement APIs in the first account-entry pass.

## Open Grill Questions

### 1. Package Namespace

Question: Should the website package be named `@codegraphy/web` from the Trello card, or `@codegraphy-dev/web` to match the current repo package convention?

Recommended answer: use `@codegraphy-dev/web` for consistency unless a concrete publishing or brand reason requires `@codegraphy/web`.

### 2. Saved Setup Term

Question: What is the canonical term for reusable saved graph setups: Bookmark, Saved View, or something else?

Existing glossary conflict: **Favorite** already means a marked node, and `CONTEXT.md` says to avoid Bookmark if it only means graph presentation.

Recommended answer: use `Saved View` for the reusable setup until the product explicitly wants a more casual UI noun. Keep **Favorite** for marked nodes.

### 3. Refund Policy

Question: What should the launch FAQ say about refunds or a money-back policy?

Recommended answer: offer a simple short-window refund policy for first launch, but confirm operational comfort before promising it.

### 4. Launch-Ready Organize Features

Question: Which Organize features are guaranteed to exist when the website launches?

Recommended answer: only market features that are implemented or actively landing before launch. Keep future features in roadmap language, not pricing-card bullets.

### 5. Domain Purchase

Question: Is `codegraphy.dev` available and acceptable at checkout pricing?

Recommended answer: verify live at registrar checkout before treating it as final. Buy likely redirect domains only if pricing is reasonable.
