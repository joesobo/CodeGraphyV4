Feature: Dart Example

Scenario: Dart example renders expected file nodes and supported Dart relationships

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
And I can see there are 12 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-dart workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are only Imports, References, Calls, Inherits, Contains
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 12 nodes and 16 connections
And bin/sample_app.dart points to lib/app/runner.dart
And bin/sample_app.dart points to lib/model/profile.dart
And bin/sample_app.dart points to lib/model/run_status.dart
And lib/app/runner.dart points to lib/app/base_runner.dart
And lib/app/runner.dart points to lib/app/runnable.dart
And lib/app/runner.dart points to lib/app/auditable.dart
And lib/app/runner.dart points to lib/app/format_run.dart
And lib/app/runner.dart points to lib/model/user.dart
And lib/app/runner.dart points to lib/model/profile.dart
And lib/app/runner.dart points to lib/model/run_status.dart
And lib/app/auditable.dart points to lib/model/profile.dart
And lib/app/format_run.dart points to lib/model/profile.dart
And lib/app/format_run.dart points to lib/model/run_status.dart
And lib/app/runnable.dart points to lib/model/run_status.dart
And lib/app/runnable.dart points to lib/model/user.dart
And lib/model/profile.dart points to lib/model/run_status.dart

And README.md is an orphan node
And pubspec.yaml is an orphan node
And .gitignore is an orphan node

When I toggle the Imports edge off
And I toggle the Inherits edge on
Then I can see there are 12 nodes and 3 connections
And lib/app/runner.dart points to lib/app/base_runner.dart
And lib/app/runner.dart points to lib/app/runnable.dart
And lib/app/runner.dart points to lib/app/auditable.dart

When I toggle the Inherits edge off
And I toggle the Calls edge on
Then I can see there are 12 nodes and 7 connections
And bin/sample_app.dart points to lib/app/runner.dart
And bin/sample_app.dart points to lib/model/profile.dart
And lib/app/runner.dart points to lib/app/format_run.dart
And lib/app/runner.dart points to lib/model/user.dart
And lib/app/runner.dart points to lib/app/runner.dart
And lib/app/runner.dart points to lib/model/profile.dart

When I toggle the Calls edge off
And I toggle the References edge on
Then I can see there are 12 nodes and 9 connections
And bin/sample_app.dart points to lib/model/profile.dart
And bin/sample_app.dart points to lib/model/run_status.dart
And lib/app/format_run.dart points to lib/model/profile.dart
And lib/app/format_run.dart points to lib/model/run_status.dart
And lib/app/runnable.dart points to lib/model/run_status.dart
And lib/app/runnable.dart points to lib/model/user.dart
And lib/app/runner.dart points to lib/app/format_run.dart
And lib/app/runner.dart points to lib/model/profile.dart
And lib/app/runner.dart points to lib/model/user.dart

Scenario: Function node type works

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Function node types
Then I can see there are 15 nodes and 0 connections
And the visible graph includes the Function node main from bin/sample_app.dart
And the visible graph includes the Function node boot from lib/app/runner.dart
And the visible graph includes the Function node formatRun from lib/app/format_run.dart
When I toggle the Contains edge on
Then I can see there are 15 nodes and 3 connections
And bin/sample_app.dart points to bin/sample_app.dart#main:function
And lib/app/runner.dart points to lib/app/runner.dart#boot:function
And lib/app/format_run.dart points to lib/app/format_run.dart#formatRun:function

Scenario: Class node type works

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Class node types
Then I can see there are 17 nodes and 0 connections
And the visible graph includes the Class node Runner from lib/app/runner.dart
And the visible graph includes the Class node Auditable from lib/app/auditable.dart
And the visible graph includes the Class node BaseRunner from lib/app/base_runner.dart
And the visible graph includes the Class node Profile from lib/model/profile.dart
And the visible graph includes the Class node User from lib/model/user.dart
When I toggle the Contains edge on
Then I can see there are 17 nodes and 5 connections
And lib/app/runner.dart points to lib/app/runner.dart#Runner:class
And lib/app/auditable.dart points to lib/app/auditable.dart#Auditable:class
And lib/model/profile.dart points to lib/model/profile.dart#Profile:class

Scenario: Mixin node type works

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Mixin node types
Then I can see there are 13 nodes and 0 connections
And the visible graph includes the Mixin node Runnable from lib/app/runnable.dart
When I toggle the Contains edge on
Then I can see there are 13 nodes and 1 connection
And lib/app/runnable.dart points to lib/app/runnable.dart#Runnable:mixin

