# Feature: C# Example

## Scenario: C# example covers Task Runner graph scope

Given I open the examples/example-csharp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 13 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-csharp workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are only Imports, References, Calls, Contains, Inherits
And I select node types
Then the available C# node types are only Function, Class, Interface, Struct, Enum, Constant, Field, Parameter, Local
And the Method node type is not available for the C# example
And the Type node type is not available for the C# example
And the Global node type is not available for the C# example
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 13 nodes and 6 connections
And src/Program.cs points to src/Models/RunRequest.cs
And src/Program.cs points to src/Services/ApiService.cs
And src/Program.cs points to src/Utils/Helpers.cs
And src/Services/ApiService.cs points to src/Contracts/IRunner.cs
And src/Services/ApiService.cs points to src/Models/RunStatus.cs
And src/Services/ApiService.cs points to src/Utils/Helpers.cs

And src/Config.cs is an orphan node
And src/Orphan.cs is an orphan node
And src/Services/BaseService.cs is an orphan node
And src/Utils/Formatter.cs is an orphan node
And README.md is an orphan node
And .gitignore is an orphan node
And .vscode/settings.json is an orphan node

Then I show only the References edge type
Then I can see there are 13 nodes and 7 connections
And src/Program.cs points to src/Config.cs
And src/Program.cs points to src/Models/RunRequest.cs
And src/Program.cs points to src/Services/ApiService.cs
And src/Program.cs points to src/Utils/Helpers.cs
And src/Services/ApiService.cs points to src/Models/RunStatus.cs
And src/Services/ApiService.cs points to src/Utils/Helpers.cs
And src/Utils/Helpers.cs points to src/Utils/Formatter.cs

Then I show only the Inherits edge type
Then I can see there are 13 nodes and 2 connections
And src/Services/ApiService.cs points to src/Services/BaseService.cs
And src/Services/ApiService.cs points to src/Contracts/IRunner.cs

Then I show only the Calls edge type
Then I can see there are 13 nodes and 7 connections
And src/Program.cs points to src/Config.cs
And src/Program.cs points to src/Models/RunRequest.cs
And src/Program.cs points to src/Services/ApiService.cs
And src/Program.cs points to src/Utils/Helpers.cs
And src/Services/ApiService.cs points to src/Services/BaseService.cs
And src/Services/ApiService.cs points to src/Utils/Helpers.cs
And src/Utils/Helpers.cs points to src/Utils/Formatter.cs

Then I show only the Contains edge type
Then I show only the File and Class node types
Then I can see there are 20 nodes and 7 connections
And the visible graph includes the Class node Program from src/Program.cs
And the visible graph includes the Class node Config from src/Config.cs
And the visible graph includes the Class node ApiService from src/Services/ApiService.cs
And the visible graph includes the Class node BaseService from src/Services/BaseService.cs
And the visible graph includes the Class node Helpers from src/Utils/Helpers.cs
And the visible graph includes the Class node Formatter from src/Utils/Formatter.cs

Then I show only the File and Interface node types
Then I can see there are 14 nodes and 1 connection
And the visible graph includes the Interface node IRunner from src/Contracts/IRunner.cs

Then I show only the File and Struct node types
Then I can see there are 14 nodes and 1 connection
And the visible graph includes the Struct node RunRequest from src/Models/RunRequest.cs

Then I show only the File and Enum node types
Then I can see there are 14 nodes and 1 connection
And the visible graph includes the Enum node RunStatus from src/Models/RunStatus.cs

Then I show only the File and Function node types
Then I can see there are 22 nodes and 9 connections
And the visible graph includes the Function node Main from src/Program.cs
And the visible graph includes the Function node LoadConfig from src/Config.cs
And the visible graph includes the Function node Run from src/Services/ApiService.cs
And the visible graph includes the Function node Status from src/Services/BaseService.cs
And the visible graph includes the Function node FormatStatus from src/Utils/Helpers.cs
And the visible graph includes the Function node FormatOutput from src/Utils/Formatter.cs

Then I show only the File and Constant node types
Then I can see there are 15 nodes and 2 connections
And the visible graph includes the Constant node DefaultMaxItems from src/Config.cs
And the visible graph includes the Constant node DefaultName from src/Models/RunRequest.cs

Then I show only the File and Field node types
Then I can see there are 16 nodes and 3 connections
And the visible graph includes the Field node Name from src/Models/RunRequest.cs
And the visible graph includes the Field node MaxItems from src/Models/RunRequest.cs
And the visible graph includes the Field node serviceName from src/Services/ApiService.cs

Then I show only the File and Parameter node types
Then I can see there are 21 nodes and 8 connections
And the visible graph includes the Parameter node request from src/Contracts/IRunner.cs
And the visible graph includes the Parameter node name from src/Models/RunRequest.cs
And the visible graph includes the Parameter node maxItems from src/Models/RunRequest.cs
And the visible graph includes the Parameter node request from src/Services/ApiService.cs
And the visible graph includes the Parameter node currentStatus from src/Utils/Helpers.cs

Then I show only the File and Local node types
Then I can see there are 20 nodes and 7 connections
And the visible graph includes the Local node settings from src/Program.cs
And the visible graph includes the Local node service from src/Program.cs
And the visible graph includes the Local node request from src/Program.cs
And the visible graph includes the Local node currentStatus from src/Services/ApiService.cs
And the visible graph includes the Local node isRunnable from src/Services/ApiService.cs

Then I show no edge types
Then I show only the File, Function, Class, Interface, Struct, Enum, Constant, Field, Parameter and Local node types
Then I can see there are 52 nodes and 0 connections

When I toggle the Contains edge on
Then I can see there are 52 nodes and 39 connections
And src/Config.cs points to src/Config.cs#DefaultMaxItems:constant
And src/Models/RunRequest.cs points to src/Models/RunRequest.cs#RunRequest:struct
And src/Models/RunRequest.cs points to src/Models/RunRequest.cs#DefaultName:constant
And src/Models/RunRequest.cs points to src/Models/RunRequest.cs#Name:field
And src/Services/ApiService.cs points to src/Services/ApiService.cs#serviceName:field
And src/Services/ApiService.cs points to src/Services/ApiService.cs#request:parameter
And src/Services/ApiService.cs points to src/Services/ApiService.cs#currentStatus:local
And src/Services/ApiService.cs points to src/Services/ApiService.cs#isRunnable:local

Then I show only the Calls edge type
Then I can see there are 52 nodes and 7 connections
And the visible graph shows Main in src/Program.cs calling LoadConfig in src/Config.cs
And the visible graph shows Main in src/Program.cs calling RunRequest in src/Models/RunRequest.cs
And the visible graph shows Main in src/Program.cs calling FormatStatus in src/Utils/Helpers.cs
And the visible graph shows Run in src/Services/ApiService.cs calling Status in src/Services/BaseService.cs
And the visible graph shows FormatStatus in src/Utils/Helpers.cs calling FormatOutput in src/Utils/Formatter.cs

Then I show only the Inherits edge type
Then I can see there are 52 nodes and 2 connections
And the visible graph shows ApiService in src/Services/ApiService.cs inheriting from BaseService in src/Services/BaseService.cs
And the visible graph shows ApiService in src/Services/ApiService.cs inheriting from IRunner in src/Contracts/IRunner.cs

Then I show only the Imports edge type
Then I can see there are 52 nodes and 6 connections
And src/Program.cs points to src/Models/RunRequest.cs

Then I show only the References edge type
Then I can see there are 52 nodes and 7 connections
And src/Program.cs points to src/Config.cs
