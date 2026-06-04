#import <Foundation/Foundation.h>

@protocol Renderable
- (NSString *)renderTitle;
@end

@interface UserCard : NSObject <Renderable>
- (void)configureWithName:(NSString *)name;
@end
