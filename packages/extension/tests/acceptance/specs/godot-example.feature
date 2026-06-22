Feature: Godot Example

Scenario: Godot example renders expected file nodes and plugin load relationships

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 23 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-godot workspace

When I click the plugins button
Then I see a list of plugins with toggles
And I toggle the GDScript (Godot) plugin on
When I toggle the References edge on
Then I see edges
When I click the Graph Scope button
And I select edge types
Then the available edge types are References, Calls, Inherits, Loads, Contains, Signal Connections
And the available Godot node types are Scene, Resource, Autoload, Scene Node, Godot class_name, Signal, Exported Property, Function, Enum, Constant, Variable
And I close the Graph Scope

And I can see there are 23 nodes and 12 connections
And scripts/player.gd points to scripts/components/health_component.gd
And scripts/player.gd points to scripts/projectile.gd
And scripts/base/entity.gd points to scripts/components/health_component.gd
And scripts/spawning/enemy_spawner.gd points to scripts/enemy.gd
And scripts/spawning/enemy_spawner.gd points to scripts/player.gd

And scripts/orphan.gd is an orphan node
And README.md is an orphan node
And .gitignore is an orphan node
And .vscode/settings.json is an orphan node

Then I toggle the Reference edge off
And I toggle the Calls edge on
Then I can see there are 23 nodes and 1 connection
And scripts/enemy.gd points to scripts/utils/math_helpers.gd

Then I toggle the Calls edge off
And I toggle the Loads edge on
Then I can see there are 23 nodes and 25 connections
And project.godot points to scenes/main.tscn
And project.godot points to scripts/game_manager.gd
And scenes/player.tscn points to scripts/components/health_component.gd
And scenes/player.tscn points to scenes/projectile.tscn
And scenes/main.tscn points to scripts/main.gd
And scenes/main.tscn points to scripts/spawning/enemy_spawner.gd
And scripts/spawning/enemy_spawner.gd points to scenes/enemy.tscn
And scripts/spawning/enemy_spawner.gd points to resources/enemy_spawn_config.tres
And scenes/ui/game_ui.tscn points to scripts/ui/game_ui.gd

Then I toggle the Loads edge off
And I toggle the Inherits edge on
Then I can see there are 23 nodes and 2 connections
And scripts/enemy.gd points to scripts/base/entity.gd
And scripts/player.gd points to scripts/base/entity.gd

Then I show no edge types
And I show only the File and Godot class_name node types
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
And scripts/utils/math_helpers.gd owns the Godot class_name node MathHelpers
Then I toggle the Contains edge off

Then I show only the File and Function node types
Then I can see there are 71 nodes and 0 connections
And the visible graph includes the Function node shoot from scripts/player.gd
And the visible graph includes the Function node set_player from scripts/enemy.gd
And the visible graph includes the Function node spawn_player from scripts/game_manager.gd
And the visible graph includes the Function node bind from scripts/ui/health_bar.gd
And the visible graph includes the Function node move_toward_angle from scripts/utils/math_helpers.gd
And the visible graph includes the Function node take_damage from scripts/components/health_component.gd
When I toggle the Contains edge on
Then I can see there are 71 nodes and 48 connections
And scripts/player.gd owns the Function node shoot
And scripts/game_manager.gd owns the Function node spawn_player
And scripts/components/health_component.gd owns the Function node take_damage
Then I toggle the Contains edge off

Then I show only the File and Enum node types
Then I can see there are 24 nodes and 0 connections
And the visible graph includes the Enum node GameState from scripts/game_manager.gd
When I toggle the Contains edge on
Then I can see there are 24 nodes and 1 connection
And scripts/game_manager.gd owns the Enum node GameState
Then I toggle the Contains edge off

Then I show only the File and Constant node types
Then I can see there are 26 nodes and 0 connections
And the visible graph includes the Constant node JUMP_VELOCITY from scripts/player.gd
And the visible graph includes the Constant node SPEED from scripts/player.gd
And the visible graph includes the Constant node SPRINT_MULTIPLIER from scripts/player.gd
When I toggle the Contains edge on
Then I can see there are 26 nodes and 3 connections
And scripts/player.gd owns the Constant node JUMP_VELOCITY
And scripts/player.gd owns the Constant node SPRINT_MULTIPLIER
Then I toggle the Contains edge off

