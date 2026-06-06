# Feature: C# Example

## Scenario: C# example renders expected file nodes and using relationships

Given I open the examples/example-csharp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 11 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-csharp workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Inherits
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 11 nodes and 3 connections
And src/Program.cs points to src/Services/ApiService.cs
And src/Program.cs points to src/Utils/Helpers.cs
And src/Services/ApiService.cs points to src/Contracts/IRunner.cs

And src/Orphan.cs is an orphan node
And src/Services/BaseService.cs is an orphan node
And README.md is an orphan node
And .gitignore is an orphan node
And .vscode/settings.json is an orphan node

Then I toggle the Imports edge off
And I toggle the References edge on
Then I can see there are 11 nodes and 4 connections
And src/Program.cs points to src/Config.cs
And src/Program.cs points to src/Services/ApiService.cs
And src/Program.cs points to src/Utils/Helpers.cs
And src/Utils/Helpers.cs points to src/Utils/Formatter.cs

Then I toggle the References edge off
And I toggle the Inherits edge on
Then I can see there are 11 nodes and 2 connections
And src/Services/ApiService.cs points to src/Services/BaseService.cs
And src/Services/ApiService.cs points to src/Contracts/IRunner.cs
