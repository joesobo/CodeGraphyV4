#import <Foundation/Foundation.h>
#import "AppView.h"
#import "ProfileRenderable.h"

@class UserProfile;

@interface UserCardView : AppView <ProfileRenderable>
- (void)renderProfile:(UserProfile *)profile;
@end
