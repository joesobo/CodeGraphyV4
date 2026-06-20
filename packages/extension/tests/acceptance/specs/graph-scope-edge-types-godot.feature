Feature: Graph Scope Edge Types - Godot

Scenario: Loads edge type shows Godot resource loads

Given I open the examples/example-godot workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Loads edge on
Then the top right of the graph says "22 connections"
And project.godot points to scenes/main.tscn
And project.godot points to scripts/game_manager.gd
And resources/player_loadout.tres points to scripts/data/player_loadout.gd
And resources/player_loadout.tres points to textures/player_card.png
And scenes/enemy.tscn points to scripts/enemy.gd
And scenes/enemy.tscn points to textures/player_card.png
And scenes/main.tscn points to scenes/enemy.tscn
And scenes/main.tscn points to scenes/player.tscn
And scenes/main.tscn points to scenes/ui/game_ui.tscn
And scenes/player.tscn points to scripts/player.gd
And scenes/player.tscn points to textures/player_card.png
And scenes/ui/game_ui.tscn points to scenes/ui/loadout_preview.tscn
And scenes/ui/loadout_preview.tscn points to resources/player_loadout.tres
And scenes/ui/loadout_preview.tscn points to scripts/ui/loadout_preview.gd
And scenes/ui/loadout_preview.tscn points to textures/player_card.png
And scripts/enemy.gd points to scripts/utils/math_helpers.gd
And scripts/game_manager.gd points to scenes/enemy.tscn
And scripts/game_manager.gd points to scenes/player.tscn
And scripts/game_manager.gd points to scenes/ui/game_ui.tscn
And scripts/player.gd points to resources/player_loadout.tres
And scripts/player.gd points to scenes/ui/loadout_preview.tscn
And scripts/player.gd points to scripts/utils/math_helpers.gd
