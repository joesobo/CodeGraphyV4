# Feature: Haskell Example

## Scenario: Haskell example renders expected file nodes and module import relationships

Given I open the examples/example-haskell workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-haskell workspace

Then I can see there are 5 nodes and 2 connections
And src/Main.hs points to src/App/Feature/Runner.hs
And src/App/Feature/Runner.hs points to src/App/Model/User.hs

And README.md is an orphan node
And example-haskell.cabal is an orphan node
