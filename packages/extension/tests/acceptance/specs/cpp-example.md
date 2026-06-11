# Feature: C++ Example

## Scenario: C++ example covers Task Queue Runner graph scope

Given I open the examples/example-cpp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 13 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-cpp workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are only Include, Calls, Inherits, Contains, Overrides
And I select node types
Then the available C++ node types are only Namespace, Class, Enum, Callable, Method, Alias, Template, Global, Constant, Field, Parameter, Local
And the Type node type is not available for the C++ example
And I close the Graph Scope

When I toggle the Include edge on
Then I can see there are 13 nodes and 12 connections
And src/app.cpp points to src/runner.hpp
And src/app.cpp points to src/seed.hpp
And src/app.cpp points to src/worker.hpp
And src/runner.cpp points to src/runner.hpp
And src/runner.hpp points to src/task_queue.hpp
And src/runner.hpp points to src/worker.hpp
And src/seed.cpp points to src/seed.hpp
And src/seed.hpp points to src/task.hpp
And src/task.cpp points to src/task.hpp
And src/task_queue.hpp points to src/task.hpp
And src/worker.cpp points to src/worker.hpp
And src/worker.hpp points to src/task.hpp

And README.md is an orphan node
And CMakeLists.txt is an orphan node
And .gitignore is an orphan node

Then I show only the Contains edge type
Then I show only the File and Namespace node types
Then I can see there are 14 nodes and 1 connection
And the visible graph includes the Namespace node taskrunner from src/task.hpp
And src/task.hpp points to src/task.hpp#taskrunner:namespace

Then I show only the File and Class node types
Then I can see there are 17 nodes and 4 connections
And the visible graph includes the Class node Task from src/task.hpp
And the visible graph includes the Class node Worker from src/worker.hpp
And the visible graph includes the Class node ConsoleWorker from src/worker.hpp
And the visible graph includes the Class node TaskRunner from src/runner.hpp

Then I show only the File and Enum node types
Then I can see there are 15 nodes and 2 connections
And the visible graph includes the Enum node Priority from src/task.hpp
And the visible graph includes the Enum node TaskStatus from src/task.hpp

Then I show only the File and Callable node types
Then I can see there are 17 nodes and 4 connections
And the visible graph includes the Callable node main from src/app.cpp
And the visible graph includes the Callable node make_task from src/seed.cpp
And the visible graph includes the Callable node seed_tasks from src/seed.cpp
And the visible graph includes the Callable node priority_name from src/task.cpp

Then I show only the File and Method node types
Then I can see there are 30 nodes and 17 connections
And the visible graph includes the Method node TaskRunner::run from src/runner.cpp
And the visible graph includes the Method node ConsoleWorker::execute from src/worker.cpp
And the visible graph includes the Method node Task::mark_completed from src/task.cpp

Then I show only the File and Alias node types
Then I can see there are 16 nodes and 3 connections
And the visible graph includes the Alias node TaskId from src/task.hpp
And the visible graph includes the Alias node TaskList from src/seed.hpp
And the visible graph includes the Alias node PendingTaskQueue from src/task_queue.hpp

Then I show only the File and Template node types
Then I can see there are 14 nodes and 1 connection
And the visible graph includes the Template node TaskQueue from src/task_queue.hpp

Then I show only the File and Global node types
Then I can see there are 14 nodes and 1 connection
And the visible graph includes the Global node next_task_id from src/seed.cpp

Then I show only the File and Constant node types
Then I can see there are 15 nodes and 2 connections
And the visible graph includes the Constant node kInitialStatus from src/task.cpp
And the visible graph includes the Constant node kDefaultPriority from src/seed.cpp

Then I show only the File and Field node types
Then I can see there are 20 nodes and 7 connections
And the visible graph includes the Field node queue_ from src/runner.hpp
And the visible graph includes the Field node worker_ from src/runner.hpp
And the visible graph includes the Field node items_ from src/task_queue.hpp
And the visible graph includes the Field node status_ from src/task.hpp

Then I show only the File and Parameter node types
Then I can see there are 24 nodes and 11 connections
And the visible graph includes the Parameter node task from src/runner.cpp
And the visible graph includes the Parameter node worker from src/runner.cpp
And the visible graph includes the Parameter node priority from src/seed.cpp

Then I show only the File and Local node types
Then I can see there are 24 nodes and 11 connections
And the visible graph includes the Local node completed from src/runner.cpp
And the visible graph includes the Local node tasks from src/seed.cpp
And the visible graph includes the Local node id from src/seed.cpp

Then I show no edge types
Then I show only the File, Namespace, Class, Enum, Callable, Method, Alias, Template, Global, Constant, Field, Parameter and Local node types
Then I can see there are 77 nodes and 0 connections

When I toggle the Contains edge on
Then I can see there are 77 nodes and 64 connections
And src/task.hpp points to src/task.hpp#Task:class
And src/task.hpp points to src/task.hpp#Priority:enum
And src/task.hpp points to src/task.hpp#TaskId:alias
And src/task_queue.hpp points to src/task_queue.hpp#TaskQueue:template
And src/runner.hpp points to src/runner.hpp#TaskRunner:class
And src/runner.hpp points to src/runner.hpp#queue_:field
And src/seed.cpp points to src/seed.cpp#next_task_id:global
And src/seed.cpp points to src/seed.cpp#kDefaultPriority:constant
And src/runner.cpp points to src/runner.cpp#completed:local

Then I show only the Calls edge type
Then I can see there are 77 nodes and 15 connections
And the visible graph shows main in src/app.cpp calling seed_tasks in src/seed.hpp
And the visible graph shows main in src/app.cpp calling TaskRunner::enqueue in src/runner.hpp
And the visible graph shows TaskRunner::run in src/runner.cpp calling Worker::execute in src/worker.hpp
And the visible graph shows ConsoleWorker::execute in src/worker.cpp calling priority_name in src/task.hpp
And the visible graph shows seed_tasks in src/seed.cpp calling make_task in src/seed.cpp

Then I show only the Inherits edge type
Then I can see there are 77 nodes and 1 connection
And the visible graph shows ConsoleWorker in src/worker.hpp inheriting from Worker in src/worker.hpp

Then I show only the Overrides edge type
Then I can see there are 77 nodes and 1 connection
And the visible graph shows ConsoleWorker::execute in src/worker.hpp overriding Worker::execute in src/worker.hpp

Then I show only the Include edge type
Then I can see there are 77 nodes and 12 connections
And src/app.cpp points to src/runner.hpp
