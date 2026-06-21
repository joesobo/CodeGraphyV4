Feature: Graph Scope Edge Types - Markdown

Scenario: References edge type shows Markdown references

Given I open the examples/example-markdown workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the References edge on
Then the top right of the graph says "4 connections"
And notes/Home.md points to notes/Architecture.md
And notes/Home.md points to notes/assets/Diagram.md
And notes/Home.md points to src/commented.ts
And src/commented.ts points to notes/Architecture.md
