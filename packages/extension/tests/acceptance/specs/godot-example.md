# Feature: Godot Example

## Scenario: Godot example renders expected file nodes and plugin load relationships

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I do not see edges
And the graph nodes match the expected files in the examples/example-godot workspace

When I click the plugins button
Then I see a list of plugins with toggles
And I toggle the GDScript (Godot) plugin on
Then I see edges
And I can see there are 19 nodes and 28 connections
And project.godot points to scenes/main.tscn
And project.godot points to scripts/game_manager.gd
And scripts/player.gd points to scripts/utils/math_helpers.gd
And scripts/player.gd points to scenes/ui/loadout_preview.tscn
And scripts/player.gd points to resources/player_loadout.tres
And resources/player_loadout.tres points to scripts/data/player_loadout.gd
And resources/player_loadout.tres points to textures/player_card.png
And scenes/ui/loadout_preview.tscn points to resources/player_loadout.tres
And scenes/ui/loadout_preview.tscn points to scripts/ui/loadout_preview.gd

And scripts/orphan.gd is an orphan node
And README.md is an orphan node
And .gitignore is an orphan node
And .vscode/settings.json is an orphan node
