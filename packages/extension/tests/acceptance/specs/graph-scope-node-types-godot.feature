Feature: Graph Scope Node Types - Godot

Scenario: Godot class_name node type shows plugin-owned classes

Given I open the examples/example-godot workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on

When I show no edge types
And I show only the File and Godot class_name node types
Then I can see there are 26 nodes and 7 connections
And scripts/player.gd points to scripts/player.gd#Player:class:class_name%20Player
And scripts/enemy.gd points to scripts/enemy.gd#Enemy:class:class_name%20Enemy
And scripts/game_manager.gd points to scripts/game_manager.gd#GameManager:class:class_name%20GameManager
