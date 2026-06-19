# Feature: Graph Scope Edge Types - TypeScript

## Background:

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace

## Scenario: TypeScript alias import edge type shows path alias imports

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Typescript Alias Import edge on
Then the top right of the graph says "1 connection"
And src/index.ts points to src/alias/themePack.ts
