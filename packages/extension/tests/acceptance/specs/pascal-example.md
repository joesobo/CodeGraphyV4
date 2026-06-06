# Feature: Pascal Example

## Scenario: Pascal example renders expected file nodes and uses relationships

Given I open the examples/example-pascal workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-pascal workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Inherits
And I close the Graph Scope

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
