# Objective-C UIKit Example

This small Objective-C workspace tests CodeGraphy's Core Objective-C coverage. An app delegate owns a dashboard controller. The controller loads users from a session store, and a card view renders the selected user.

Open `examples/example-objective-c` in CodeGraphy and look for:

- `Sources/main.m -> Sources/AppDelegate.h#import`
- `Sources/AppDelegate.m -> Sources/AppDelegate.h#import`
- `Sources/AppDelegate.m -> Sources/Controllers/DashboardController.h#import`
- `Sources/Controllers/DashboardController.m -> Sources/Data/SessionStore.h#import`
- `Sources/Controllers/DashboardController.m -> Sources/Feature/UserCardView.h#import`
- `Sources/Feature/UserCardView.m -> Sources/Models/UserProfile.h#import`
- `Sources/Feature/UserCardView.h -> Sources/Feature/AppView.h#inherit`
- `Sources/Feature/UserCardView.h -> Sources/Feature/ProfileRenderable.h#inherit`

## Symbol Node Demo

Suggested symbol check:

1. Open `Sources/AppDelegate.m`.
2. In Graph Scope, enable **Symbol**.
3. Search for `main`, `AppDelegate`, `DashboardController`, `AppView`, `ProfileRenderable`, `UserCardView`, and `renderTitle`.

Expected behavior:

- Interface and implementation declarations appear as class symbols.
- Objective-C method declarations/definitions appear as method symbols.
- `UserCardView` inherits from `AppView` and conforms to `ProfileRenderable`, giving Objective-C inheritance and protocol conformance distinct file targets.
