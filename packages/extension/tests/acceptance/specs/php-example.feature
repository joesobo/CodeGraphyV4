Feature: PHP Example

Scenario: PHP example renders expected file nodes and namespace relationships

Given I open the examples/example-php workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
And I can see there are 7 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-php workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are Imports, References, Calls, Inherits
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 7 nodes and 3 connections
And src/App/Feature/Runner.php points to src/App/Base/BaseRunner.php
And src/App/Feature/Runner.php points to src/App/Contracts/Runnable.php
And src/App/Feature/Runner.php points to src/App/Model/User.php

And README.md is an orphan node
And composer.json is an orphan node
And .gitignore is an orphan node

When I toggle the Imports edge off
And I toggle the Inherits edge on
Then I can see there are 7 nodes and 2 connections
And src/App/Feature/Runner.php points to src/App/Base/BaseRunner.php
And src/App/Feature/Runner.php points to src/App/Contracts/Runnable.php

When I toggle the Inherits edge off
And I toggle the Calls edge on
Then I can see there are 7 nodes and 0 connections
