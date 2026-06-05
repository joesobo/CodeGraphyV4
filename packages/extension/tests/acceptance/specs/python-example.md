# Feature: Python Example

## Scenario: Python example renders expected file nodes and import relationships

Given I open the examples/example-python workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-python workspace

Then I can see there are 15 nodes and 11 connections
And src/main.py points to src/utils/helpers.py
And src/main.py points to src/config.py
And src/main.py points to src/services/api.py
And src/utils/__init__.py points to src/utils/helpers.py
And src/utils/__init__.py points to src/utils/format.py
And src/utils/helpers.py points to src/utils/format.py
And src/services/api.py points to src/utils/helpers.py
And src/member_imports.py points to src/services/api.py
And src/member_imports.py points to src/utils/helpers.py
And src/services/__init__.py points to src/services/api.py
And src/namespace_consumer.py points to src/ns_pkg/member.py

And src/orphan.py is an orphan node
And README.md is an orphan node
And .gitignore is an orphan node
And pyproject.toml is an orphan node
And .vscode/settings.json is an orphan node
