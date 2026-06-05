#import "AppDelegate.h"
#import "Data/SessionStore.h"
#import "Controllers/DashboardController.h"

@implementation AppDelegate
- (void)applicationDidFinishLaunching {
  SessionStore *store = [SessionStore demoStore];
  DashboardController *controller = [[DashboardController alloc] initWithStore:store];
  [controller reloadDashboard];
}
@end
