# UI Theme Integration Grill

## Goal

Improve the Core Extension UI so CodeGraphy feels clean, uniform, and integrated with VS Code while still supporting the Relationship Graph's visual information density.

## Settled Decisions

### VS Code Theme Integration is the top rule

CodeGraphy UI chrome should inherit the active VS Code theme first. Radix/shadcn components should consume CodeGraphy semantic tokens that are mapped from VS Code theme variables, rather than each surface choosing one-off hardcoded colors.

Graph Data Color is the exception: node, edge, and legend colors may carry graph meaning, but they must remain legible against themed surfaces.

### VS Code owns platform behavior; Graph View owns graph-local manipulation

Use native VS Code surfaces for extension-level actions and platform behavior: theme tokens, commands, command palette entries, keyboard shortcuts, settings, view/title actions where they make sense, accessibility expectations, and platform context-menu integration.

Keep graph-local manipulation inside the Graph View webview: graph canvas controls, Graph Scope, Search, Filter, Legend, node and edge interactions, timeline scrubbing, and interactions that depend on immediate graph state.

This keeps CodeGraphy native to VS Code without scattering the Relationship Graph's core workflow across unrelated workbench surfaces.

### Feature code uses a local CodeGraphy UI kit

CodeGraphy should follow shadcn's copy-and-own model for the local UI kit: use shadcn/Radix source components as owned repo code, then customize them to fit CodeGraphy's VS Code extension environment.

Replace and expand the existing `components/ui/` layer into the CodeGraphy UI kit instead of creating a separate wrapper layer. Radix/shadcn remains the foundation inside that folder, but those files are not sacred vendor files. Feature surfaces may import from `components/ui`, and CodeGraphy-specific behavior should be added by editing or extending those owned components: toolbar buttons, icon toggles, segmented controls, panels, panel sections, field rows, search inputs, popovers, badges, timeline buttons, and other shared primitives.

This follows current shadcn guidance: shadcn is not a dependency-style component library; it adds component source code under `components/ui`, the project owns that code, and CSS variables are the recommended theming path. CodeGraphy's `components.json` already points the `ui` alias at `packages/extension/src/webview/components/ui`, so the UI cleanup should improve that owned source layer rather than preserving generated files as untouchable wrappers.

Keep the existing root `components.json` and `@/...` alias for shadcn configuration. The Core Extension is currently the only UI owner, so package imports or a shared UI package would add structure before there is another consumer. Revisit this only if another workspace starts consuming CodeGraphy UI components.

The local kit is the integration point for VS Code theming. It owns token mapping, density, hover states, focus states, disabled states, radius, tooltip behavior, and keyboard expectations so similar UI looks and acts the same across Graph View, Timeline View, settings, toolbar, Search, Filter, Graph Scope, and Legend surfaces.

The first `components/ui` cleanup should prioritize token and theming correctness in existing primitives. Add higher-level primitives such as GraphRailButton, PanelSection, FieldRow, SearchFilterChrome, and timeline controls only as each surface migrates and proves the need. This keeps the kit grounded in real CodeGraphy surfaces instead of speculative component inventory.

First implementation slice: establish the VS Code token bridge and local CodeGraphy UI-kit primitives before reshaping Graph Tool Rail, Search/Filters, Settings, and Graph Panels. Current webview code already has shadcn variables in `index.css`, raw `--vscode-*` references in feature components, and a separate hardcoded light/dark graph surface color helper; the cleanup should consolidate those paths instead of fixing each surface independently.

Implementation order after token/theming cleanup is agent-owned and may change as dependencies become clear. A sensible working sequence is Graph Stage chrome and graph rendering colors, Search/Filters, Graph Tool Rail, Settings and Graph Panels, Legend, Timeline, then any remaining production TSX cleanup. The order is not product-significant because the accepted outcome is all Core Extension UI surfaces converging on the same VS Code token bridge and local CodeGraphy UI kit.

Done means the Core Extension UI has been verified in light, dark, high-contrast, and red/accent-heavy themes; UI chrome colors come from the active VS Code theme through the token bridge rather than hardcoded values; common controls use shared `components/ui` primitives; graph rendering consumes resolved CSS-token colors; and before/after screenshots cover Graph View, Timeline View, and key open-panel states.

