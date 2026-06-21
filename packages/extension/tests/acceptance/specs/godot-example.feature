Feature: Godot Example

Scenario: Godot example renders expected file nodes and plugin load relationships

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
And I can see there are 19 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-godot workspace

When I click the plugins button
Then I see a list of plugins with toggles
And I toggle the GDScript (Godot) plugin on
When I toggle the References edge on
Then I see edges
When I open the Graph Scope
And I select edge types
Then the available edge types are References, Calls, Inherits, Loads
And I close the Graph Scope

And I can see there are 19 nodes and 6 connections
And scripts/player.gd points to scripts/data/player_loadout.gd

And scripts/orphan.gd is an orphan node
And README.md is an orphan node
And .gitignore is an orphan node
And .vscode/settings.json is an orphan node

When I toggle the Reference edge off
And I toggle the Calls edge on
Then I can see there are 19 nodes and 1 connection
And scripts/enemy.gd points to scripts/utils/math_helpers.gd

When I toggle the Calls edge off
And I toggle the Loads edge on
Then I can see there are 19 nodes and 22 connections
And project.godot points to scenes/main.tscn
And project.godot points to scripts/game_manager.gd

When I toggle the Loads edge off
And I toggle the Inherits edge on
Then I can see there are 19 nodes and 1 connection
And scripts/enemy.gd points to scripts/base/entity.gd