Then I show only the File and Variable node types
Then I can see there are 96 nodes and 0 connections
And the visible graph includes the Variable node state from scripts/game_manager.gd
And the visible graph includes the Variable node owner_body from scripts/projectile.gd
And the visible graph includes the Variable node _health_component from scripts/base/entity.gd
And the visible graph includes the Variable node _can_attack from scripts/enemy.gd
And the visible graph includes the Variable node _active_enemies from scripts/spawning/enemy_spawner.gd
And the visible graph includes the Variable node patrol_speed from scripts/enemy.gd
When I toggle the Contains edge on
Then I can see there are 96 nodes and 73 connections
And scripts/game_manager.gd owns the Variable node state
And scripts/projectile.gd owns the Variable node owner_body
And scripts/spawning/enemy_spawner.gd owns the Variable node _active_enemies
Then I toggle the Contains edge off

Then I show only the File and Scene node types
Then I can see there are 28 nodes and 0 connections
And the visible graph includes the Scene node Main from scenes/main.tscn
And the visible graph includes the Scene node Player from scenes/player.tscn
And the visible graph includes the Scene node Projectile from scenes/projectile.tscn
And the visible graph includes the Scene node GameUI from scenes/ui/game_ui.tscn
When I toggle the Contains edge on
Then I can see there are 28 nodes and 5 connections
And scenes/main.tscn owns the Scene node Main
And scenes/player.tscn owns the Scene node Player
And scenes/ui/game_ui.tscn owns the Scene node GameUI
Then I toggle the Contains edge off

Then I show only the File and Resource node types
Then I can see there are 24 nodes and 0 connections
And the visible graph includes the Resource node EnemySpawnConfig from resources/enemy_spawn_config.tres
When I toggle the Contains edge on
Then I can see there are 24 nodes and 1 connection
And resources/enemy_spawn_config.tres owns the Resource node EnemySpawnConfig
Then I toggle the Contains edge off

Then I show only the File and Autoload node types
Then I can see there are 24 nodes and 0 connections
And the visible graph includes the Autoload node GameManager from project.godot
When I toggle the Contains edge on
Then I can see there are 24 nodes and 1 connection
And project.godot owns the Autoload node GameManager
Then I toggle the Contains edge off

Then I show only the File and Scene Node node types
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
Then I toggle the Contains edge off

Then I show only the File and Signal node types
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
Then I toggle the Contains edge off
When I toggle the Signal Connections edge on
Then I can see there are 31 nodes and 5 connections
And the Signal node died from scripts/components/health_component.gd connects to scripts/base/entity.gd
And the Signal node enemy_spawned from scripts/spawning/enemy_spawner.gd connects to scripts/main.gd
And the Signal node health_changed from scripts/components/health_component.gd connects to scripts/ui/health_bar.gd
Then I toggle the Signal Connections edge off

Then I show only the File and Exported Property node types
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
And scripts/spawning/enemy_spawner.gd owns the Exported Property node spawn_interval
And scripts/data/spawn_config.gd owns the Exported Property node max_active_enemies
Then I toggle the Contains edge off

Then I show only the File node type
And I show only the Signal Connections edge type
Then I can see there are 23 nodes and 5 connections
And scripts/components/health_component.gd points to scripts/base/entity.gd
And scripts/spawning/enemy_spawner.gd points to scripts/main.gd
And scripts/components/health_component.gd points to scripts/ui/health_bar.gd

Then I show only the File node type
And I show only the Contains edge type
Then I can see there are 23 nodes and 0 connections
Then I show only the File and Scene Node, Signal and Exported Property node types
And I toggle the Contains edge on
Then I can see there are 84 nodes and 61 connections
And scenes/player.tscn owns the Scene Node node HealthComponent
And scripts/player.gd owns the Signal node fired
And scripts/player.gd owns the Exported Property node projectile_scene
And scripts/base/entity.gd owns the Exported Property node health_component
