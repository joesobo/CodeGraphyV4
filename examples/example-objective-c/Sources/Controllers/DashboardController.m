#import "DashboardController.h"
#import "../Data/SessionStore.h"
#import "../Feature/UserCardView.h"
#import "../Models/UserProfile.h"

@interface DashboardController ()
@property(nonatomic, strong) SessionStore *store;
@property(nonatomic, strong) UserCardView *cardView;
@end

@implementation DashboardController
- (instancetype)initWithStore:(SessionStore *)store {
  self = [super init];
  if (self) {
    _store = store;
    _cardView = [UserCardView new];
  }
  return self;
}

- (void)reloadDashboard {
  UserProfile *profile = [self.store currentUser];
  [self.cardView renderProfile:profile];
}
@end
