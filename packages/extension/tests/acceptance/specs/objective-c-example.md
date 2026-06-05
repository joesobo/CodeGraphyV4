# Feature: Objective-C Example

## Scenario: Objective-C example renders expected file nodes and import relationships

Given I open the examples/example-objective-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-objective-c workspace

Then I can see there are 15 nodes and 15 connections
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
And Sources/Feature/UserCardView.h points to Sources/Feature/AppView.h
And Sources/Feature/UserCardView.h points to Sources/Feature/ProfileRenderable.h
And Sources/Feature/UserCardView.m points to Sources/Feature/UserCardView.h
And Sources/Feature/UserCardView.m points to Sources/Models/UserProfile.h
And Sources/Models/UserProfile.m points to Sources/Models/UserProfile.h

And README.md is an orphan node

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Inherits edge on
Then the top right of the graph says "2 connections"
And Sources/Feature/UserCardView.h points to Sources/Feature/AppView.h
And Sources/Feature/UserCardView.h points to Sources/Feature/ProfileRenderable.h
