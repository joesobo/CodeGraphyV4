# Feature: Graph Scope Edge And Node Types

## Scenario: Imports edges works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Imports edge on
Then the top right of the graph says "2 connections"
And src/app.cpp points to src/lib/widget.hpp
And src/lib/widget.cpp points to src/lib/widget.hpp

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

## Scenario: Calls edges work

Given I open the examples/example-python workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File and Function node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Calls edge on
Then the top right of the graph says "10 connections"
And src/main.py#main:function points to src/services/api.py#fetch_user:function
And src/main.py#main:function points to src/utils/helpers.py#summarize_user:function
And src/services/api.py#fetch_user:function points to src/utils/helpers.py#process_data:function

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

## Scenario: Inherits edges works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Inherits edge on
Then the top right of the graph says "1 connection"
And src/app.cpp points to src/lib/widget.hpp

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
Then the top right of the graph says "22 connections"
And project.godot points to scenes/main.tscn
And scripts/player.gd points to resources/player_loadout.tres

## Scenario: Nests edges work

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
When I show only the Folder and File node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Nests edge on
Then the top right of the graph says "8 connections"
And src points to src/app.cpp
And src/lib points to src/lib/widget.hpp

## Scenario: Contains edges works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
When I show only the File and Class node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Contains edge on
Then the top right of the graph says "2 connections"
And src/app.cpp points to src/app.cpp#Runner:class
And src/lib/widget.hpp points to src/lib/widget.hpp#Widget:class

## Scenario: Overrides edges works

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Overrides edge on
Then the top right of the graph says "1 connection"
And src/app.cpp points to src/lib/widget.hpp