Verification should combine lightweight automated checks with screenshot review. Use automated tests where they are cheap and stable: token plumbing, `components/ui` primitive class behavior, graph theme adapter outputs, and hardcoded chrome color regressions. Use screenshots for visual judgment in light, dark, high-contrast, and red/accent-heavy themes. Screenshot anchors are Solarized Light for light, GitHub Dark for dark, High Contrast for high contrast, and Red for the red/accent-heavy theme. The screenshot pass should include default Graph View and Timeline View states plus Legend with default content as the representative panel screenshot so panel chrome, rows, color markers, toggles, actions, dense content, and scroll areas are checked without seeded user data or a combinatorial screenshot set. The repo already has Playwright webview smoke/depth coverage and Vitest coverage for UI primitives and graph rendering, so the plan should extend those paths instead of inventing a separate verification stack.

Automated hardcoded-color checks should scan all production webview TSX/CSS, not only files changed in the cleanup PR. UI chrome should not have hardcoded colors; it should use the VS Code token bridge or CodeGraphy `--cg-*` aliases. Hardcoded colors are acceptable only when they are semantic Graph Data Color, such as node, edge, Legend, node-type, edge-type, plugin, or graph-data palette values, and should not be used for component chrome.

### Graph Stage uses a dedicated VS Code-derived surface token

The graph canvas should be a themed Graph Stage, not a hardcoded dark or light rectangle. It can use dedicated local tokens such as `--cg-graph-background` and `--cg-graph-border` so Graph Data Color remains readable, but those tokens must be derived from the active VS Code theme.

The Graph Stage should blend with the selected VS Code theme in light, dark, and high-contrast modes while staying contrast-managed enough for nodes, edges, labels, selections, and graph controls to remain legible.

Default Graph Data Colors for nodes, edges, and similar graph concepts may remain small hardcoded semantic palettes rather than being derived from VS Code chrome tokens. Those colors are part of the Relationship Graph's visual language, not general interface chrome. The graph appearance adapter must make those semantic colors legible on the themed Graph Stage through contrast management and support treatments.

Hardcoded Graph Data Color palettes should be centralized in graph, Legend, or Plugin default modules. Renderers and TSX components should consume named graph data colors or graph appearance-model outputs instead of defining convenient local graph colors.

### Theme tokens use simple CSS aliases first

Use a CSS alias token bridge from VS Code variables to CodeGraphy/shadcn semantic tokens. The default path should be simple CSS variable mapping, not runtime color conversion.

The token bridge should have two layers:

- shadcn-compatible semantic tokens for generic controls.
- CodeGraphy-specific `--cg-*` aliases for graph-specific surfaces and repeated layout chrome such as Graph Stage, Graph Tool Rail, Graph Panels, search/filter container, timeline, and popovers.

Example direction:

```css
--cg-background: var(--vscode-sideBar-background);
--cg-foreground: var(--vscode-foreground);
--cg-popover: var(--vscode-editorHoverWidget-background);
--cg-popover-foreground: var(--vscode-editorHoverWidget-foreground);
--cg-border: var(--vscode-panel-border);
--cg-input: var(--vscode-input-background);
--cg-ring: var(--vscode-focusBorder);
--cg-graph-background: var(--vscode-editor-background);
```

Adjust the local Tailwind/shadcn mapping so components can consume full CSS color values from `--cg-*` tokens. Avoid scattered one-off `var(--vscode-...)` styling in feature code.

Runtime color measurement or conversion is only a fallback for specific readability cases, such as Graph Stage contrast, where direct aliases cannot provide a reliable result across themes.

Canvas and graph-rendering code should read resolved CodeGraphy CSS tokens from the DOM on theme changes, then receive concrete colors for the Graph Stage, graph chrome, labels, selections, borders, and other rendered surfaces. Avoid branching rendering code on only a coarse `light` / `dark` / `high-contrast` theme kind. Keep theme kind only as a compatibility hint for graph-data color adjustment while migrating existing rendering code away from hardcoded light/dark branches.

