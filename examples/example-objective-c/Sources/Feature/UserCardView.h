#import <Foundation/Foundation.h>

@class UserProfile;

@protocol ProfileRenderable
- (NSString *)renderTitle;
@end

@interface UserCardView : NSObject <ProfileRenderable>
- (void)renderProfile:(UserProfile *)profile;
@end
