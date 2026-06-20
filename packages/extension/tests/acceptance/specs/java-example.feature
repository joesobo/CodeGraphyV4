Feature: Java Example

Scenario: Java example renders expected file nodes and import relationships

Given I open the examples/example-java workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
And I can see there are 6 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-java workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are Imports, References, Calls, Inherits
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 6 nodes and 1 connection
And src/com/example/app/App.java points to src/com/example/app/Helper.java

And README.md is an orphan node

When I toggle the Imports edge off
And I toggle the Inherits edge on
Then I can see there are 6 nodes and 2 connections
And src/com/example/app/App.java points to src/com/example/app/BaseService.java
And src/com/example/app/App.java points to src/com/example/app/RunnableThing.java

When I toggle the Inherits edge off
And I toggle the Calls edge on
Then I can see there are 6 nodes and 1 connection
And src/com/example/app/App.java points to src/com/example/app/Helper.java
