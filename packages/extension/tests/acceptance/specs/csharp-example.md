# Feature: C# Example

## Scenario: C# example renders expected file nodes and using relationships

Given I open the examples/example-csharp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 15 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-csharp workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are only Using, Type, Call, Inherits, Implements, Contains
And I select node types
Then the available C# node types are only Class, Interface, Struct, Record, Enum, Delegate, Method, Constructor, Property, Event, Constant, Field, Parameter, Local
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

Then I show only the Contains edge type
Then I show only the File and Class node types
Then I can see there are 20 nodes and 5 connections
And the visible graph includes the Class node Program from src/Program.cs
And the visible graph includes the Class node DispatchSettings from src/Config/DispatchSettings.cs
And the visible graph includes the Class node TaskDispatcher from src/Services/TaskDispatcher.cs

Then I show only the File and Interface node types
Then I can see there are 17 nodes and 2 connections
And the visible graph includes the Interface node ITaskQueue from src/Contracts/ITaskQueue.cs
And the visible graph includes the Interface node ITaskRunner from src/Contracts/ITaskRunner.cs

Then I show only the File and Struct node types
Then I can see there are 16 nodes and 1 connection
And the visible graph includes the Struct node TaskId from src/Models/TaskId.cs

Then I show only the File and Record node types
Then I can see there are 17 nodes and 2 connections
And the visible graph includes the Record node DispatchTask from src/Models/DispatchTask.cs
And the visible graph includes the Record node DispatchResult from src/Models/DispatchResult.cs

Then I show only the File and Enum node types
Then I can see there are 16 nodes and 1 connection
And the visible graph includes the Enum node DispatchStatus from src/Models/DispatchStatus.cs

Then I show only the File and Delegate node types
Then I can see there are 16 nodes and 1 connection
And the visible graph includes the Delegate node TaskCompleted from src/Events/TaskCompleted.cs

Then I show only the File and Method node types
Then I can see there are 23 nodes and 8 connections
And the visible graph includes the Method node Main from src/Program.cs
And the visible graph includes the Method node Dispatch from src/Services/TaskDispatcher.cs
And the visible graph includes the Method node BuildMessage from src/Services/TaskDispatcher.cs
And the visible graph includes the Method node Complete from src/Services/BaseTaskRunner.cs

Then I show only the File and Constructor node types
Then I can see there are 20 nodes and 5 connections
And the visible graph includes the Constructor node DispatchSettings from src/Config/DispatchSettings.cs
And the visible graph includes the Constructor node TaskDispatcher from src/Services/TaskDispatcher.cs
And the visible graph includes the Constructor node TaskId from src/Models/TaskId.cs

Then I show only the File and Property node types
Then I can see there are 19 nodes and 4 connections
And the visible graph includes the Property node MaxRetries from src/Config/DispatchSettings.cs
And the visible graph includes the Property node Count from src/Contracts/ITaskQueue.cs
And the visible graph includes the Property node Count from src/Services/PriorityTaskQueue.cs
And the visible graph includes the Property node Value from src/Models/TaskId.cs

Then I show only the File and Event node types
Then I can see there are 16 nodes and 1 connection
And the visible graph includes the Event node Completed from src/Services/TaskDispatcher.cs

Then I show only the File and Constant node types
Then I can see there are 17 nodes and 2 connections
And the visible graph includes the Constant node DefaultMaxRetries from src/Config/DispatchSettings.cs
And the visible graph includes the Constant node retryFloor from src/Services/TaskDispatcher.cs

Then I show only the File and Field node types
Then I can see there are 20 nodes and 5 connections
And the visible graph includes the Field node _maxRetries from src/Config/DispatchSettings.cs
And the visible graph includes the Field node _queue from src/Services/TaskDispatcher.cs
And the visible graph includes the Field node _tasks from src/Services/PriorityTaskQueue.cs

Then I show only the File and Parameter node types
Then I can see there are 37 nodes and 22 connections
And the visible graph includes the Parameter node maxRetries from src/Config/DispatchSettings.cs
And the visible graph includes the Parameter node queue from src/Services/TaskDispatcher.cs
And the visible graph includes the Parameter node dispatchedTask from src/Services/TaskDispatcher.cs
And the visible graph includes the Parameter node result from src/Events/TaskCompleted.cs

