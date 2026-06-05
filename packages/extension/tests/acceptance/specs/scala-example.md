# Feature: Scala Example

## Scenario: Scala example renders expected file nodes and import relationships

Given I open the examples/example-scala workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-scala workspace

Then I can see there are 11 nodes and 10 connections
And src/main/scala/com/example/app/Main.scala points to src/main/scala/com/example/model/User.scala
And src/main/scala/com/example/app/Main.scala points to src/main/scala/com/example/service/UserService.scala
And src/main/scala/com/example/app/Main.scala points to src/main/scala/com/example/view/DashboardView.scala
And src/main/scala/com/example/app/AppRunner.scala points to src/main/scala/com/example/base/BaseRunner.scala
And src/main/scala/com/example/app/AppRunner.scala points to src/main/scala/com/example/model/User.scala
And src/main/scala/com/example/app/AppRunner.scala points to src/main/scala/com/example/service/UserService.scala
And src/main/scala/com/example/app/AppRunner.scala points to src/main/scala/com/example/view/DashboardView.scala
And src/main/scala/com/example/repository/UserRepository.scala points to src/main/scala/com/example/model/User.scala
And src/main/scala/com/example/service/UserService.scala points to src/main/scala/com/example/model/User.scala
And src/main/scala/com/example/service/UserService.scala points to src/main/scala/com/example/repository/UserRepository.scala

And README.md is an orphan node
And build.sbt is an orphan node
And project/build.properties is an orphan node

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Inherits edge on
Then the top right of the graph says "1 connection"
And src/main/scala/com/example/app/AppRunner.scala points to src/main/scala/com/example/base/BaseRunner.scala
