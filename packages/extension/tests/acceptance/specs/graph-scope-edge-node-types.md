# Feature: Graph Scope Edge And Node Types

## Scenario: Imports edges can be shown by themselves

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the Imports edge type
Then the top right of the graph says "2 connections"
Then src/app.cpp points to src/lib/widget.hpp
And src/lib/widget.cpp points to src/lib/widget.hpp

## Scenario: References edges can be shown by themselves

Given I open the examples/example-markdown workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the References edge type
Then the top right of the graph says "4 connections"
Then notes/Home.md points to notes/Architecture.md
And notes/Home.md points to notes/assets/Diagram.md

## Scenario: Calls edges can be shown by themselves

Given I open the examples/example-python workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the Calls edge type
Then the top right of the graph says "4 connections"
And src/main.py points to src/config.py
Then src/main.py points to src/services/api.py
And src/main.py points to src/utils/helpers.py
And src/services/api.py points to src/utils/helpers.py

## Scenario: Type imports edges can be shown by themselves

Given I open the examples/example-vue workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the Type imports edge type
Then the top right of the graph says "3 connections"
Then src/data/users.ts points to src/types.ts
And src/components/UserCard.vue points to src/types.ts
And src/components/CounterPanel.vue points to src/types.ts

## Scenario: Inherits edges can be shown by themselves

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File and Class node types
And I show only the Inherits edge type
Then the top right of the graph says "1 connection"
And src/app.cpp#Runner:class points to src/lib/widget.hpp#Widget:class

## Scenario: C++ overrides edges can be shown by themselves

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File and Function node types
And I show only the Overrides edge type
Then the top right of the graph says "1 connection"
And src/app.cpp#render:method points to src/lib/widget.hpp#render:method

## Scenario: Loads edges can be shown by themselves

Given I open the examples/example-godot workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the GDScript (Godot) plugin on
And I show only the Loads edge type
Then the top right of the graph says "28 connections"
And project.godot points to scenes/main.tscn
And scripts/player.gd points to resources/player_loadout.tres

## Scenario: Nests edges can be shown by themselves

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the Folder and File node types
And I show only the Nests edge type
Then the top right of the graph says "4 connections"
And src points to src/app.cpp
And src/lib points to src/lib/widget.hpp

## Scenario: Contains edges can be shown by themselves

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File and Class node types
And I show only the Contains edge type
Then the top right of the graph says "2 connections"
And src/app.cpp points to src/app.cpp#Runner:class
And src/lib/widget.hpp points to src/lib/widget.hpp#Widget:class

## Scenario: Pascal overrides edges can be shown by themselves

Given I open the examples/example-pascal workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the Function node type
And I show only the Overrides edge type
Then the top right of the graph says "1 connection"
And src/SampleApp.pas#Start:method points to src/RunnerSupport.pas#Start:method

## Scenario: Class nodes can be shown by themselves

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the Class node type
Then I can see a new "src/app.cpp#Runner:class" node in the graph
And I can see a new "src/lib/widget.hpp#Widget:class" node in the graph

## Scenario: Function nodes can be shown by themselves

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the Function node type
Then I can see a new "src/app.cpp#boot:function" node in the graph
And I can see a new "src/app.cpp#run:method" node in the graph
