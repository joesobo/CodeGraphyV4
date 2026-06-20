Feature: Haskell Example

Scenario: Haskell example renders expected file nodes and module import relationships

Given I open the examples/example-haskell workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
And I can see there are 6 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-haskell workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are Imports, References, Calls
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 6 nodes and 3 connections
And src/Main.hs points to src/App/Feature/Runner.hs
And src/Main.hs points to src/App/Model/User.hs
And src/App/Feature/Runner.hs points to src/App/Model/User.hs

And README.md is an orphan node
And example-haskell.cabal is an orphan node
And .gitignore is an orphan node

When I toggle the Imports edge off
And I toggle the Calls edge on
Then I can see there are 6 nodes and 2 connections
And src/Main.hs points to src/App/Feature/Runner.hs
And src/Main.hs points to src/App/Model/User.hs