Then I show only the File and Local node types
Then I can see there are 23 nodes and 8 connections
And the visible graph includes the Local node settings from src/Program.cs
And the visible graph includes the Local node dispatcher from src/Program.cs
And the visible graph includes the Local node attempts from src/Services/TaskDispatcher.cs
And the visible graph includes the Local node nextTask from src/Services/TaskDispatcher.cs

Then I show no edge types
Then I show only the File, Class, Interface, Struct, Record, Enum, Delegate, Method, Constructor, Property, Event, Constant, Field, Parameter and Local node types
Then I can see there are 82 nodes and 0 connections

When I toggle the Contains edge on
Then I can see there are 82 nodes and 67 connections
And src/Program.cs points to src/Program.cs#Program:class
And src/Models/DispatchTask.cs points to src/Models/DispatchTask.cs#DispatchTask:record
And src/Events/TaskCompleted.cs points to src/Events/TaskCompleted.cs#TaskCompleted:delegate
And src/Services/TaskDispatcher.cs points to src/Services/TaskDispatcher.cs#TaskDispatcher:class
And src/Services/TaskDispatcher.cs points to src/Services/TaskDispatcher.cs#_queue:field
And src/Config/DispatchSettings.cs points to src/Config/DispatchSettings.cs#DefaultMaxRetries:constant
And src/Services/TaskDispatcher.cs points to src/Services/TaskDispatcher.cs#retryFloor:constant
And src/Services/TaskDispatcher.cs points to src/Services/TaskDispatcher.cs#nextTask:local

Then I show only the Type edge type
Then I can see there are 82 nodes and 24 connections
And the visible graph shows task in src/Events/TaskCompleted.cs referencing type DispatchTask in src/Models/DispatchTask.cs
And the visible graph shows result in src/Events/TaskCompleted.cs referencing type DispatchResult in src/Models/DispatchResult.cs
And the visible graph shows Status in src/Models/DispatchTask.cs referencing type DispatchStatus in src/Models/DispatchStatus.cs
And the visible graph shows _tasks in src/Services/PriorityTaskQueue.cs referencing type DispatchTask in src/Models/DispatchTask.cs
And the visible graph shows _queue in src/Services/TaskDispatcher.cs referencing type ITaskQueue in src/Contracts/ITaskQueue.cs
And the visible graph shows queue in src/Services/TaskDispatcher.cs referencing type ITaskQueue in src/Contracts/ITaskQueue.cs
And the visible graph shows Completed in src/Services/TaskDispatcher.cs referencing type TaskCompleted in src/Events/TaskCompleted.cs
And the visible graph shows Dispatch in src/Services/TaskDispatcher.cs referencing type DispatchResult in src/Models/DispatchResult.cs
And the visible graph shows dispatchedTask in src/Services/TaskDispatcher.cs referencing type DispatchTask in src/Models/DispatchTask.cs

Then I show only the Call edge type
Then I can see there are 82 nodes and 9 connections
And the visible graph shows Main in src/Program.cs calling DispatchTask in src/Models/DispatchTask.cs
And the visible graph shows Main in src/Program.cs calling Dispatch in src/Services/TaskDispatcher.cs
And the visible graph shows Dispatch in src/Services/TaskDispatcher.cs calling Complete in src/Services/BaseTaskRunner.cs
And the visible graph shows Dispatch in src/Services/TaskDispatcher.cs calling BuildMessage in src/Services/TaskDispatcher.cs

Then I show only the Inherits edge type
Then I can see there are 82 nodes and 1 connection
And src/Services/TaskDispatcher.cs#TaskDispatcher:class points to src/Services/BaseTaskRunner.cs

Then I show only the Implements edge type
Then I can see there are 82 nodes and 2 connections
And the visible graph shows TaskDispatcher in src/Services/TaskDispatcher.cs implementing ITaskRunner in src/Contracts/ITaskRunner.cs
And the visible graph shows PriorityTaskQueue in src/Services/PriorityTaskQueue.cs implementing ITaskQueue in src/Contracts/ITaskQueue.cs
