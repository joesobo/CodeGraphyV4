import '../model/user.dart';
import 'package:sample_app/model/profile.dart';

abstract class BaseRunner {}
mixin Runnable {}

class Runner extends BaseRunner with Runnable {
  String run(User user) {
    return user.name;
  }
}

String boot(Profile profile) {
  return Runner().run(User(profile.name));
}
