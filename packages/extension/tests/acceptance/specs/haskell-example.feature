Feature: Haskell Example

Scenario: Haskell example covers module imports, imported calls, and generic symbols

Given I open the examples/example-haskell workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
And I can see there are 7 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-haskell workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are Imports, References, Calls, Contains
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 7 nodes and 5 connections
And src/Main.hs points to src/App/Feature/Runner.hs
And src/Main.hs points to src/App/Model/Profile.hs
And src/Main.hs points to src/App/Model/User.hs
And src/App/Feature/Runner.hs points to src/App/Model/Profile.hs
And src/App/Feature/Runner.hs points to src/App/Model/User.hs

And README.md is an orphan node
And example-haskell.cabal is an orphan node
And .gitignore is an orphan node

When I toggle the Imports edge off
And I toggle the References edge on
Then I can see there are 7 nodes and 2 connections
And src/App/Feature/Runner.hs points to src/App/Model/Profile.hs
And src/App/Feature/Runner.hs points to src/App/Model/User.hs

When I toggle the References edge off
And I toggle the Calls edge on
Then I can see there are 7 nodes and 5 connections
And src/Main.hs points to src/App/Feature/Runner.hs
And src/Main.hs points to src/App/Model/Profile.hs
And src/Main.hs points to src/App/Model/User.hs
And src/App/Feature/Runner.hs points to src/App/Model/Profile.hs
And src/App/Feature/Runner.hs points to src/App/Model/User.hs

When I show only the Contains edge type
And I show only the File and Function node types
Then I can see there are 14 nodes and 7 connections
And the visible graph includes the Function node main from src/Main.hs
And the visible graph includes the Function node boot from src/App/Feature/Runner.hs
And the visible graph includes the Function node renderGreeting from src/App/Feature/Runner.hs
And the visible graph includes the Function node makeUser from src/App/Model/User.hs
And src/Main.hs points to src/Main.hs#main:function
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#greet:function
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#boot:function
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#renderGreeting:function
And src/App/Model/User.hs points to src/App/Model/User.hs#makeUser:function
And src/App/Model/User.hs points to src/App/Model/User.hs#describeUser:function
And src/App/Model/Profile.hs points to src/App/Model/Profile.hs#describeProfile:function

Then I show only the File and Type node types
Then I can see there are 12 nodes and 5 connections
And the visible graph includes the Type node Greeting from src/App/Feature/Runner.hs
And the visible graph includes the Type node Runner from src/App/Feature/Runner.hs
And the visible graph includes the Type node RunnerId from src/App/Feature/Runner.hs
And the visible graph includes the Type node User from src/App/Model/User.hs
And the visible graph includes the Type node Profile from src/App/Model/Profile.hs
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#Greeting:type
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#RunnerId:type
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#Runner:type
And src/App/Model/User.hs points to src/App/Model/User.hs#User:type
And src/App/Model/Profile.hs points to src/App/Model/Profile.hs#Profile:type

Then I show only the File and Class node types
Then I can see there are 8 nodes and 1 connection
And the visible graph includes the Class node Runnable from src/App/Feature/Runner.hs
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#Runnable:class

Then I show only the File and Constant node types
Then I can see there are 8 nodes and 1 connection
And the visible graph includes the Constant node defaultRunnerId from src/App/Feature/Runner.hs
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#defaultRunnerId:constant

Then I show only the File and Field node types
Then I can see there are 12 nodes and 5 connections
And the visible graph includes the Field node runnerId from src/App/Feature/Runner.hs
And the visible graph includes the Field node runnerUser from src/App/Feature/Runner.hs
And the visible graph includes the Field node runnerProfile from src/App/Feature/Runner.hs
And the visible graph includes the Field node userName from src/App/Model/User.hs
And the visible graph includes the Field node profileName from src/App/Model/Profile.hs
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#runnerId:field
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#runnerUser:field
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#runnerProfile:field
And src/App/Model/User.hs points to src/App/Model/User.hs#userName:field
And src/App/Model/Profile.hs points to src/App/Model/Profile.hs#profileName:field

Then I show only the File and Parameter node types
Then I can see there are 14 nodes and 7 connections
And the visible graph includes the Parameter node runner from src/App/Feature/Runner.hs
And the visible graph includes the Parameter node task from src/App/Feature/Runner.hs
And the visible graph includes the Parameter node name from src/App/Model/User.hs
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#runner:parameter
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#user:parameter
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#profile:parameter
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#task:parameter
And src/App/Model/User.hs points to src/App/Model/User.hs#name:parameter
And src/App/Model/User.hs points to src/App/Model/User.hs#user:parameter
And src/App/Model/Profile.hs points to src/App/Model/Profile.hs#profile:parameter

Then I show only the File and Local node types
Then I can see there are 9 nodes and 2 connections
And the visible graph includes the Local node message from src/App/Feature/Runner.hs
And the visible graph includes the Local node decorated from src/App/Feature/Runner.hs
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#message:local
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#decorated:local

Then I show only the File, Function, Type, Class, Constant, Field, Parameter and Local node types
Then I can see there are 35 nodes and 28 connections
And src/Main.hs points to src/Main.hs#main:function
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#Greeting:type
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#RunnerId:type
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#Runner:type
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#Runnable:class
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#defaultRunnerId:constant
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#runnerId:field
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#runnerUser:field
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#runnerProfile:field
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#greet:function
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#boot:function
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#renderGreeting:function
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#runner:parameter
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#user:parameter
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#profile:parameter
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#task:parameter
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#message:local
And src/App/Feature/Runner.hs points to src/App/Feature/Runner.hs#decorated:local
And src/App/Model/User.hs points to src/App/Model/User.hs#User:type
And src/App/Model/User.hs points to src/App/Model/User.hs#userName:field
And src/App/Model/User.hs points to src/App/Model/User.hs#makeUser:function
And src/App/Model/User.hs points to src/App/Model/User.hs#describeUser:function
And src/App/Model/User.hs points to src/App/Model/User.hs#name:parameter
And src/App/Model/User.hs points to src/App/Model/User.hs#user:parameter
And src/App/Model/Profile.hs points to src/App/Model/Profile.hs#Profile:type
And src/App/Model/Profile.hs points to src/App/Model/Profile.hs#profileName:field
And src/App/Model/Profile.hs points to src/App/Model/Profile.hs#describeProfile:function
And src/App/Model/Profile.hs points to src/App/Model/Profile.hs#profile:parameter
