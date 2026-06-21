Feature: Graph Scope Node Types - C

Background:

Given I open the examples/example-c workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace

Scenario: Function node type shows C functions

When I show no edge types
And I show only the File and Function node types
Then I can see there are 15 nodes and 0 connections
And src/main.c#main:function is an orphan node

Scenario: Prototype node type shows C declarations

When I show no edge types
And I show only the File and Prototype node types
Then I can see there are 13 nodes and 0 connections
And src/logger/logger.h#logger_init:prototype is an orphan node
And src/logger/logger.h#logger_write:prototype is an orphan node
And src/logger/logger.h#logger_flush:prototype is an orphan node
And src/logger/format.h#logger_level_name:prototype is an orphan node
And src/logger/format.h#logger_format_line:prototype is an orphan node

Scenario: Struct node type shows C structs

When I show no edge types
And I show only the File and Struct node types
Then I can see there are 10 nodes and 0 connections
And src/logger/logger.h#Logger:struct is an orphan node
And src/logger/format.h#LogRecord:struct is an orphan node

Scenario: Union node type shows C unions

When I show no edge types
And I show only the File and Union node types
Then I can see there are 9 nodes and 0 connections
And src/logger/format.h#LogMessage:union is an orphan node

Scenario: Typedef node type shows C typedefs

When I show no edge types
And I show only the File and Typedef node types
Then I can see there are 12 nodes and 0 connections
And src/logger/logger.h#LogLevel:typedef is an orphan node
And src/logger/logger.h#Logger:typedef is an orphan node
And src/logger/format.h#LogMessage:typedef is an orphan node
And src/logger/format.h#LogRecord:typedef is an orphan node
