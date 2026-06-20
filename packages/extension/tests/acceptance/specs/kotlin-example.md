# Feature: Kotlin Example

## Scenario: Kotlin example renders expected file nodes and import relationships

Given I open the examples/example-kotlin workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 9 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-kotlin workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Inherits
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 9 nodes and 3 connections
And src/main/kotlin/com/example/app/AppRunner.kt points to src/main/kotlin/com/example/base/BaseRunner.kt
And src/main/kotlin/com/example/app/AppRunner.kt points to src/main/kotlin/com/example/base/RunnableThing.kt
And src/main/kotlin/com/example/app/AppRunner.kt points to src/main/kotlin/com/example/model/User.kt

And README.md is an orphan node
And build.gradle.kts is an orphan node
And settings.gradle.kts is an orphan node
And src/main/kotlin/com/example/app/Main.kt is an orphan node
And .gitignore is an orphan node

Then I toggle the Imports edge off
And I toggle the Inherits edge on
Then I can see there are 9 nodes and 2 connections
And src/main/kotlin/com/example/app/AppRunner.kt points to src/main/kotlin/com/example/base/BaseRunner.kt
And src/main/kotlin/com/example/app/AppRunner.kt points to src/main/kotlin/com/example/base/RunnableThing.kt

Then I toggle the Inherits edge off
And I toggle the Calls edge on
Then I can see there are 9 nodes and 1 connection
And src/main/kotlin/com/example/app/Main.kt points to src/main/kotlin/com/example/app/AppRunner.kt
