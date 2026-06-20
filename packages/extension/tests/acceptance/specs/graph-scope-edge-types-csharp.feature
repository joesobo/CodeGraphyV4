Feature: Graph Scope Edge Types - C#

Scenario: C# graph scope exposes semantic edge relationships

Given I open the examples/example-csharp workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace
When I show no edge types
And I show only the File, Class, Interface, Struct, Record, Enum, Delegate, Method, Constructor, Property, Event, Constant, Field, Parameter and Local node types
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

When I show only the Type edge type
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

When I show only the Call edge type
Then I can see there are 82 nodes and 9 connections
And the visible graph shows Main in src/Program.cs calling DispatchTask in src/Models/DispatchTask.cs
And the visible graph shows Main in src/Program.cs calling Dispatch in src/Services/TaskDispatcher.cs
And the visible graph shows Dispatch in src/Services/TaskDispatcher.cs calling Complete in src/Services/BaseTaskRunner.cs
And the visible graph shows Dispatch in src/Services/TaskDispatcher.cs calling BuildMessage in src/Services/TaskDispatcher.cs

When I show only the Inherits edge type
Then I can see there are 82 nodes and 1 connection
And src/Services/TaskDispatcher.cs#TaskDispatcher:class points to src/Services/BaseTaskRunner.cs

When I show only the Implements edge type
Then I can see there are 82 nodes and 2 connections
And the visible graph shows TaskDispatcher in src/Services/TaskDispatcher.cs implementing ITaskRunner in src/Contracts/ITaskRunner.cs
And the visible graph shows PriorityTaskQueue in src/Services/PriorityTaskQueue.cs implementing ITaskQueue in src/Contracts/ITaskQueue.cs
