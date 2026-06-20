Feature: Graph Scope Node Types - TypeScript

Background:

Given I open the examples/example-typescript workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace

Scenario: File node type shows only workspace files

When I show no edge types
And I show only the File node type
Then I can see there are 18 nodes and 0 connections
And src/index.ts is an orphan node
And src/palette.ts is an orphan node
And tsconfig.json is an orphan node

Scenario: Folder node type shows folder nodes with files

When I show no edge types
And I show only the File and Folder node types
Then I can see there are 21 nodes and 0 connections
And src is an orphan node
And src/alias is an orphan node

Scenario: Package node type shows package nodes with files

When I show no edge types
And I show only the File and Package node types
Then I can see there are 19 nodes and 0 connections
And pkg:workspace:. is an orphan node

Scenario: Interface node type shows TypeScript interfaces

When I show no edge types
And I show only the File and Interface node types
Then I can see there are 20 nodes and 0 connections
And src/paletteExporter.ts#PaletteExporter:interface is an orphan node
And src/types.ts#PaletteRecipe:interface is an orphan node

Scenario: Type node type shows TypeScript type aliases

When I show no edge types
And I show only the File and Type node types
Then I can see there are 19 nodes and 0 connections
And src/types.ts#PaletteMood:type is an orphan node

Scenario: TypeScript plugin node types show symbols

When I click the plugins button
Then I see a list of plugins with toggles
And I toggle the TypeScript/JavaScript plugin on
And I show no edge types
When I show only the Contains edge type
And I show only the File and Function node types
Then I can see there are 29 nodes and 11 connections
And src/alias/themePack.ts points to src/alias/themePack.ts#loadThemePack:function
And src/baseGenerator.ts points to src/baseGenerator.ts#markGenerated:method
And src/swatches.ts points to src/swatches.ts#getSwatchName:function
And src/index.ts points to src/index.ts#schedulePreview:function
And src/lazyPreview.ts points to src/lazyPreview.ts#renderLazyPreview:function
And src/registry.ts points to src/registry.ts#createPaletteRecord:function
And src/paletteRunner.ts points to src/paletteRunner.ts#exportPalette:method
And src/themeLabels.ts points to src/themeLabels.ts#describeTheme:method
And src/harmony.ts points to src/harmony.ts#getAccentSwatch:function
And src/types.ts points to src/types.ts#normalizeMood:function
And src/palette.ts points to src/palette.ts#buildPalette:function

When I show only the File and Class node types
Then I can see there are 20 nodes and 2 connections
And src/baseGenerator.ts points to src/baseGenerator.ts#BaseGenerator:class
And src/paletteRunner.ts points to src/paletteRunner.ts#PaletteRunner:class

When I show only the File and Interface node types
Then I can see there are 20 nodes and 2 connections
And src/paletteExporter.ts points to src/paletteExporter.ts#PaletteExporter:interface
And src/types.ts points to src/types.ts#PaletteRecipe:interface

When I show only the File and Type node types
Then I can see there are 19 nodes and 1 connection
And src/types.ts points to src/types.ts#PaletteMood:type

When I show only the File and Enum node types
Then I can see there are 19 nodes and 1 connection
And src/types.ts points to src/types.ts#PaletteTheme:enum

When I show only the File and Constant node types
Then I can see there are 24 nodes and 6 connections
And src/index.ts points to src/index.ts#currentMood:constant
And src/index.ts points to src/index.ts#lazyPreview:constant
And src/index.ts points to src/index.ts#seedSettings:constant
And src/seedSettings.ts points to src/seedSettings.ts#theme:constant
And src/scratchpad.ts points to src/scratchpad.ts#SCRATCHPAD_NOTE:constant
And src/themeLabels.ts points to src/themeLabels.ts#ThemeLabels:constant