Scenario: Enum node type works

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Enum node types
Then I can see there are 13 nodes and 0 connections
And the visible graph includes the Enum node RunStatus from lib/model/run_status.dart
When I toggle the Contains edge on
Then I can see there are 13 nodes and 1 connection
And lib/model/run_status.dart points to lib/model/run_status.dart#RunStatus:enum

Scenario: Alias node type works

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Alias node types
Then I can see there are 14 nodes and 0 connections
And the visible graph includes the Alias node RunLabel from lib/app/format_run.dart
And the visible graph includes the Alias node UserId from lib/model/user.dart
When I toggle the Contains edge on
Then I can see there are 14 nodes and 2 connections
And lib/app/format_run.dart points to lib/app/format_run.dart#RunLabel:alias
And lib/model/user.dart points to lib/model/user.dart#UserId:alias

Scenario: Extension node type works

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Extension node types
Then I can see there are 13 nodes and 0 connections
And the visible graph includes the Extension node ProfileAudit from lib/app/runner.dart
When I toggle the Contains edge on
Then I can see there are 13 nodes and 1 connection
And lib/app/runner.dart points to lib/app/runner.dart#ProfileAudit:extension

Scenario: Method node type works

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Method node types
Then I can see there are 16 nodes and 0 connections
And the visible graph includes the Method node record from lib/app/auditable.dart
And the visible graph includes the Method node run from lib/app/runnable.dart
And the visible graph includes the Method node record from lib/app/runner.dart
And the visible graph includes the Method node run from lib/app/runner.dart
When I toggle the Contains edge on
Then I can see there are 16 nodes and 4 connections
And lib/app/auditable.dart points to lib/app/auditable.dart#record:method
And lib/app/runnable.dart points to lib/app/runnable.dart#run:method
And lib/app/runner.dart points to lib/app/runner.dart#record:method

Scenario: Local node type works

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Local node types
Then I can see there are 17 nodes and 0 connections
And the visible graph includes the Local node profile from bin/sample_app.dart
And the visible graph includes the Local node normalizedName from lib/app/format_run.dart
And the visible graph includes the Local node auditLabel from lib/app/runner.dart
And the visible graph includes the Local node runner from lib/app/runner.dart
And the visible graph includes the Local node status from lib/app/runner.dart
When I toggle the Contains edge on
Then I can see there are 17 nodes and 5 connections
And bin/sample_app.dart points to bin/sample_app.dart#profile:local
And lib/app/format_run.dart points to lib/app/format_run.dart#normalizedName:local
And lib/app/runner.dart points to lib/app/runner.dart#auditLabel:local

Scenario: Constant node type works

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Constant node types
Then I can see there are 15 nodes and 0 connections
And the visible graph includes the Constant node maxRetries from lib/app/base_runner.dart
And the visible graph includes the Constant node statusPrefix from lib/app/format_run.dart
And the visible graph includes the Constant node defaultRetryCount from lib/app/runner.dart
When I toggle the Contains edge on
Then I can see there are 15 nodes and 3 connections
And lib/app/base_runner.dart points to lib/app/base_runner.dart#maxRetries:constant
And lib/app/format_run.dart points to lib/app/format_run.dart#statusPrefix:constant
And lib/app/runner.dart points to lib/app/runner.dart#defaultRetryCount:constant

Scenario: Contains edge connects Dart files to supported nodes

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the Contains edge type
And I show only the File, Function, Class, Mixin, Enum, Alias, Extension, Method, Local and Constant node types
Then I can see there are 37 nodes and 25 connections
And lib/app/runner.dart points to lib/app/runner.dart#Runner:class
And lib/app/runner.dart points to lib/app/runner.dart#ProfileAudit:extension
And lib/app/runner.dart points to lib/app/runner.dart#defaultRetryCount:constant
And lib/app/runner.dart points to lib/app/runner.dart#record:method
And lib/app/runner.dart points to lib/app/runner.dart#status:local
And lib/app/format_run.dart points to lib/app/format_run.dart#RunLabel:alias
And lib/app/format_run.dart points to lib/app/format_run.dart#formatRun:function
And lib/app/runnable.dart points to lib/app/runnable.dart#Runnable:mixin
And lib/model/run_status.dart points to lib/model/run_status.dart#RunStatus:enum
