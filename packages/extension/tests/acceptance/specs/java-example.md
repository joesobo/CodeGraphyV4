# Feature: Java Example

## Scenario: Java example renders expected file nodes and import relationships

Given I open the examples/example-java workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-java workspace

Then I can see there are 6 nodes and 1 connection
And src/com/example/app/App.java points to src/com/example/app/Helper.java

And README.md is an orphan node

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Inherits edge on
Then the top right of the graph says "2 connections"
And src/com/example/app/App.java points to src/com/example/app/BaseService.java
And src/com/example/app/App.java points to src/com/example/app/RunnableThing.java
