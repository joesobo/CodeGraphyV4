# Feature: Pascal Example

## Scenario: Pascal example renders expected file nodes and uses relationships

Given I open the examples/example-pascal workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 9 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-pascal workspace

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

Then I toggle the Imports edge off
Then I show only the File and Class node types
Then I toggle the Contains edge on
Then I can see there are 9 nodes and 5 connections
And src/SampleApp.pas points to src/SampleApp.pas#TAppRunner:class
And src/RunnerSupport.pas points to src/RunnerSupport.pas#TBaseRunner:class

Then I toggle the Contains edge off
And I toggle the Inherits edge on
Then I can see there are 9 nodes and 1 connections
And src/SampleApp.pas points to src/RunnerSupport.pas

Then I toggle the Inherits edge off
Then I show only the File and Function node types
Then I toggle the Overrides edge on
Then I can see there are 9 nodes and 1 connections
And src/SampleApp.pas#Start:method points to src/RunnerSupport.pas#Start:method