When Graph Data Color has poor contrast on the themed Graph Stage, preserve the semantic color when possible and add theme-aware support treatments around it: outlines, label colors, selection rings, edge strokes, halos, or similar readability aids. Mutating graph-data colors should be the final fallback because color carries graph meaning and users may learn those colors as part of the Relationship Graph language.

Graph contrast and readability decisions should live in one graph theme/appearance adapter. It receives resolved CodeGraphy CSS tokens plus Graph Data Colors, then outputs concrete render colors and support treatments for renderers to consume. Individual renderers should not each decide their own contrast math, fallback mutation, outlines, labels, and selection colors.

### Audit all production TSX UI code

The UI audit should cover every production `.tsx` file in `packages/extension/src/webview`. Current repo shape confirms `.tsx` is isolated to `packages/extension`: 91 production webview files plus webview tests, mocks, and one integration test.

The audit should classify each production TSX file as one of:

- CodeGraphy UI kit primitive or candidate primitive
- Feature surface that should consume the local UI kit
- Graph Stage or Graph Data Color rendering
- VS Code-native/platform integration surface
- Dead or legacy styling surface

Test `.tsx` files should be reviewed as behavior and style-contract evidence, not as primary UI implementation surfaces.

### Density follows shadcn/Radix comfort, not VS Code's tightest chrome

CodeGraphy should stay VS Code-native in theming, command behavior, accessibility, and platform expectations, but it does not need to copy the most compact VS Code sidebar density.

The local UI kit should use a slightly more comfortable shadcn/Radix scale for controls, panels, popovers, and form rows while avoiding roomy web-app or dashboard spacing. The target is clean and pleasant inside VS Code, not cramped.

### Retain the broad Graph View layout, but re-evaluate the left toolbar

The current Graph View layout mostly stays: Search at the top, graph-local panels on the right, the Graph Stage in the center, and Timeline at the bottom.

The left-side toolbar becomes an Obsidian-inspired grouped tool rail. Keep it icon-first and tooltip-backed, but group actions so it feels more like Obsidian's Ribbon plus Blender's tool groups: common graph commands stay directly accessible, while dense multi-choice controls open menus, popovers, or panels.

The Graph Stage corner controls remain visually separate from the left toolbar. Zoom In, Zoom Out, Fit to Screen, and Open in Editor should use no persistent button background; the icon changes color on hover/press instead.

Do not implement user reorder/hide customization in the first slice, but design the rail so that capability can be added later.

Initial grouped-rail split:

- Search stays in the top Search header. Do not move Search into the rail.
- Index/Re-index remains a direct top-level control near the top of the rail. Do not bury Indexing behind a group.
- Depth Mode moves out of the main rail into the Display settings section because it is a toggle plus slider, not just a simple action button.
- Layout becomes a grouped rail control with icon entries for each layout mode.
- Node Size becomes a grouped rail control with icon entries for each sizing mode.
- Graph Scope becomes one rail control that opens a combined Graph Scope panel for Node Type and Edge Type controls.
- Groups with multiple choices, such as Node Size, should show an icon for each entry, not only text.
- Legend stays as a direct rail panel button because it owns graph semantic styling and rules, not general Display settings.
- Export moves into an Export section inside Settings because it outputs graph data rather than shaping the working graph view. Do not create a separate "More" menu for Export.
- Plugins stays as a direct rail panel button because plugins change what graph concepts and controls exist, but it should sit with configuration/system controls rather than active graph-working mode controls.
- Settings stays as a direct rail panel button, visually separated near the bottom, and should not absorb controls with clearer homes such as Graph Scope or Legend.

Rail grouping:

- Lifecycle: Index/Re-index.
- Graph Tools: Layout, Node Size, Graph Scope, Legend.
- System: Plugins and Settings. Settings includes an Export action section.

Use mixed but subtle separators so the lifecycle action is distinct without looking like a visually floating orphan button: compact vertical spacing plus low-contrast 1px lines between major groups, with no visible group labels in the first slice.

Settings should be organized by intent:

- Display: persistent visual preferences and lower-frequency view behavior, including Depth Mode and 2D/3D renderer mode.
- Forces: graph physics controls. Forces remains a first-class Settings section, collapsed by default rather than hidden under Advanced.
- Performance: settings such as `maxFiles` that affect graph size or resource pressure rather than visual display.
- Export: output actions such as Graph Export and Index Export.

