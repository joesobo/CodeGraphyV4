# Feature: Dart Example

## Scenario: Dart example renders expected file nodes and import relationships

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-dart workspace

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

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Inherits edge on
Then the top right of the graph says "2 connections"
And lib/app/runner.dart points to lib/app/base_runner.dart
And lib/app/runner.dart points to lib/app/runnable.dart
