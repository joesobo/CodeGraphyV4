# Feature: Graph Scope Node Types - TypeScript

## Background:

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace

## Scenario: File node type shows only workspace files

When I show no edge types
And I show only the File node type
Then I can see there are 18 nodes and 0 connections
And src/index.ts is an orphan node
And src/palette.ts is an orphan node
And tsconfig.json is an orphan node

## Scenario: Folder node type shows folder nodes with files

When I show no edge types
And I show only the File and Folder node types
Then I can see there are 21 nodes and 0 connections
And src is an orphan node
And src/alias is an orphan node

## Scenario: Package node type shows package nodes with files

When I show no edge types
And I show only the File and Package node types
Then I can see there are 19 nodes and 0 connections
And pkg:workspace:. is an orphan node

## Scenario: Interface node type shows TypeScript interfaces

When I show no edge types
And I show only the File and Interface node types
Then I can see there are 20 nodes and 0 connections
And src/paletteExporter.ts#PaletteExporter:interface is an orphan node
And src/types.ts#PaletteRecipe:interface is an orphan node

## Scenario: Type node type shows TypeScript type aliases

When I show no edge types
And I show only the File and Type node types
Then I can see there are 19 nodes and 0 connections
And src/types.ts#PaletteMood:type is an orphan node
