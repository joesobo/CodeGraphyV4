Feature: Graph Scope Node Types - Godot

Scenario: Godot class_name node type works

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on
And I show no edge types
When I show only the File and Godot class_name node types
Then I can see there are 35 nodes and 0 connections
And the visible graph includes the Godot class_name node Player from scripts/player.gd
And the visible graph includes the Godot class_name node Enemy from scripts/enemy.gd
And the visible graph includes the Godot class_name node Entity from scripts/base/entity.gd
And the visible graph includes the Godot class_name node Main from scripts/main.gd
And the visible graph includes the Godot class_name node Projectile from scripts/projectile.gd
And the visible graph includes the Godot class_name node EnemySpawner from scripts/spawning/enemy_spawner.gd
And the visible graph includes the Godot class_name node SpawnConfig from scripts/data/spawn_config.gd
And the visible graph includes the Godot class_name node HealthBar from scripts/ui/health_bar.gd
And the visible graph includes the Godot class_name node GameSessionManager from scripts/game_manager.gd
And the visible graph includes the Godot class_name node HealthComponent from scripts/components/health_component.gd
And the visible graph includes the Godot class_name node GameUI from scripts/ui/game_ui.gd
And the visible graph includes the Godot class_name node MathHelpers from scripts/utils/math_helpers.gd
When I toggle the Contains edge on
Then I can see there are 35 nodes and 12 connections
And scripts/player.gd owns the Godot class_name node Player
And scripts/spawning/enemy_spawner.gd owns the Godot class_name node EnemySpawner

Scenario: Scene node type works

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on
And I show no edge types
When I show only the File and Scene node types
Then I can see there are 28 nodes and 0 connections
And the visible graph includes the Scene node Main from scenes/main.tscn
And the visible graph includes the Scene node Player from scenes/player.tscn
And the visible graph includes the Scene node Enemy from scenes/enemy.tscn
And the visible graph includes the Scene node Projectile from scenes/projectile.tscn
And the visible graph includes the Scene node GameUI from scenes/ui/game_ui.tscn
When I toggle the Contains edge on
Then I can see there are 28 nodes and 5 connections
And scenes/main.tscn owns the Scene node Main
And scenes/player.tscn owns the Scene node Player

Scenario: Resource node type works

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on
And I show no edge types
When I show only the File and Resource node types
Then I can see there are 24 nodes and 0 connections
And the visible graph includes the Resource node EnemySpawnConfig from resources/enemy_spawn_config.tres
When I toggle the Contains edge on
Then I can see there are 24 nodes and 1 connection
And resources/enemy_spawn_config.tres owns the Resource node EnemySpawnConfig

Scenario: Autoload node type works

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on
And I show no edge types
When I show only the File and Autoload node types
Then I can see there are 24 nodes and 0 connections
And the visible graph includes the Autoload node GameManager from project.godot
When I toggle the Contains edge on
Then I can see there are 24 nodes and 1 connection
And project.godot owns the Autoload node GameManager

Scenario: Scene Node node type works

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on
And I show no edge types
When I show only the File and Scene Node node types
Then I can see there are 53 nodes and 0 connections
And the visible graph includes the Scene Node node HealthComponent from scenes/player.tscn
And the visible graph includes the Scene Node node CollisionShape2D from scenes/player.tscn
And the visible graph includes the Scene Node node BodyVisual from scenes/player.tscn
And the visible graph includes the Scene Node node Ground from scenes/main.tscn
And the visible graph includes the Scene Node node EnemySpawner from scenes/main.tscn
And the visible graph includes the Scene Node node SpawnVisual from scenes/main.tscn
And the visible graph includes the Scene Node node HealthBar from scenes/player.tscn
And the visible graph includes the Scene Node node Visual from scenes/projectile.tscn
When I toggle the Contains edge on
Then I can see there are 53 nodes and 30 connections
And scenes/player.tscn owns the Scene Node node HealthComponent
And scenes/main.tscn owns the Scene Node node EnemySpawner
And scenes/projectile.tscn owns the Scene Node node Visual

Scenario: Signal node type works

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on
And I show no edge types
When I show only the File and Signal node types
Then I can see there are 31 nodes and 0 connections
And the visible graph includes the Signal node fired from scripts/player.gd
And the visible graph includes the Signal node hit_target from scripts/projectile.gd
And the visible graph includes the Signal node enemy_spawned from scripts/spawning/enemy_spawner.gd
And the visible graph includes the Signal node died from scripts/components/health_component.gd
And the visible graph includes the Signal node score_changed from scripts/game_manager.gd
When I toggle the Contains edge on
Then I can see there are 31 nodes and 8 connections
And scripts/player.gd owns the Signal node fired
And scripts/spawning/enemy_spawner.gd owns the Signal node enemy_spawned
And scripts/components/health_component.gd owns the Signal node died

Scenario: Exported Property node type works

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on
And I show no edge types
When I show only the File and Exported Property node types
And the visible graph includes the Exported Property node health_component from scripts/base/entity.gd
And the visible graph includes the Exported Property node projectile_scene from scripts/player.gd
And the visible graph includes the Exported Property node attack_damage from scripts/enemy.gd
And the visible graph includes the Exported Property node spawn_interval from scripts/spawning/enemy_spawner.gd
And the visible graph includes the Exported Property node max_health from scripts/components/health_component.gd
And the visible graph includes the Exported Property node max_active_enemies from scripts/data/spawn_config.gd
When I toggle the Contains edge on
Then I can see there are 46 nodes and 23 connections
And scripts/base/entity.gd owns the Exported Property node health_component
And scripts/player.gd owns the Exported Property node projectile_scene
And scripts/data/spawn_config.gd owns the Exported Property node max_active_enemies
