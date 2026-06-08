# Feature: C Example

## Scenario: C example renders the tiny logger file graph

Given I open the examples/example-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-c workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls
And I close the Graph Scope

Then I can see there are 8 nodes and 8 connections
And src/main.c has 2 edges pointing to src/logger/logger.h
And src/logger/logger.c points to src/logger/logger.h
And src/logger/logger.c has 2 edges pointing to src/logger/format.h
And src/logger/format.c has 2 edges pointing to src/logger/format.h
And src/logger/format.h points to src/logger/logger.h

And README.md is an orphan node
And Makefile is an orphan node
And .gitignore is an orphan node

Then I show only the Imports edge type
Then I can see there are 8 nodes and 5 connections
And src/main.c points to src/logger/logger.h
And src/logger/logger.c points to src/logger/logger.h
And src/logger/logger.c points to src/logger/format.h
And src/logger/format.c points to src/logger/format.h
And src/logger/format.h points to src/logger/logger.h

Then I show only the Calls edge type
Then I can see there are 8 nodes and 3 connections
And src/main.c points to src/logger/logger.h
And src/logger/logger.c points to src/logger/format.h
And src/logger/format.c points to src/logger/format.h

## Scenario: C example exposes logger symbols when symbol scope is enabled

Given I open the examples/example-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I toggle the Function, Struct, Enum, and Type node on
And I toggle the Contains edge on
Then I can see there are 25 nodes and 27 connections

And src/main.c points to src/main.c#main:function
And src/logger/logger.h points to src/logger/logger.h#Logger:struct
And src/logger/logger.h points to src/logger/logger.h#Logger:type
And src/logger/logger.h points to src/logger/logger.h#LogLevel:enum
And src/logger/logger.h points to src/logger/logger.h#LogLevel:type
And src/logger/format.h points to src/logger/format.h#LogRecord:struct
And src/logger/format.h points to src/logger/format.h#LogRecord:type
And src/logger/logger.c points to src/logger/logger.c#logger_write:function
And src/logger/format.c points to src/logger/format.c#logger_format_line:function

And src/main.c#main:function points to src/logger/logger.h#logger_init:function
And src/main.c#main:function points to src/logger/logger.h#logger_write:function
And src/main.c#main:function points to src/logger/logger.h#logger_flush:function
And src/logger/logger.c#logger_write:function points to src/logger/format.h#logger_format_line:function