All Settings sections default collapsed and remember their open or closed state the next time Settings opens. This is UI state, not repo-local `.codegraphy/settings.json` graph behavior.

Depth Mode does not need a Graph Tool Rail status indicator in the first cleanup slice. If users need more awareness later, use subtle Graph Stage context such as a small `Depth 2` badge near graph stats.

Layout and Node Size should open small rail popovers with compact icon-and-label choices, not right-side panels. The rail button remains icon-first and shows the currently selected mode icon; the popover is where the explicit choice labels appear.

The current choice inside a compact rail popover should use both a subtle active row background and a checkmark so the state is scannable and unambiguous.

Conditional options such as Node Size: Churn should stay visible but disabled when unavailable, with a tooltip or short reason such as requiring indexed git history.

Exposure rule to reduce arbitrariness:

- Top Search header: temporary narrowing and find-style controls.
- Left grouped rail: high-frequency graph tools that change the current working view or open graph-local panels.
- Graph Stage corner controls: viewport navigation and canvas/window actions.
- Display settings: persistent visual preferences and lower-frequency view behavior, especially controls with sliders or multiple supporting fields.
- Native VS Code commands/settings: extension-level commands, keyboard shortcuts, and rare actions users may expect from the command palette.

The toolbar audit should evaluate:

- whether each control belongs in the toolbar, a panel, Search, Timeline, Graph Stage corner controls, or native VS Code UI
- whether each icon communicates its action clearly enough
- which controls should be icon-only and which need text or a menu label
- when buttons should have visible background chrome versus transparent icon treatment
- active, hover, focus, disabled, warning, and loading states
- whether similar controls share behavior and visual treatment

Current source evidence:

- DAG mode and Node Size mode are vertical toggle groups using `default` for active and `ghost` for inactive.
- Depth Mode is a toggle using `default` when active and `outline bg-transparent` when inactive.
- 2D/3D, Re-index, Export, Nodes, Edges, Legends, Plugins, and Settings use outline icon buttons with transparent backgrounds.
- Graph Stage corner controls use outline icon buttons with a persistent `bg-popover/95` surface.
- Icon quality is mixed: some controls use custom DAG icons, most use Material Design Icons, and Fit to Screen is an inline SVG.

### Graph Scope combines Nodes and Edges

The separate Nodes and Edges panels should become one Graph Scope panel opened from a single Graph Tool Rail control.

The panel should use a two-option segmented control for Node Types and Edge Types. This is a small in-panel mode switch, not separate navigation.

Both sections should share one row primitive: label, graph data color swatch, and scope toggle. This makes the user model predictable: inclusion/exclusion of graph item types lives in Graph Scope.

Graph Scope color swatches are read-only identifiers that help users understand what they are toggling. Use small circles instead of rectangle blocks, and do not use a pointer cursor or hover affordance. Color editing, Legend Entries, and Legend Layers remain in Legend.

### Panel sizing should be content-driven

Do not force every right-side panel into one fixed width. Simple panels can stay compact, while content-heavy panels such as Legend may need more width.

Prefer a content-driven sizing model with min/max constraints so panels size to their controls without feeling arbitrary. Legend should get a layout review: either keep it wider because the editing surface genuinely needs room, or redesign Legend rows so the panel can be cleaner and narrower without crowding.

Legend may remain a wider editor panel because it handles layers, rules, colors, icons, toggles, ordering, and custom entries. Still simplify Legend rows with clearer hierarchy, compact action buttons, and expandable detail rows for advanced rule editing.

Graph Tool Popovers open near their rail button for quick choices such as Layout and Node Size. Larger Graph Panels such as Graph Scope, Legend, Plugins, and Settings stay as right-side panels.

Popover/panel interaction rule:

- Only one Graph Tool Popover opens at a time.
- Opening a Graph Panel closes open popovers.
- Opening a Graph Tool Popover does not have to close the current Graph Panel.
- Right-side Graph Panels remain mutually exclusive; only one should be open at a time.
- The Graph Tool Rail button that owns the open Graph Panel should show an active state using subtle tint plus a small accent indicator rather than a heavy filled button.
- Compact choice rail buttons such as Layout and Node Size should not show active panel styling merely because a value is selected; the current icon carries the selected value.

