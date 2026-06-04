#import "UserCardView.h"
#import "../Models/UserProfile.h"

@interface UserCardView ()
@property(nonatomic, copy) NSString *title;
@end

@implementation UserCardView
- (void)renderProfile:(UserProfile *)profile {
  self.title = [NSString stringWithFormat:@"%@ - %@", profile.name, profile.role];
}

- (NSString *)renderTitle {
  return self.title ?: @"No profile";
}
@end
