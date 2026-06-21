Feature: Graph Scope Edge Types - Python

Scenario: Calls edge type shows Python call relationships

Given I open the examples/example-python workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Calls edge on
Then the top right of the graph says "6 connections"
And src/main.py points to src/config.py
And src/main.py points to src/services/api.py
And src/main.py points to src/utils/helpers.py
And src/services/api.py points to src/utils/helpers.py
And src/utils/helpers.py points to src/utils/format.py
And src/namespace_consumer.py points to src/ns_pkg/member.py