### Search header options stay visible

Search option controls such as match case, whole word, and regex should stay inline in the Search header rather than moving into a popover.

Restyle them to be VS Code-like, closer to native search option buttons: quiet, theme-aware, visible, and easy to scan while staying on the same CodeGraphy density scale as the rest of the UI.

Filter access also stays attached to the top Search header because users look there when they want to narrow the graph. Do not put a full "Filters" label on the trigger. Use icon-and-count chrome so active filters are visible without making the header feel wordy. The popup or expanded surface can use "Filters" as its title.

The top Search field and expanded Filters surface should share one VS Code-like container, matching VS Code Search more than a detached CodeGraphy band. Search remains the primary first row; expanding Filters reveals the Include/Exclude surface inside the same container.

The Search/Filters shared container should keep uniform CodeGraphy shadcn/Radix density. It borrows VS Code Search structure, behavior, and theme integration, not a separate compact density. Use the same local primitives and spacing scale as panels and settings unless a specific shared control variant already exists.

Search/Filters should reuse the same local Button and Input variants as panels and settings. Define a Search/Filters layout wrapper and token bridge for the shared container, but do not fork component variants just for this surface.

When the shared Search/Filters container expands, it pushes the Graph Stage down rather than overlaying it. The expanded Filters area must have a bounded max height with internal scrolling for long rule lists so the Graph Stage remains the center focus.

Use a responsive max height for the expanded Filters area rather than one fixed size. The exact token can be tuned during implementation, but the behavior should be similar to `min(320px, 35vh)`: enough room for rules, never so much that the Graph Stage stops feeling central.

CodeGraphy's filter surface should become more VS Code Search-like with explicit Include and Exclude sections. Unlike temporary Search text, these sections edit persistent Filter Settings. Exclude remains the common recurring-noise removal workflow; Include narrows graph consideration to a durable working subset.

First slice visual direction: an icon-and-count trigger in the top Search header opens a theme-aware Filters surface. The surface title can be "Filters"; inside it, Include and Exclude are labeled sections inspired by VS Code Search's include/exclude fields.

The Filters surface should expand inline under the Search header, like VS Code Search, rather than opening a detached popover. This preserves the native mental model and gives CodeGraphy enough room for rule management.

The first implementation should target feature parity with VS Code Search's include/exclude pattern controls:

- Include and Exclude accept path/glob-style patterns.
- Search remains temporary text matching, separate from persisted filters.
- Graph-aware criteria are deferred. Node and edge type eligibility stays in Graph Scope, plugin enablement stays in Plugins, and symbol/plugin/relationship filters need a separate semantic pass before they are exposed.

Because CodeGraphy can have default, plugin-contributed, and custom Filter Rules, the expanded Filters surface needs more than two raw input fields:

