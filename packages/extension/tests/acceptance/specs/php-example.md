# Feature: PHP Example

## Scenario: PHP example renders expected file nodes and namespace relationships

Given I open the examples/example-php workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-php workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Inherits
And I close the Graph Scope

Then I can see there are 7 nodes and 3 connections
And src/App/Feature/Runner.php points to src/App/Base/BaseRunner.php
And src/App/Feature/Runner.php points to src/App/Contracts/Runnable.php
And src/App/Feature/Runner.php points to src/App/Model/User.php

And README.md is an orphan node
And composer.json is an orphan node
And .gitignore is an orphan node
