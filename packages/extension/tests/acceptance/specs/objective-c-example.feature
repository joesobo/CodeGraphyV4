Feature: Objective-C Example

Scenario: Objective-C example renders expected file nodes and import relationships

Given I open the examples/example-objective-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
And I can see there are 15 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-objective-c workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are Imports, References, Calls, Inherits
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 15 nodes and 15 connections
And Sources/main.m points to Sources/AppDelegate.h
And Sources/AppDelegate.m points to Sources/AppDelegate.h

And README.md is an orphan node

When I toggle the Imports edge off
And I toggle the Inherits edge on
Then I can see there are 15 nodes and 2 connections
And Sources/Feature/UserCardView.h points to Sources/Feature/AppView.h
And Sources/Feature/UserCardView.h points to Sources/Feature/ProfileRenderable.h

When I toggle the Inherits edge off
And I toggle the Calls edge on
Then I can see there are 15 nodes and 6 connections
And Sources/main.m points to Sources/AppDelegate.h
And Sources/AppDelegate.m points to Sources/Data/SessionStore.h
And Sources/AppDelegate.m points to Sources/Controllers/DashboardController.h
And Sources/Controllers/DashboardController.m points to Sources/Data/SessionStore.h
And Sources/Controllers/DashboardController.m points to Sources/Feature/UserCardView.h
And Sources/Data/SessionStore.m points to Sources/Models/UserProfile.h