- Include and Exclude each act as a uniform rule list.
- Each Filter Rule shows its pattern, origin, and enabled state.
- Filter Rule origins use both subtle visible labels and tooltips: small labels such as `Default`, a plugin name, or `User` appear when row space allows, while the tooltip always gives the full source.
- Custom user Filter Rules need edit, remove, and enable/disable controls.
- Built-in and plugin-contributed Filter Rules need clear origin labels and enable/disable controls.
- Built-in and plugin-contributed Filter Rules are source-owned and are not directly editable. Editing one should create a custom user-owned override or copy, while the original rule remains tied to its source.
- Disabled Filter Rules stay where they are in the Include or Exclude list and use normal disabled styling: lower contrast, subdued controls, and no relocation into a separate disabled section.
- Expanded Include and Exclude sections each keep an always-visible inline input for adding custom Filter Rules, matching VS Code Search's pattern-entry feel instead of hiding the main add action behind an add button.
- The Filter trigger count shows all enabled Filter Rules, regardless of origin, because all enabled rules affect the graph.
- The expanded Filters surface breaks counts down inside the surface, such as `Include 3` and `Exclude 12`, while the collapsed trigger keeps one total count.
- The expanded/collapsed state of the Filters surface is remembered as UI state across Graph View sessions. It is not repo-local graph behavior and should not persist in `.codegraphy/settings.json`.
- Include and Exclude rule-list sections inside the expanded Filters surface default collapsed.
- Include and Exclude section open/closed state is remembered as UI state across Graph View sessions, not persisted in `.codegraphy/settings.json`.
- Adding an Include or Exclude Filter Rule requires expanding that section first; collapsed section headers are quiet summaries, not editing surfaces.
- Collapsed Include and Exclude section headers show enabled-rule counts plus subtle status markers for conflicts or invalid drafts. They do not surface neutral per-rule no-match metadata such as `0 matches`.
- Conflict and invalid-draft markers in collapsed Include and Exclude headers are icon-only with tooltips. Expanded rows own fuller text feedback.
- Filter Rules stay in one uniform list within each Include or Exclude section, with origin labels on each row. Do not group rules under separate origin headers because that adds chrome and makes the VS Code-like surface feel heavier.
- Filter Rules order active rules first and disabled rules after them, while preserving source/default order inside each group.
- Custom user Filter Rules appear at the top of the active group because they are higher-intent and more likely to be edited again. Source-owned active rules stay below user rules in stable source/default order.
- Within custom user Filter Rules, newest rules appear first.
- Custom user Filter Rules do not support manual reordering in the first slice because ordering has no matching semantics.
- The expanded Filters surface includes **Restore Defaults**, not a vague clear action. Restore Defaults removes custom user Filter Rules and Filter Rule Overrides, then restores built-in and plugin-contributed Filter Rules to their source-owned default enabled states.
- Restore Defaults requires a small confirmation dialog because it removes custom filter work. Use the local Radix/shadcn dialog treatment and keep the copy plain.
- Custom user Filter Rules edit inline in their row for simple path/glob pattern changes. Source-owned rules still use the override/copy behavior rather than editing in place.
- Inline Filter Rule edits apply on Enter or blur, and Escape cancels the edit. Do not apply every keystroke to the graph because partial patterns can cause distracting graph churn.
- Always-visible Include and Exclude add inputs create a new custom Filter Rule on Enter only. Blur leaves the draft alone and does not create a rule, even when the pattern is valid.
- Add-input drafts survive collapsing and reopening the expanded Filters surface during the current Graph View session. Drafts are UI state only and never persist to `.codegraphy/settings.json` until Enter creates a Filter Rule.
- Valid Filter Rules that currently match no graph items are allowed. No-match is useful when preparing for future files, another branch, or a different Timeline Snapshot, and should not be treated as invalid pattern syntax.
- Filter Rules are rejected only when empty or when the chosen matcher cannot parse them. Weird but parseable patterns are allowed, even if they match nothing.
- Expanded Filter Rule rows show subtle match metadata such as `0 matches` or `12 matches`. Match count is neutral metadata, not warning styling when the count is zero.
- Filter Rule matching should standardize on one shared VS Code-like matcher across discovery, Graph View filtering, Timeline Snapshots, and Graph Query. The current implementation split between simple webview glob matching and minimatch-style discovery matching should be removed as part of the filter redesign.
- Include and Exclude add inputs accept comma-separated pattern lists for VS Code parity. On Enter, each parsed pattern becomes its own custom Filter Rule row.
- If a comma-separated add input contains both valid and invalid patterns, valid patterns become custom Filter Rules and invalid entries remain in the draft with inline feedback.
- Duplicate Filter Rules in the same Include or Exclude section do not create another row. The UI should move focus to the existing matching row and show subtle `Already exists` feedback.
- An empty Include section means include everything still eligible after Graph Scope. Include rules narrow that default set only when at least one Include Filter Rule is enabled.
- If all Include Filter Rules are disabled, Include behaves the same as empty Include: disabled rules do not participate, so everything still eligible after Graph Scope passes through to Exclude.
- Disabled Exclude Filter Rules are fully inert: they do not exclude graph items, do not count in the collapsed Filter trigger, and only remain visible as disabled rows in the expanded Filters surface.
- Source-owned Filter Rule enable/disable state is persisted by stable source and rule id, not by raw pattern text. This lets CodeGraphy or plugin updates change rule patterns without losing the user's toggle choice.
- Custom user Filter Rules also get generated stable ids. Pattern text is editable content, not row identity, so editing a pattern does not break ordering, focus, or row-level UI state.
- If the same pattern or graph item is matched by both Include and Exclude Filter Rules, Exclude wins. Include narrows the candidate set; Exclude applies the final veto. Show a subtle conflict hint on affected rows so users can understand the result.
- Rule actions should stay quiet and VS Code-like, using standard icon buttons and inline controls rather than large cards.

