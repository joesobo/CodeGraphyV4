#import <Foundation/Foundation.h>

@class SessionStore;

@interface DashboardController : NSObject
- (instancetype)initWithStore:(SessionStore *)store;
- (void)reloadDashboard;
@end
