Feature: Graph Scope Edge Types - C++

Background:

Given I open the examples/example-cpp workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace

Scenario: Include edge type shows C++ include relationships

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Include edge on
Then the top right of the graph says "12 connections"
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

Scenario: Calls edge type shows C++ call relationships

When I show only the File, Callable and Method node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Calls edge on
Then the top right of the graph says "15 connections"
And the visible graph shows main in src/app.cpp calling seed_tasks in src/seed.hpp
And the visible graph shows main in src/app.cpp calling TaskRunner::enqueue in src/runner.hpp
And the visible graph shows TaskRunner::run in src/runner.cpp calling Worker::execute in src/worker.hpp
And the visible graph shows ConsoleWorker::execute in src/worker.cpp calling priority_name in src/task.hpp
And the visible graph shows seed_tasks in src/seed.cpp calling make_task in src/seed.cpp

Scenario: Inherits edge type shows C++ class inheritance

When I show only the File and Class node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Inherits edge on
Then the top right of the graph says "1 connection"
And src/worker.hpp#ConsoleWorker:class points to src/worker.hpp#Worker:class

Scenario: Nests edge type shows folder containment

When I show only the Folder and File node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Nests edge on
Then the top right of the graph says "14 connections"
And (root) points to .gitignore
And (root) points to CMakeLists.txt
And (root) points to README.md
And (root) points to src
And src points to src/app.cpp
And src points to src/runner.cpp
And src points to src/runner.hpp
And src points to src/seed.cpp
And src points to src/seed.hpp
And src points to src/task.cpp
And src points to src/task.hpp
And src points to src/task_queue.hpp
And src points to src/worker.cpp
And src points to src/worker.hpp

Scenario: Contains edge type shows file-to-symbol ownership

When I show only the File and Class node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Contains edge on
Then the top right of the graph says "4 connections"
And src/task.hpp points to src/task.hpp#Task:class
And src/worker.hpp points to src/worker.hpp#Worker:class
And src/worker.hpp points to src/worker.hpp#ConsoleWorker:class
And src/runner.hpp points to src/runner.hpp#TaskRunner:class

Scenario: Overrides edge type shows C++ method overrides

When I show only the File, Class and Method node types
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Overrides edge on
Then the top right of the graph says "1 connection"
And src/worker.hpp#ConsoleWorker:class points to src/worker.hpp#Worker::execute:method
