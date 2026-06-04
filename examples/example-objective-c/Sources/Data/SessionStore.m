#import "SessionStore.h"
#import "../Models/UserProfile.h"

@implementation SessionStore
+ (instancetype)demoStore {
  return [SessionStore new];
}

- (UserProfile *)currentUser {
  return [[UserProfile alloc] initWithName:@"Ada Lovelace" role:@"Graph Explorer"];
}
@end
