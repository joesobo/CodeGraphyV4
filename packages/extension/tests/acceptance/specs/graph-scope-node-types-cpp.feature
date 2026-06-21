Feature: Graph Scope Node Types - C++

Background:

Given I open the examples/example-cpp workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace

Scenario: Symbol node type controls class and global children

When I show no edge types
And I show only the File, Class and Global node types
Then I can see there are 18 nodes and 0 connections
And the visible graph includes the Class node Task from src/task.hpp
And the visible graph includes the Global node next_task_id from src/seed.cpp
When I toggle the Symbol node off
Then I can see there are 13 nodes and 0 connections
When I toggle the Symbol node on
Then I can see there are 18 nodes and 0 connections

Scenario: Namespace node type shows C++ namespaces

When I show no edge types
And I show only the File and Namespace node types
Then I can see there are 14 nodes and 0 connections
And the visible graph includes the Namespace node taskrunner from src/task.hpp

Scenario: Class node type shows C++ classes

When I show no edge types
And I show only the File and Class node types
Then I can see there are 17 nodes and 0 connections
And the visible graph includes the Class node Task from src/task.hpp
And the visible graph includes the Class node Worker from src/worker.hpp
And the visible graph includes the Class node ConsoleWorker from src/worker.hpp
And the visible graph includes the Class node TaskRunner from src/runner.hpp

Scenario: Enum node type shows C++ enums

When I show no edge types
And I show only the File and Enum node types
Then I can see there are 15 nodes and 0 connections
And the visible graph includes the Enum node Priority from src/task.hpp
And the visible graph includes the Enum node TaskStatus from src/task.hpp

Scenario: Callable node type shows C++ free functions

When I show no edge types
And I show only the File and Callable node types
Then I can see there are 17 nodes and 0 connections
And the visible graph includes the Callable node main from src/app.cpp
And the visible graph includes the Callable node make_task from src/seed.cpp
And the visible graph includes the Callable node seed_tasks from src/seed.cpp
And the visible graph includes the Callable node priority_name from src/task.cpp

Scenario: Method node type shows C++ methods

When I show no edge types
And I show only the File and Method node types
Then I can see there are 30 nodes and 0 connections
And the visible graph includes the Method node TaskRunner::run from src/runner.cpp
And the visible graph includes the Method node ConsoleWorker::execute from src/worker.cpp
And the visible graph includes the Method node Task::mark_completed from src/task.cpp

Scenario: Alias node type shows C++ using aliases

When I show no edge types
And I show only the File and Alias node types
Then I can see there are 16 nodes and 0 connections
And the visible graph includes the Alias node TaskId from src/task.hpp
And the visible graph includes the Alias node TaskList from src/seed.hpp
And the visible graph includes the Alias node PendingTaskQueue from src/task_queue.hpp

Scenario: Template node type shows C++ templates

When I show no edge types
And I show only the File and Template node types
Then I can see there are 14 nodes and 0 connections
And the visible graph includes the Template node TaskQueue from src/task_queue.hpp

Scenario: Variable node type controls global and constant children

When I show no edge types
And I show only the File, Global and Constant node types
Then I can see there are 16 nodes and 0 connections
And the visible graph includes the Global node next_task_id from src/seed.cpp
And the visible graph includes the Constant node kDefaultPriority from src/seed.cpp
When I toggle the Variable node off
Then I can see there are 13 nodes and 0 connections
When I toggle the Variable node on
Then I can see there are 16 nodes and 0 connections

Scenario: Global node type shows C++ global variables

When I show no edge types
And I show only the File and Global node types
Then I can see there are 14 nodes and 0 connections
And the visible graph includes the Global node next_task_id from src/seed.cpp

Scenario: Constant node type shows C++ constants

When I show no edge types
And I show only the File and Constant node types
Then I can see there are 15 nodes and 0 connections
And the visible graph includes the Constant node kInitialStatus from src/task.cpp
And the visible graph includes the Constant node kDefaultPriority from src/seed.cpp

Scenario: Field node type shows C++ fields

When I show no edge types
And I show only the File and Field node types
Then I can see there are 20 nodes and 0 connections
And the visible graph includes the Field node queue_ from src/runner.hpp
And the visible graph includes the Field node worker_ from src/runner.hpp
And the visible graph includes the Field node items_ from src/task_queue.hpp
And the visible graph includes the Field node status_ from src/task.hpp

Scenario: Parameter node type shows C++ parameters

When I show no edge types
And I show only the File and Parameter node types
Then I can see there are 24 nodes and 0 connections
And the visible graph includes the Parameter node task from src/runner.cpp
And the visible graph includes the Parameter node worker from src/runner.cpp
And the visible graph includes the Parameter node priority from src/seed.cpp

Scenario: Local node type shows C++ local variables

When I show no edge types
And I show only the File and Local node types
Then I can see there are 24 nodes and 0 connections
And the visible graph includes the Local node completed from src/runner.cpp
And the visible graph includes the Local node tasks from src/seed.cpp
And the visible graph includes the Local node id from src/seed.cpp
