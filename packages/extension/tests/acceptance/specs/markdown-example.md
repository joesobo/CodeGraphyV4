# Feature: Markdown Example

## Scenario: Markdown example renders expected file nodes and reference relationships

Given I open the examples/example-markdown workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-markdown workspace

Then I can see there are 7 nodes and 4 connections
And notes/Home.md points to notes/Architecture.md
And notes/Home.md points to notes/assets/Diagram.md
And notes/Home.md points to src/commented.ts
And src/commented.ts points to notes/Architecture.md

And README.md is an orphan node
And notes/guides/Setup.md is an orphan node
And .gitignore is an orphan node
