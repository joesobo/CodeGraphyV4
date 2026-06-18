# Feature: Graph Scope Edge Types

## Scenario: Include edges work

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Include edge on
Then the top right of the graph says "12 connections"
And src/app.cpp points to src/runner.hpp
And src/app.cpp points to src/seed.hpp
And src/app.cpp points to src/worker.hpp
And src/runner.cpp points to src/runner.hpp
And src/runner.hpp points to src/task_queue.hpp
And src/runner.hpp points to src/worker.hpp
And src/seed.cpp points to src/seed.hpp
And src/seed.hpp points to src/task.hpp
And src/task.cpp points to src/task.hpp
And src/task_queue.hpp points to src/task.hpp
And src/worker.cpp points to src/worker.hpp
And src/worker.hpp points to src/task.hpp

## Scenario: Imports edges work

Given I open the examples/example-vue workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Imports edge on
Then the top right of the graph says "9 connections"
And src/main.ts points to src/App.vue
And src/App.vue points to src/components/CounterPanel.vue
And src/App.vue points to src/components/UserCard.vue
And src/App.vue points to src/components/LazyProfilePanel.vue
And src/App.vue points to src/data/users.ts
And src/App.vue points to src/composables/useCounter.ts
And src/components/LazyProfilePanel.vue points to src/data/users.ts
And src/components/CounterPanel.vue points to src/components/StatusBadge.vue
And src/components/CounterPanel.vue points to src/composables/useCounter.ts

## Scenario: References edges work

Given I open the examples/example-markdown workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the References edge on
Then the top right of the graph says "4 connections"
And notes/Home.md points to notes/Architecture.md
And notes/Home.md points to notes/assets/Diagram.md
And notes/Home.md points to src/commented.ts
And src/commented.ts points to notes/Architecture.md

## Scenario: Calls edges work

Given I open the examples/example-python workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Calls edge on
Then the top right of the graph says "6 connections"
And src/main.py points to src/config.py
And src/main.py points to src/services/api.py
And src/main.py points to src/utils/helpers.py
And src/services/api.py points to src/utils/helpers.py
And src/utils/helpers.py points to src/utils/format.py
And src/namespace_consumer.py points to src/ns_pkg/member.py

## Scenario: Type imports edges work

Given I open the examples/example-vue workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Type imports edge on
Then the top right of the graph says "4 connections"
And src/data/users.ts points to src/types.ts
And src/components/UserCard.vue points to src/types.ts
And src/components/CounterPanel.vue points to src/types.ts
And src/types.ts points to src/inheritance.ts

## Scenario: TypeScript Alias Import edges work

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the TypeScript/JavaScript plugin on
And I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Typescript Alias Import edge on
Then the top right of the graph says "1 connection"
And src/index.ts points to src/alias/themePack.ts

## Scenario: Inherits edges work

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File and Class node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Inherits edge on
Then the top right of the graph says "1 connection"
And src/worker.hpp#ConsoleWorker:class points to src/worker.hpp#Worker:class

## Scenario: Loads edges work

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

## Scenario: Nests edges work

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the Folder and File node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Nests edge on
Then the top right of the graph says "14 connections"
And (root) points to .gitignore
And (root) points to CMakeLists.txt
And (root) points to README.md
And (root) points to src
And src points to src/app.cpp
And src points to src/runner.cpp
And src points to src/runner.hpp
And src points to src/seed.cpp
And src points to src/seed.hpp
And src points to src/task.cpp
And src points to src/task.hpp
And src points to src/task_queue.hpp
And src points to src/worker.cpp
And src points to src/worker.hpp

## Scenario: Contains edges work

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File and Class node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Contains edge on
Then the top right of the graph says "4 connections"
And src/task.hpp points to src/task.hpp#Task:class
And src/worker.hpp points to src/worker.hpp#Worker:class
And src/worker.hpp points to src/worker.hpp#ConsoleWorker:class
And src/runner.hpp points to src/runner.hpp#TaskRunner:class

## Scenario: Godot Contains edges work

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

## Scenario: Godot Signal Connections edges work

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

## Scenario: Overrides edges work

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File, Class and Method node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Overrides edge on
Then the top right of the graph says "1 connection"
And src/worker.hpp#ConsoleWorker:class points to src/worker.hpp#Worker::execute:method
