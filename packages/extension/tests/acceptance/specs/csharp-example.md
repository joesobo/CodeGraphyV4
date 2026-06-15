# Feature: C# Example

## Scenario: C# example renders expected file nodes and Tree-sitter relationships

Given I open the examples/example-csharp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 12 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-csharp workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are only Imports, References, Calls, Inherits, Contains
And I select node types
Then the available C# node types are only Function, Class, Interface, Struct, Enum, Field, Constant, Parameter, Local
And the Namespace node type is not available for the C# example
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 12 nodes and 10 connections
And src/Program.cs points to src/Services/DispatchRunner.cs
And src/Program.cs points to src/Domain/DispatchPriority.cs
And src/Services/DispatchRunner.cs points to src/Contracts/IDispatchRunner.cs
And src/Services/DispatchRunner.cs points to src/Domain/DispatchRequest.cs
And src/Services/DispatchRunner.cs points to src/Domain/DispatchTicket.cs
And src/Services/DispatchRunner.cs points to src/Presentation/DispatchReport.cs
And src/Services/DispatchQueue.cs points to src/Domain/DispatchTicket.cs

And README.md is an orphan node
And .gitignore is an orphan node
And .vscode/settings.json is an orphan node

Then I show only the Inherits edge type
Then I can see there are 12 nodes and 2 connections
And src/Services/DispatchRunner.cs points to src/Services/RunnerBase.cs
And src/Services/DispatchRunner.cs points to src/Contracts/IDispatchRunner.cs

Then I show only the References edge type
Then I can see there are 12 nodes and 11 connections
And src/Program.cs points to src/Services/DispatchRunner.cs
And src/Program.cs points to src/Domain/DispatchPriority.cs
And src/Contracts/IDispatchRunner.cs points to src/Domain/DispatchPriority.cs
And src/Services/DispatchRunner.cs points to src/Domain/DispatchRequest.cs
And src/Services/DispatchRunner.cs points to src/Domain/DispatchTicket.cs
And src/Services/DispatchRunner.cs points to src/Presentation/DispatchReport.cs
And src/Presentation/DispatchReport.cs points to src/Domain/DispatchTicket.cs
And src/Services/DispatchQueue.cs points to src/Domain/DispatchTicket.cs

Then I show only the Calls edge type
Then I can see there are 12 nodes and 6 connections
And src/Program.cs points to src/Services/DispatchRunner.cs
And src/Services/DispatchRunner.cs points to src/Services/DispatchQueue.cs
And src/Services/DispatchRunner.cs points to src/Domain/DispatchRequest.cs
And src/Services/DispatchRunner.cs points to src/Domain/DispatchTicket.cs
And src/Services/DispatchRunner.cs points to src/Services/RunnerBase.cs
And src/Services/DispatchRunner.cs points to src/Presentation/DispatchReport.cs

## Scenario: C# example exposes symbols and variables when graph scope enables them

Given I open the examples/example-csharp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 12 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-csharp workspace

Then I show only the Contains edge type
Then I show only the File and Class node types
Then I can see there are 18 nodes and 6 connections
And the visible graph includes the Class node Program from src/Program.cs
And the visible graph includes the Class node DispatchRunner from src/Services/DispatchRunner.cs
And the visible graph includes the Class node DispatchTicket from src/Domain/DispatchTicket.cs

Then I show only the File and Interface node types
Then I can see there are 13 nodes and 1 connection
And the visible graph includes the Interface node IDispatchRunner from src/Contracts/IDispatchRunner.cs

Then I show only the File and Struct node types
Then I can see there are 13 nodes and 1 connection
And the visible graph includes the Struct node DispatchRequest from src/Domain/DispatchRequest.cs

Then I show only the File and Enum node types
Then I can see there are 13 nodes and 1 connection
And the visible graph includes the Enum node DispatchPriority from src/Domain/DispatchPriority.cs

Then I show only the File and Function node types
Then I can see there are 22 nodes and 10 connections
And the visible graph includes the Function node Main from src/Program.cs
And the visible graph includes the Function node Run from src/Services/DispatchRunner.cs
And the visible graph includes the Function node CreateDefault from src/Services/DispatchRunner.cs
And the visible graph includes the Function node Format from src/Presentation/DispatchReport.cs

Then I show only the File and Field node types
Then I can see there are 17 nodes and 5 connections
And the visible graph includes the Field node _queue from src/Services/DispatchRunner.cs
And the visible graph includes the Field node _tickets from src/Services/DispatchQueue.cs
And the visible graph includes the Field node Location from src/Domain/DispatchRequest.cs

Then I show only the File and Constant node types
Then I can see there are 14 nodes and 2 connections
And the visible graph includes the Constant node DefaultCrew from src/Domain/DispatchTicket.cs
And the visible graph includes the Constant node ReadyStatus from src/Services/RunnerBase.cs

Then I show only the File and Parameter node types
Then I can see there are 25 nodes and 13 connections
And the visible graph includes the Parameter node location from src/Services/DispatchRunner.cs
And the visible graph includes the Parameter node priority from src/Services/DispatchRunner.cs
And the visible graph includes the Parameter node ticket from src/Presentation/DispatchReport.cs

Then I show only the File and Local node types
Then I can see there are 22 nodes and 10 connections
And the visible graph includes the Local node request from src/Services/DispatchRunner.cs
And the visible graph includes the Local node ticket from src/Services/DispatchRunner.cs
And the visible graph includes the Local node activeTickets from src/Services/DispatchRunner.cs

Then I show no edge types
Then I show only the File, Function, Class, Interface, Struct, Enum, Field, Constant, Parameter and Local node types
Then I can see there are 61 nodes and 0 connections

When I toggle the Contains edge on
Then I can see there are 61 nodes and 49 connections
And src/Services/DispatchRunner.cs points to src/Services/DispatchRunner.cs#DispatchRunner:class
And the visible graph includes the Function node Run from src/Services/DispatchRunner.cs
And src/Services/DispatchRunner.cs points to src/Services/DispatchRunner.cs#_queue:field
And src/Services/DispatchRunner.cs points to src/Services/DispatchRunner.cs#location:parameter
And src/Services/DispatchRunner.cs points to src/Services/DispatchRunner.cs#request:local
