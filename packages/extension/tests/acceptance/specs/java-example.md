# Feature: Java Example

## Scenario: Java example renders expected file nodes and import relationships

Given I open the examples/example-java workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-java workspace

Then I can see there are 4 nodes and 2 connections
And src/com/example/app/App.java points to src/com/example/app/Helper.java
And src/com/example/app/App.java points to src/com/example/app/BaseService.java

And README.md is an orphan node
