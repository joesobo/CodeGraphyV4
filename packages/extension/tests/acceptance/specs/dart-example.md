# Feature: Dart Example

## Scenario: Dart example renders expected file nodes and import relationships

Given I open the examples/example-dart workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-dart workspace

Then I can see there are 7 nodes and 4 connections
And bin/sample_app.dart points to lib/app/runner.dart
And bin/sample_app.dart points to lib/model/profile.dart
And lib/app/runner.dart points to lib/model/user.dart
And lib/app/runner.dart points to lib/model/profile.dart

And README.md is an orphan node
And pubspec.yaml is an orphan node
And .gitignore is an orphan node
