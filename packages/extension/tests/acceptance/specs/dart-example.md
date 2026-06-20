# Feature: Dart Example

## Scenario: Dart example renders expected file nodes and import relationships

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 9 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-dart workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Inherits
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 9 nodes and 6 connections
And bin/sample_app.dart points to lib/app/runner.dart
And bin/sample_app.dart points to lib/model/profile.dart
And lib/app/runner.dart points to lib/app/base_runner.dart
And lib/app/runner.dart points to lib/app/runnable.dart
And lib/app/runner.dart points to lib/model/user.dart
And lib/app/runner.dart points to lib/model/profile.dart

And README.md is an orphan node
And pubspec.yaml is an orphan node
And .gitignore is an orphan node

Then I toggle the Imports edge off
And I toggle the Inherits edge on
Then I can see there are 9 nodes and 2 connections
And lib/app/runner.dart points to lib/app/base_runner.dart
And lib/app/runner.dart points to lib/app/runnable.dart

Then I toggle the Inherits edge off
And I toggle the Calls edge on
Then I can see there are 9 nodes and 3 connections
And bin/sample_app.dart points to lib/app/runner.dart
And bin/sample_app.dart points to lib/model/profile.dart
And lib/app/runner.dart points to lib/model/user.dart
