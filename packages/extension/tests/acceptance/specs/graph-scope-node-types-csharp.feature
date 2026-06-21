Feature: Graph Scope Node Types - C#

Background:
Given I open the examples/example-csharp workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the Contains edge type

Scenario: Class node type shows C# classes

When I show only the File and Class node types
Then I can see there are 20 nodes and 5 connections
And the visible graph includes the Class node Program from src/Program.cs
And the visible graph includes the Class node DispatchSettings from src/Config/DispatchSettings.cs
And the visible graph includes the Class node TaskDispatcher from src/Services/TaskDispatcher.cs

Scenario: Interface node type shows C# interfaces

When I show only the File and Interface node types
Then I can see there are 17 nodes and 2 connections
And the visible graph includes the Interface node ITaskQueue from src/Contracts/ITaskQueue.cs
And the visible graph includes the Interface node ITaskRunner from src/Contracts/ITaskRunner.cs

Scenario: Struct node type shows C# structs

When I show only the File and Struct node types
Then I can see there are 16 nodes and 1 connection
And the visible graph includes the Struct node TaskId from src/Models/TaskId.cs

Scenario: Record node type shows C# records

When I show only the File and Record node types
Then I can see there are 17 nodes and 2 connections
And the visible graph includes the Record node DispatchTask from src/Models/DispatchTask.cs
And the visible graph includes the Record node DispatchResult from src/Models/DispatchResult.cs

Scenario: Enum node type shows C# enums

When I show only the File and Enum node types
Then I can see there are 16 nodes and 1 connection
And the visible graph includes the Enum node DispatchStatus from src/Models/DispatchStatus.cs

Scenario: Delegate node type shows C# delegates

When I show only the File and Delegate node types
Then I can see there are 16 nodes and 1 connection
And the visible graph includes the Delegate node TaskCompleted from src/Events/TaskCompleted.cs

Scenario: Method node type shows C# methods

When I show only the File and Method node types
Then I can see there are 23 nodes and 8 connections
And the visible graph includes the Method node Main from src/Program.cs
And the visible graph includes the Method node Dispatch from src/Services/TaskDispatcher.cs
And the visible graph includes the Method node BuildMessage from src/Services/TaskDispatcher.cs
And the visible graph includes the Method node Complete from src/Services/BaseTaskRunner.cs

Scenario: Constructor node type shows C# constructors

When I show only the File and Constructor node types
Then I can see there are 20 nodes and 5 connections
And the visible graph includes the Constructor node DispatchSettings from src/Config/DispatchSettings.cs
And the visible graph includes the Constructor node TaskDispatcher from src/Services/TaskDispatcher.cs
And the visible graph includes the Constructor node TaskId from src/Models/TaskId.cs

Scenario: Property node type shows C# properties

When I show only the File and Property node types
Then I can see there are 19 nodes and 4 connections
And the visible graph includes the Property node MaxRetries from src/Config/DispatchSettings.cs
And the visible graph includes the Property node Count from src/Contracts/ITaskQueue.cs
And the visible graph includes the Property node Count from src/Services/PriorityTaskQueue.cs
And the visible graph includes the Property node Value from src/Models/TaskId.cs

Scenario: Event node type shows C# events

When I show only the File and Event node types
Then I can see there are 16 nodes and 1 connection
And the visible graph includes the Event node Completed from src/Services/TaskDispatcher.cs

Scenario: Constant node type shows C# constants

When I show only the File and Constant node types
Then I can see there are 17 nodes and 2 connections
And the visible graph includes the Constant node DefaultMaxRetries from src/Config/DispatchSettings.cs
And the visible graph includes the Constant node retryFloor from src/Services/TaskDispatcher.cs

Scenario: Field node type shows C# fields

When I show only the File and Field node types
Then I can see there are 20 nodes and 5 connections
And the visible graph includes the Field node _maxRetries from src/Config/DispatchSettings.cs
And the visible graph includes the Field node _queue from src/Services/TaskDispatcher.cs
And the visible graph includes the Field node _tasks from src/Services/PriorityTaskQueue.cs

Scenario: Parameter node type shows C# parameters

When I show only the File and Parameter node types
Then I can see there are 37 nodes and 22 connections
And the visible graph includes the Parameter node maxRetries from src/Config/DispatchSettings.cs
And the visible graph includes the Parameter node queue from src/Services/TaskDispatcher.cs
And the visible graph includes the Parameter node dispatchedTask from src/Services/TaskDispatcher.cs
And the visible graph includes the Parameter node result from src/Events/TaskCompleted.cs

Scenario: Local node type shows C# locals

When I show only the File and Local node types
Then I can see there are 23 nodes and 8 connections
And the visible graph includes the Local node settings from src/Program.cs
And the visible graph includes the Local node dispatcher from src/Program.cs
And the visible graph includes the Local node attempts from src/Services/TaskDispatcher.cs
And the visible graph includes the Local node nextTask from src/Services/TaskDispatcher.cs
