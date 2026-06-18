# Feature: Graph Scope Node Types

## Scenario: File node type works

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File node type
Then I can see there are 18 nodes and 0 connections
And src/index.ts is an orphan node
And src/palette.ts is an orphan node
And tsconfig.json is an orphan node

## Scenario: Folder node type works

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Folder node types
Then I can see there are 21 nodes and 0 connections
And src is an orphan node
And src/alias is an orphan node

## Scenario: Package node type works

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Package node types
Then I can see there are 19 nodes and 0 connections
And pkg:workspace:. is an orphan node

## Scenario: Symbol node type gates symbol children

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File, Class and Global node types
Then I can see there are 18 nodes and 0 connections
And the visible graph includes the Class node Task from src/task.hpp
And the visible graph includes the Global node next_task_id from src/seed.cpp
When I toggle the Symbol node off
Then I can see there are 13 nodes and 0 connections
When I toggle the Symbol node on
Then I can see there are 18 nodes and 0 connections
And the visible graph includes the Class node Task from src/task.hpp
And the visible graph includes the Global node next_task_id from src/seed.cpp

## Scenario: Namespace node type works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Namespace node types
Then I can see there are 14 nodes and 0 connections
And the visible graph includes the Namespace node taskrunner from src/task.hpp

## Scenario: Function node type works

Given I open the examples/example-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Function node types
Then I can see there are 15 nodes and 0 connections
And src/main.c#main:function is an orphan node

## Scenario: Prototype node type works

Given I open the examples/example-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Prototype node types
Then I can see there are 13 nodes and 0 connections
And src/logger/logger.h#logger_init:prototype is an orphan node
And src/logger/logger.h#logger_write:prototype is an orphan node
And src/logger/logger.h#logger_flush:prototype is an orphan node
And src/logger/format.h#logger_level_name:prototype is an orphan node
And src/logger/format.h#logger_format_line:prototype is an orphan node

## Scenario: Class node type works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Class node types
Then I can see there are 17 nodes and 0 connections
And the visible graph includes the Class node Task from src/task.hpp
And the visible graph includes the Class node Worker from src/worker.hpp
And the visible graph includes the Class node ConsoleWorker from src/worker.hpp
And the visible graph includes the Class node TaskRunner from src/runner.hpp

## Scenario: Interface node type works

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Interface node types
Then I can see there are 20 nodes and 0 connections
And src/paletteExporter.ts#PaletteExporter:interface is an orphan node
And src/types.ts#PaletteRecipe:interface is an orphan node

## Scenario: Type node type works

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Type node types
Then I can see there are 19 nodes and 0 connections
And src/types.ts#PaletteMood:type is an orphan node

## Scenario: Struct node type works

Given I open the examples/example-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Struct node types
Then I can see there are 10 nodes and 0 connections
And src/logger/logger.h#Logger:struct is an orphan node
And src/logger/format.h#LogRecord:struct is an orphan node

## Scenario: Union node type works

Given I open the examples/example-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Union node types
Then I can see there are 9 nodes and 0 connections
And src/logger/format.h#LogMessage:union is an orphan node

## Scenario: Enum node type works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Enum node types
Then I can see there are 15 nodes and 0 connections
And the visible graph includes the Enum node Priority from src/task.hpp
And the visible graph includes the Enum node TaskStatus from src/task.hpp

## Scenario: Typedef node type works

Given I open the examples/example-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Typedef node types
Then I can see there are 12 nodes and 0 connections
And src/logger/logger.h#LogLevel:typedef is an orphan node
And src/logger/logger.h#Logger:typedef is an orphan node
And src/logger/format.h#LogMessage:typedef is an orphan node
And src/logger/format.h#LogRecord:typedef is an orphan node

## Scenario: Callable node type works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Callable node types
Then I can see there are 17 nodes and 0 connections
And the visible graph includes the Callable node main from src/app.cpp
And the visible graph includes the Callable node make_task from src/seed.cpp
And the visible graph includes the Callable node seed_tasks from src/seed.cpp
And the visible graph includes the Callable node priority_name from src/task.cpp

## Scenario: Method node type works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Method node types
Then I can see there are 30 nodes and 0 connections
And the visible graph includes the Method node TaskRunner::run from src/runner.cpp
And the visible graph includes the Method node ConsoleWorker::execute from src/worker.cpp
And the visible graph includes the Method node Task::mark_completed from src/task.cpp

## Scenario: Alias node type works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Alias node types
Then I can see there are 16 nodes and 0 connections
And the visible graph includes the Alias node TaskId from src/task.hpp
And the visible graph includes the Alias node TaskList from src/seed.hpp
And the visible graph includes the Alias node PendingTaskQueue from src/task_queue.hpp

## Scenario: Template node type works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Template node types
Then I can see there are 14 nodes and 0 connections
And the visible graph includes the Template node TaskQueue from src/task_queue.hpp

## Scenario: Variable node type gates variable children

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File, Global and Constant node types
Then I can see there are 16 nodes and 0 connections
And the visible graph includes the Global node next_task_id from src/seed.cpp
And the visible graph includes the Constant node kDefaultPriority from src/seed.cpp
When I toggle the Variable node off
Then I can see there are 13 nodes and 0 connections
When I toggle the Variable node on
Then I can see there are 16 nodes and 0 connections
And the visible graph includes the Global node next_task_id from src/seed.cpp
And the visible graph includes the Constant node kDefaultPriority from src/seed.cpp

## Scenario: Global node type works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Global node types
Then I can see there are 14 nodes and 0 connections
And the visible graph includes the Global node next_task_id from src/seed.cpp

## Scenario: Constant node type works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Constant node types
Then I can see there are 15 nodes and 0 connections
And the visible graph includes the Constant node kInitialStatus from src/task.cpp
And the visible graph includes the Constant node kDefaultPriority from src/seed.cpp

## Scenario: Field node type works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Field node types
Then I can see there are 20 nodes and 0 connections
And the visible graph includes the Field node queue_ from src/runner.hpp
And the visible graph includes the Field node worker_ from src/runner.hpp
And the visible graph includes the Field node items_ from src/task_queue.hpp
And the visible graph includes the Field node status_ from src/task.hpp

## Scenario: Parameter node type works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Parameter node types
Then I can see there are 24 nodes and 0 connections
And the visible graph includes the Parameter node task from src/runner.cpp
And the visible graph includes the Parameter node worker from src/runner.cpp
And the visible graph includes the Parameter node priority from src/seed.cpp

## Scenario: Local node type works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Local node types
Then I can see there are 24 nodes and 0 connections
And the visible graph includes the Local node completed from src/runner.cpp
And the visible graph includes the Local node tasks from src/seed.cpp
And the visible graph includes the Local node id from src/seed.cpp

## Scenario: Godot class_name node type works

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

## Scenario: Scene node type works

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

## Scenario: Resource node type works

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

## Scenario: Autoload node type works

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

## Scenario: Scene Node node type works

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

## Scenario: Signal node type works

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

## Scenario: Exported Property node type works

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
