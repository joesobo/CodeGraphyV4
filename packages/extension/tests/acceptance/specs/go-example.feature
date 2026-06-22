Feature: Go Example

Scenario: Go example covers package calls and supported symbols

Given I open the examples/example-go workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
And I can see there are 8 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-go workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are only Imports, References, Calls, Inherits, Contains
And I select node types
Then the available Go node types are only Function, Method, Struct, Interface, Type, Constant, Local
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 8 nodes and 5 connections
And main.go points to internal/app/app.go
And internal/app/app.go points to internal/model/model.go
And internal/app/app.go points to internal/notify/notify.go
And internal/app/app.go points to internal/service/service.go
And internal/service/service.go points to internal/model/model.go

And README.md is an orphan node
And go.mod is an orphan node
And .gitignore is an orphan node

When I toggle the Imports edge off
And I toggle the Calls edge on
Then I can see there are 8 nodes and 3 connections
And main.go points to internal/app/app.go
And internal/app/app.go points to internal/notify/notify.go
And internal/app/app.go points to internal/service/service.go

When I toggle the Calls edge off
And I toggle the References edge on
Then I can see there are 8 nodes and 2 connections
And internal/app/app.go points to internal/model/model.go
And internal/service/service.go points to internal/model/model.go

When I toggle the References edge off
And I toggle the Inherits edge on
Then I can see there are 8 nodes and 1 connection
And internal/service/service.go points to internal/model/model.go

When I show only the Imports edge type
And I show only the File and Package node types
Then I can see there are 10 nodes and 8 connections
And main.go points to internal/app/app.go
And internal/app/app.go points to internal/model/model.go
And internal/app/app.go points to internal/notify/notify.go
And internal/app/app.go points to internal/service/service.go
And internal/service/service.go points to internal/model/model.go
And internal/app/app.go points to pkg:fmt
And internal/service/service.go points to pkg:strings
And internal/notify/notify.go points to pkg:fmt

When I show only the Calls edge type
And I show only the File and Package node types
Then I can see there are 10 nodes and 6 connections
And main.go points to internal/app/app.go
And internal/app/app.go points to internal/notify/notify.go
And internal/app/app.go points to internal/service/service.go
And internal/app/app.go points to pkg:fmt
And internal/service/service.go points to pkg:strings
And internal/notify/notify.go points to pkg:fmt

When I show no edge types
And I show only the File, Function, Method, Struct, Interface, Type, Constant and Local node types
Then I can see there are 33 nodes and 0 connections
And the visible graph includes the Function node main from main.go
And the visible graph includes the Function node Start from internal/app/app.go
And the visible graph includes the Function node NewTaskRunner from internal/service/service.go
And the visible graph includes the Function node NewConsoleNotifier from internal/notify/notify.go
And the visible graph includes the Method node Run from internal/service/service.go
And the visible graph includes the Method node Send from internal/notify/notify.go
And the visible graph includes the Struct node Config from internal/app/app.go
And the visible graph includes the Struct node TaskRunner from internal/service/service.go
And the visible graph includes the Struct node ConsoleNotifier from internal/notify/notify.go
And the visible graph includes the Struct node Audited from internal/model/model.go
And the visible graph includes the Struct node Task from internal/model/model.go
And the visible graph includes the Struct node Result from internal/model/model.go
And the visible graph includes the Interface node Runner from internal/service/service.go
And the visible graph includes the Interface node AuditingNotifier from internal/service/service.go
And the visible graph includes the Interface node Notifier from internal/model/model.go
And the visible graph includes the Type node Status from internal/service/service.go
And the visible graph includes the Constant node startupMessage from internal/app/app.go
And the visible graph includes the Constant node DefaultStatus from internal/service/service.go
And the visible graph includes the Constant node RetryStatus from internal/service/service.go
And the visible graph includes the Local node config from internal/app/app.go
And the visible graph includes the Local node notifier from internal/app/app.go
And the visible graph includes the Local node runner from internal/app/app.go
And the visible graph includes the Local node task from internal/app/app.go
And the visible graph includes the Local node result from internal/app/app.go
And the visible graph includes the Local node normalized from internal/service/service.go

When I toggle the Contains edge on
Then I can see there are 33 nodes and 25 connections
And main.go points to main.go#main:function
And internal/app/app.go points to internal/app/app.go#Config:struct
And internal/app/app.go points to internal/app/app.go#Start:function
And internal/app/app.go points to internal/app/app.go#startupMessage:constant
And internal/app/app.go points to internal/app/app.go#config:local
And internal/app/app.go points to internal/app/app.go#notifier:local
And internal/app/app.go points to internal/app/app.go#runner:local
And internal/app/app.go points to internal/app/app.go#task:local
And internal/app/app.go points to internal/app/app.go#result:local
And internal/service/service.go points to internal/service/service.go#Runner:interface
And internal/service/service.go points to internal/service/service.go#AuditingNotifier:interface
And internal/service/service.go points to internal/service/service.go#TaskRunner:struct
And internal/service/service.go points to internal/service/service.go#Status:type
And internal/service/service.go points to internal/service/service.go#NewTaskRunner:function
And internal/service/service.go points to internal/service/service.go#Run:method
And internal/service/service.go points to internal/service/service.go#DefaultStatus:constant
And internal/service/service.go points to internal/service/service.go#RetryStatus:constant
And internal/service/service.go points to internal/service/service.go#normalized:local
And internal/notify/notify.go points to internal/notify/notify.go#ConsoleNotifier:struct
And internal/notify/notify.go points to internal/notify/notify.go#NewConsoleNotifier:function
And internal/notify/notify.go points to internal/notify/notify.go#Send:method
And internal/model/model.go points to internal/model/model.go#Audited:struct
And internal/model/model.go points to internal/model/model.go#Task:struct
And internal/model/model.go points to internal/model/model.go#Result:struct
And internal/model/model.go points to internal/model/model.go#Notifier:interface
