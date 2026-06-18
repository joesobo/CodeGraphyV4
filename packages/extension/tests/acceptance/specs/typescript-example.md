# Feature: TypeScript Example

## Scenario: TypeScript example renders expected file relationships and plugin edges

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 18 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-typescript workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Type imports, Inherits, Contains
And I close the Graph Scope

When I show only the Imports edge type
Then I can see there are 18 nodes and 11 connections
And src/index.ts points to src/lazyPreview.ts
And src/index.ts points to src/seedSettings.ts
And src/index.ts points to src/registry.ts
And src/index.ts points to src/themeLabels.ts
And src/index.ts points to src/types.ts
And src/index.ts points to src/palette.ts
And src/seedSettings.ts points to src/types.ts
And src/paletteRunner.ts points to src/baseGenerator.ts
And src/harmony.ts points to src/swatches.ts
And src/palette.ts points to src/harmony.ts
And src/palette.ts points to src/types.ts

And src/scratchpad.ts is an orphan node
And src/paletteExporter.ts is an orphan node
And README.md is an orphan node
And package.json is an orphan node
And .gitignore is an orphan node
And tsconfig.json is an orphan node
And src/alias/themePack.ts is an orphan node

When I show only the Type imports edge type
Then I can see there are 18 nodes and 6 connections
And src/alias/themePack.ts points to src/types.ts
And src/index.ts points to src/types.ts
And src/lazyPreview.ts points to src/types.ts
And src/registry.ts points to src/types.ts
And src/paletteRunner.ts points to src/paletteExporter.ts
And src/themeLabels.ts points to src/types.ts

When I click the plugins button
Then I see a list of plugins with toggles
And I toggle the TypeScript/JavaScript plugin on
When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Type imports, Inherits, Contains, TypeScript Alias Import
And I close the Graph Scope

When I show only the TypeScript Alias Import edge type
Then I can see there are 18 nodes and 1 connection
And I see src/index.ts points to src/alias/themePack.ts
And src/alias/themePack.ts is no longer an orphan node

When I show only the Inherits edge type
Then I can see there are 18 nodes and 2 connections
And src/paletteRunner.ts points to src/baseGenerator.ts
And src/paletteRunner.ts points to src/paletteExporter.ts

When I show only the Calls edge type
Then I can see there are 18 nodes and 6 connections
And src/index.ts points to src/themeLabels.ts
And src/index.ts points to src/types.ts
And src/index.ts points to src/palette.ts
And src/palette.ts points to src/types.ts
And src/palette.ts points to src/harmony.ts
And src/harmony.ts points to src/swatches.ts

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
