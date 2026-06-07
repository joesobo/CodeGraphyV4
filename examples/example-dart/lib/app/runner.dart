import 'base_runner.dart';
import 'runnable.dart';
import '../model/user.dart';
import 'package:sample_app/model/profile.dart';

class Runner extends BaseRunner with Runnable {
  String run(User user) {
    return user.name;
  }
}

String boot(Profile profile) {
  return Runner().run(User(profile.name));
}
