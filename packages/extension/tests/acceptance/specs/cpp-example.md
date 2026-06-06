# Feature: C++ Example

## Scenario: C++ example renders expected file nodes and include relationships

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-cpp workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Inherits, Contains, Overrides
And I close the Graph Scope

Then I can see there are 6 nodes and 2 connections
And src/app.cpp points to src/lib/widget.hpp
And src/lib/widget.cpp points to src/lib/widget.hpp

And README.md is an orphan node
And CMakeLists.txt is an orphan node
And .gitignore is an orphan node
