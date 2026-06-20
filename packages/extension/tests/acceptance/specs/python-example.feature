Feature: Python Example

Background:

Given I open the examples/example-python workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace

Scenario: Python example renders file nodes and import relationships

Then I see graph nodes
And I show no edge types
And I can see there are 16 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-python workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are Imports, References, Calls, Inherits
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 16 nodes and 12 connections
And src/main.py points to src/utils/helpers.py
And src/main.py points to src/config.py
And src/main.py points to src/services/api.py
And src/utils/__init__.py points to src/utils/helpers.py
And src/utils/__init__.py points to src/utils/format.py
And src/utils/helpers.py points to src/utils/format.py
And src/services/api.py points to src/utils/helpers.py
And src/services/api.py points to src/services/base.py
And src/member_imports.py points to src/services/api.py
And src/member_imports.py points to src/utils/helpers.py
And src/services/__init__.py points to src/services/api.py
And src/namespace_consumer.py points to src/ns_pkg/member.py

And src/orphan.py is an orphan node
And README.md is an orphan node
And .gitignore is an orphan node
And pyproject.toml is an orphan node
And .vscode/settings.json is an orphan node

Scenario: Python example exposes inheritance and call relationships

When I toggle the Inherits edge on
Then I can see there are 16 nodes and 1 connection
And src/services/api.py points to src/services/base.py

When I toggle the Inherits edge off
And I toggle the Calls edge on
Then I can see there are 16 nodes and 6 connections
And src/main.py points to src/config.py
And src/main.py points to src/services/api.py
And src/main.py points to src/utils/helpers.py
And src/services/api.py points to src/utils/helpers.py
And src/utils/helpers.py points to src/utils/format.py
And src/namespace_consumer.py points to src/ns_pkg/member.py
