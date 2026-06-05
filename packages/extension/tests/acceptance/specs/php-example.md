# Feature: PHP Example

## Scenario: PHP example renders expected file nodes and namespace relationships

Given I open the examples/example-php workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-php workspace

Then I can see there are 7 nodes and 3 connections
And src/App/Feature/Runner.php points to src/App/Base/BaseRunner.php
And src/App/Feature/Runner.php points to src/App/Contracts/Runnable.php
And src/App/Feature/Runner.php points to src/App/Model/User.php

And README.md is an orphan node
And composer.json is an orphan node
And .gitignore is an orphan node

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Inherits edge on
Then the top right of the graph says "2 connections"
And src/App/Feature/Runner.php points to src/App/Base/BaseRunner.php
And src/App/Feature/Runner.php points to src/App/Contracts/Runnable.php
