#import <Foundation/Foundation.h>

@class UserProfile;

@interface SessionStore : NSObject
+ (instancetype)demoStore;
- (UserProfile *)currentUser;
@end
