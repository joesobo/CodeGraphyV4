Feature: C++ Example

Scenario: C++ example renders file nodes and include relationships

Given I open the examples/example-cpp workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
And I can see there are 13 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-cpp workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are only Include, Calls, Inherits, Contains, Overrides
And I select node types
And the available C++ node types are only Namespace, Class, Enum, Callable, Method, Alias, Template, Global, Constant, Field, Parameter, Local
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
