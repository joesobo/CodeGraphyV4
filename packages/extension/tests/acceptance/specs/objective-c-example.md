# Feature: Objective-C Example

## Scenario: Objective-C example renders expected file nodes and import relationships

Given I open the examples/example-objective-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-objective-c workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References
And I close the Graph Scope

Then I can see there are 13 nodes and 13 connections
And Sources/main.m points to Sources/AppDelegate.h
And Sources/AppDelegate.m points to Sources/AppDelegate.h
And Sources/AppDelegate.m points to Sources/Controllers/DashboardController.h
And Sources/AppDelegate.m points to Sources/Data/SessionStore.h
And Sources/Controllers/DashboardController.m points to Sources/Controllers/DashboardController.h
And Sources/Controllers/DashboardController.m points to Sources/Data/SessionStore.h
And Sources/Controllers/DashboardController.m points to Sources/Feature/UserCardView.h
And Sources/Controllers/DashboardController.m points to Sources/Models/UserProfile.h
And Sources/Data/SessionStore.m points to Sources/Data/SessionStore.h
And Sources/Data/SessionStore.m points to Sources/Models/UserProfile.h
And Sources/Feature/UserCardView.m points to Sources/Feature/UserCardView.h
And Sources/Feature/UserCardView.m points to Sources/Models/UserProfile.h
And Sources/Models/UserProfile.m points to Sources/Models/UserProfile.h

And README.md is an orphan node
