import '../model/run_status.dart';
import '../model/user.dart';

mixin Runnable {
  RunStatus run(User user);
}
