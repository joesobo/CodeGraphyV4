# Feature: Lua Example

## Scenario: Lua example renders expected file nodes and require relationships

Given I open the examples/example-lua workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-lua workspace

Then I can see there are 5 nodes and 2 connections
And main.lua points to app/runner.lua
And app/runner.lua points to app/model/user.lua

And README.md is an orphan node
And .luarc.json is an orphan node