## External Design Notes

- VS Code webviews should be themeable, accessible, and tested in light, dark, and high-contrast themes.
- shadcn's semantic token model fits a VS Code token bridge: components consume `background`, `foreground`, `primary`, `muted`, `border`, `input`, and related pairs instead of owning local color decisions.
- Radix should remain the behavior/accessibility primitive layer, with CodeGraphy owning the VS Code-aware styling.
- Blender and Godot are useful references for complex professional tools, but CodeGraphy lives inside VS Code, so integration with the host workbench outranks a standalone application identity.

### Toolbar reference notes

- VS Code guidance: webviews should use command actions in the toolbar and in the view, keep all elements themeable, and follow accessibility expectations.
- VS Code view/editor action guidance: avoid noisy toolbars, show actions only when contextually appropriate, prefer built-in product icons, use overflow menus for secondary actions, and avoid custom colors.
- VS Code product icons are themeable product icons, separate from file icons, and can be used by extensions through icon identifiers.
- GitHub Pull Requests and Issues is a useful VS Code-native reference: tree views can handle navigation while a webview handles detail content; editor actions should appear only when relevant.
- Obsidian reference: the left Ribbon is a persistent icon-only space for common commands, remains visible when the left sidebar is closed, shows tooltips, and can be reordered or hidden by users.
- Obsidian workspace reference: the app composes a left Ribbon, collapsible left/right sidebars, central tabs/content, and a status bar rather than putting every control into one toolbar.
- Obsidian Graph View reference: graph settings stay in the graph view behind a cog/settings affordance, with sections for Filters, Groups, Display, Forces, and Local Graph depth.
- Blender reference: editor areas are divided into regions. The left Toolbar contains interactive tools, the right Sidebar contains panels/settings, headers hold common editor controls, and footer/timeline areas carry playback/navigation controls.
- Blender tool reference: the toolbar can stay icon-first, expand to show text when space allows, and use tool groups for related tools.
- Blender interface guideline reference: editors should present common regions in familiar ways so users do not have to relearn UI patterns between editors.
- Godot reference: the viewport has contextual tools near the viewport, docks sit on either side, and the bottom panel hosts output/debug/animation-style surfaces that are folded when not needed.
- Kepano/Minimal reference: Minimal is a distraction-free Obsidian theme focused on making the interface customizable for the user's ideal writing environment.
- Kepano/Flexoki reference: Flexoki is designed for reading and writing on screens, emphasizing minimalism, high contrast, perceptual balance, and careful light/dark behavior.

Applied to CodeGraphy:

- Keep the Graph Stage corner controls distinct from the left toolbar.
- Treat the left toolbar as graph tool/mode/panel access, not as a dumping ground for every command.
- Borrow from Obsidian's Ribbon by keeping the left rail icon-first, tooltip-backed, and potentially user-customizable over time.
- Borrow from Obsidian Graph View by keeping graph settings grouped inside graph-local panels instead of exposing every setting as a direct rail button.
- Borrow from Kepano's work as a restraint principle: low chrome, strong readability, clear hierarchy, and no decorative palette competing with the user's VS Code theme.
- Prefer icons that map to VS Code product-icon semantics where possible; keep custom icons only when the graph concept is genuinely custom and the icon is clearer than available product icons.
- Push secondary or rarely used actions into menus, popovers, panels, or native VS Code commands instead of expanding toolbar noise.
- Prefer contextual grouping over one long mixed list.

## Open Questions

- None. The plan is ready for implementation; continue refining through code review and follow-up decisions as the UI cleanup lands.
