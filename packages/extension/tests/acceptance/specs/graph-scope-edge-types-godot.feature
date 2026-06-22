Feature: Graph Scope Edge Types - Godot

Scenario: Loads edges work

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on
And I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Loads edge on
Then the top right of the graph says "25 connections"
And project.godot points to scenes/main.tscn
And project.godot points to scripts/game_manager.gd
And scripts/player.gd points to scenes/projectile.tscn
And scenes/main.tscn points to scripts/main.gd
And scenes/main.tscn points to scripts/spawning/enemy_spawner.gd
And scripts/spawning/enemy_spawner.gd points to scenes/enemy.tscn
And scripts/spawning/enemy_spawner.gd points to resources/enemy_spawn_config.tres
And scenes/player.tscn points to scripts/components/health_component.gd
And scenes/ui/game_ui.tscn points to scripts/ui/game_ui.gd

Scenario: Godot Contains edges work

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on
And I show only the File, Godot class_name, Scene, Resource, Autoload, Scene Node, Signal and Exported Property node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Contains edge on
Then the top right of the graph says "80 connections"
And scripts/player.gd owns the Godot class_name node Player
And scenes/main.tscn owns the Scene node Main
And resources/enemy_spawn_config.tres owns the Resource node EnemySpawnConfig
And project.godot owns the Autoload node GameManager
And scenes/player.tscn owns the Scene Node node HealthComponent
And scripts/player.gd owns the Signal node fired
And scripts/player.gd owns the Exported Property node projectile_scene

Scenario: Godot Signal Connections edges work

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on
And I show only the File and Signal node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Signal Connections edge on
Then the top right of the graph says "5 connections"
And the Signal node died from scripts/components/health_component.gd connects to scripts/base/entity.gd
And the Signal node enemy_spawned from scripts/spawning/enemy_spawner.gd connects to scripts/main.gd
And the Signal node health_changed from scripts/components/health_component.gd connects to scripts/ui/health_bar.gd
