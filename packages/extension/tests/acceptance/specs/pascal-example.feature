Feature: Pascal Example

Background:

Given I open the examples/example-pascal workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace

Scenario: Pascal example renders file nodes and uses relationships

Then I see graph nodes
And I show no edge types
And I can see there are 9 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-pascal workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are Imports, References, Calls, Inherits, Contains, Overrides
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 9 nodes and 9 connections
And src/Main.pas points to src/SampleApp.pas
And src/SampleApp.pas points to src/RunnerSupport.pas
And src/SampleApp.pas points to src/OrderModel.pas
And src/SampleApp.pas points to src/OrderRepository.pas
And src/SampleApp.pas points to src/PricingService.pas
And src/SampleApp.pas points to src/ReceiptView.pas
And src/OrderRepository.pas points to src/OrderModel.pas
And src/PricingService.pas points to src/OrderModel.pas
And src/ReceiptView.pas points to src/OrderModel.pas

And README.md is an orphan node

Scenario: Pascal example exposes type and semantic edge relationships

When I show no edge types
And I toggle the Class node on
Then I can see there are 14 nodes and 0 connections
When I toggle the Contains edge on
Then I can see there are 14 nodes and 5 connections
And src/SampleApp.pas points to src/SampleApp.pas#TAppRunner:class
And src/RunnerSupport.pas points to src/RunnerSupport.pas#TBaseRunner:class

When I toggle the Contains edge off
And I toggle the Class node off
And I toggle the Inherits edge on
Then I can see there are 9 nodes and 1 connection
And src/SampleApp.pas points to src/RunnerSupport.pas

When I toggle the Overrides edge on
Then I can see there are 9 nodes and 2 connections
And src/SampleApp.pas has 2 edges pointing to src/RunnerSupport.pas

When I toggle the Inherits edge off
And I toggle the Overrides edge off
And I toggle the Calls edge on
Then I can see there are 9 nodes and 4 connections
And src/Main.pas points to src/SampleApp.pas
And src/SampleApp.pas points to src/OrderRepository.pas
And src/SampleApp.pas points to src/PricingService.pas
And src/SampleApp.pas points to src/ReceiptView.pas
