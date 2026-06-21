Feature: C# Example

Scenario: C# example renders file nodes and using relationships

Given I open the examples/example-csharp workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
And I can see there are 15 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-csharp workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are only Using, Type, Call, Inherits, Implements, Contains
And I select node types
And the available C# node types are only Class, Interface, Struct, Record, Enum, Delegate, Method, Constructor, Property, Event, Constant, Field, Parameter, Local
And I close the Graph Scope

When I toggle the Using edge on
Then I can see there are 15 nodes and 13 connections
And src/Contracts/ITaskQueue.cs points to src/Models/DispatchTask.cs
And src/Contracts/ITaskRunner.cs points to src/Models/DispatchTask.cs
And src/Events/TaskCompleted.cs points to src/Models/DispatchResult.cs
And src/Program.cs points to src/Config/DispatchSettings.cs
And src/Program.cs points to src/Models/DispatchResult.cs
And src/Program.cs points to src/Services/TaskDispatcher.cs
And src/Services/BaseTaskRunner.cs points to src/Models/DispatchStatus.cs
And src/Services/PriorityTaskQueue.cs points to src/Contracts/ITaskQueue.cs
And src/Services/PriorityTaskQueue.cs points to src/Models/DispatchTask.cs
And src/Services/TaskDispatcher.cs points to src/Config/DispatchSettings.cs
And src/Services/TaskDispatcher.cs points to src/Contracts/ITaskQueue.cs
And src/Services/TaskDispatcher.cs points to src/Events/TaskCompleted.cs
And src/Services/TaskDispatcher.cs points to src/Models/DispatchTask.cs

And README.md is an orphan node
And .gitignore is an orphan node
And .vscode/settings.json is an orphan node
