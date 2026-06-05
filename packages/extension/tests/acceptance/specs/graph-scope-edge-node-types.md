# Feature: Graph Scope Edge And Node Types

## Scenario: C++ graph scope shows each relevant edge type by itself

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

When I show only the Folder and File node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Nests edge on
Then the top right of the graph says "8 connections"
And src points to src/app.cpp
And src/lib points to src/lib/widget.hpp

When I show only the File and Class node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Contains edge on
Then the top right of the graph says "2 connections"
And src/app.cpp points to src/app.cpp#Runner:class
And src/lib/widget.hpp points to src/lib/widget.hpp#Widget:class

When I show only the File and Class node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Inherits edge on
Then the top right of the graph says "1 connection"
And src/app.cpp#Runner:class points to src/lib/widget.hpp#Widget:class

When I show only the File and Function node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Overrides edge on
Then the top right of the graph says "1 connection"
And src/app.cpp#render:method points to src/lib/widget.hpp#render:method

## Scenario: References edges can be shown by themselves

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

## Scenario: Calls edges can be shown by themselves between symbols

Given I open the examples/example-python workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File and Function node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Calls edge on
Then the top right of the graph says "14 connections"
And src/main.py#main:function points to src/services/api.py#fetch_user:function
And src/main.py#main:function points to src/utils/helpers.py#summarize_user:function
And src/services/api.py#fetch_user:function points to src/utils/helpers.py#process_data:function

## Scenario: Type imports edges can be shown by themselves

Given I open the examples/example-vue workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Type imports edge on
Then the top right of the graph says "3 connections"
And src/data/users.ts points to src/types.ts
And src/components/UserCard.vue points to src/types.ts
And src/components/CounterPanel.vue points to src/types.ts

## Scenario: Loads edges can be shown by themselves

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

## Scenario: Pascal graph scope shows each relevant edge type by itself

Given I open the examples/example-pascal workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Imports edge on
Then the top right of the graph says "9 connections"
And src/SampleApp.pas points to src/RunnerSupport.pas
And src/SampleApp.pas points to src/OrderRepository.pas

When I show only the File and Class node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Contains edge on
Then the top right of the graph says "5 connections"
And src/SampleApp.pas points to src/SampleApp.pas#TAppRunner:class
And src/RunnerSupport.pas points to src/RunnerSupport.pas#TBaseRunner:class

When I show only the File and Function node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Contains edge on
Then the top right of the graph says "6 connections"
And src/SampleApp.pas points to src/SampleApp.pas#Run:method
And src/RunnerSupport.pas points to src/RunnerSupport.pas#Start:method

When I show only the File and Class node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Inherits edge on
Then the top right of the graph says "1 connection"
And src/SampleApp.pas points to src/RunnerSupport.pas

When I show only the Function node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Overrides edge on
Then the top right of the graph says "1 connection"
And src/SampleApp.pas#Start:method points to src/RunnerSupport.pas#Start:method
