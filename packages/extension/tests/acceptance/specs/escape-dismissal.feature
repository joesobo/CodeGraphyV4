Feature: Escape dismissal

Scenario: Escape dismisses one Sidebar Graph View layer at a time

Given I open the examples/example-typescript workspace in VS Code
When I open CodeGraphy in the Sidebar Graph View
And I have indexed the workspace
And I click the src/index.ts node to select it
And I open the Graph Scope
And I right click the src/index.ts node to open its Graph Context Menu
Then I see the "Open File" entry

When I press Escape in the Graph View
Then the Graph Context Menu closes
And the Graph Scope stays open

When I press Escape in the Graph View
Then the Graph Scope closes
And the Graph selection contains one node
And the Graph Stage has focus

When I press Escape in the Graph View
Then the Graph selection is empty

Scenario: Escape dismisses one Editor Graph View layer at a time

Given I open the examples/example-typescript workspace in VS Code
When I open CodeGraphy in the Editor Graph View
And I have indexed the workspace
And I click the src/index.ts node to select it
And I open the Graph Scope
And I right click the src/index.ts node to open its Graph Context Menu
Then I see the "Open File" entry

When I press Escape in the Graph View
Then the Graph Context Menu closes
And the Graph Scope stays open

When I press Escape in the Graph View
Then the Graph Scope closes
And the Graph selection contains one node
And the Graph Stage has focus

When I press Escape in the Graph View
Then the Graph selection is empty

Scenario: Escape closes each Sidebar Graph View surface through its normal lifecycle

Given I open the examples/example-typescript workspace in VS Code
When I open CodeGraphy in the Sidebar Graph View
And I have indexed the workspace
Then Escape closes each built-in panel and focuses the Graph Stage

When I open Filters
And I press Escape in the Graph View
Then the focused Filters input blurs and Filters stays open
When I press Escape in the Graph View
Then Filters closes and its button has focus

When I open an Add Legend Group prompt for src/index.ts
And I replace its draft with "unsaved-pattern"
And I press Escape in the Graph View
Then the Add Legend Group prompt closes without saving
And the Graph Stage has focus

Scenario: Escape closes each Editor Graph View surface through its normal lifecycle

Given I open the examples/example-typescript workspace in VS Code
When I open CodeGraphy in the Editor Graph View
And I have indexed the workspace
Then Escape closes each built-in panel and focuses the Graph Stage

When I open Filters
And I press Escape in the Graph View
Then the focused Filters input blurs and Filters stays open
When I press Escape in the Graph View
Then Filters closes and its button has focus

When I open an Add Legend Group prompt for src/index.ts
And I replace its draft with "unsaved-pattern"
And I press Escape in the Graph View
Then the Add Legend Group prompt closes without saving
And the Graph Stage has focus
