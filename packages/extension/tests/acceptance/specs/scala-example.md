# Feature: Scala Example

## Scenario: Scala example renders expected file nodes and import relationships

Given I open the examples/example-scala workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 11 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-scala workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Inherits
And I close the Graph Scope

When I toggle the Imports edge on
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

Then I toggle the Imports edge off
And I toggle the Inherits edge on
Then I can see there are 11 nodes and 1 connections
And src/main/scala/com/example/app/AppRunner.scala points to src/main/scala/com/example/base/BaseRunner.scala

Then I toggle the Inherits edge off
And I toggle the Calls edge on
Then I can see there are 11 nodes and 8 connections
And src/main/scala/com/example/app/Main.scala points to src/main/scala/com/example/service/UserService.scala
And src/main/scala/com/example/app/Main.scala points to src/main/scala/com/example/view/DashboardView.scala
And src/main/scala/com/example/app/Main.scala points to src/main/scala/com/example/app/AppRunner.scala
And src/main/scala/com/example/app/Main.scala points to src/main/scala/com/example/model/User.scala
And src/main/scala/com/example/app/AppRunner.scala points to src/main/scala/com/example/service/UserService.scala
And src/main/scala/com/example/app/AppRunner.scala points to src/main/scala/com/example/view/DashboardView.scala
And src/main/scala/com/example/service/UserService.scala points to src/main/scala/com/example/repository/UserRepository.scala
And src/main/scala/com/example/repository/UserRepository.scala points to src/main/scala/com/example/model/User.scala
