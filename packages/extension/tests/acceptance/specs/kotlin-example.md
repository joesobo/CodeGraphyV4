# Feature: Kotlin Example

## Scenario: Kotlin example renders expected file nodes and import relationships

Given I open the examples/example-kotlin workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-kotlin workspace

Then I can see there are 8 nodes and 5 connections
And src/main/kotlin/com/example/app/AppRunner.kt points to src/main/kotlin/com/example/base/BaseRunner.kt
And src/main/kotlin/com/example/app/AppRunner.kt points to src/main/kotlin/com/example/base/RunnableThing.kt
And src/main/kotlin/com/example/app/AppRunner.kt points to src/main/kotlin/com/example/model/User.kt

And README.md is an orphan node
And build.gradle.kts is an orphan node
And settings.gradle.kts is an orphan node
And src/main/kotlin/com/example/app/Main.kt is an orphan node
