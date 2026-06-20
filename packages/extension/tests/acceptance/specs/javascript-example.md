# Feature: JavaScript Example

## Scenario: JavaScript example renders expected file relationships

Given I open the examples/example-javascript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 13 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-javascript workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Inherits
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 13 nodes and 7 connections
And src/index.js points to src/user.js
And src/index.js points to src/utils.js
And src/runner.js points to src/baseRunner.js
And src/runner.js points to src/runnableThing.js
And src/utils.js points to src/depth.js
And src/depth.js points to src/leaf.js

And src/orphan.js is an orphan node
And README.md is an orphan node
And package.json is an orphan node
And .gitignore is an orphan node
And jsconfig.json is an orphan node

Then I toggle the Imports edge off
And I toggle the Inherits edge on
Then I can see there are 13 nodes and 1 connection
And src/runner.js points to src/baseRunner.js

Then I toggle the Inherits edge off
And I toggle the Calls edge on
Then I can see there are 13 nodes and 5 connections
And src/index.js points to src/user.js
And src/index.js points to src/utils.js
And src/utils.js points to src/user.js
And src/utils.js points to src/depth.js
And src/depth.js points to src/leaf.js
