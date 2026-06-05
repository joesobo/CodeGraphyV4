#import <Foundation/Foundation.h>

@interface UserProfile : NSObject
@property(nonatomic, copy, readonly) NSString *name;
@property(nonatomic, copy, readonly) NSString *role;
- (instancetype)initWithName:(NSString *)name role:(NSString *)role;
@end
