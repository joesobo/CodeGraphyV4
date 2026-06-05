#import "UserProfile.h"

@implementation UserProfile
- (instancetype)initWithName:(NSString *)name role:(NSString *)role {
  self = [super init];
  if (self) {
    _name = [name copy];
    _role = [role copy];
  }
  return self;
}
@end
