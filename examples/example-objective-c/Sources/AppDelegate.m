#import "Feature/UserCard.h"

@interface AppDelegate : NSObject
- (void)applicationDidFinishLaunching;
@end

@implementation AppDelegate
- (void)applicationDidFinishLaunching {
  UserCard *card = [UserCard new];
  [card configureWithName:@"Ada"];
}
@end
