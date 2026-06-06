# Feature: C++ Example

## Scenario: C++ example renders expected file nodes and include relationships

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 6 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-cpp workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Inherits, Contains, Overrides
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 6 nodes and 2 connections
And src/app.cpp points to src/lib/widget.hpp
And src/lib/widget.cpp points to src/lib/widget.hpp

And README.md is an orphan node
And CMakeLists.txt is an orphan node
And .gitignore is an orphan node

Then I toggle the Imports edge off
And I toggle the Class node on
Then I can see there are 8 nodes and 0 connections
Then I toggle the Contains edge on
Then I can see there are 8 nodes and 2 connections
And src/app.cpp points to src/app.cpp#Runner:class
And src/lib/widget.hpp points to src/lib/widget.hpp#Widget:class

Then I toggle the Contains edge off
And I toggle the Class node off
And I toggle the Inherits edge on
Then I can see there are 6 nodes and 1 connections
And src/app.cpp points to src/lib/widget.hpp

Then I toggle the Overrides edge on
Then I can see there are 6 nodes and 2 connections
And src/app.cpp has 2 edges pointing to src/lib/widget.hpp
