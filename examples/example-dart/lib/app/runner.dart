import 'base_runner.dart';
import 'runnable.dart';
import 'auditable.dart';
import 'format_run.dart';
import '../model/user.dart';
import 'package:sample_app/model/profile.dart';
import 'package:sample_app/model/run_status.dart';

class Runner extends BaseRunner with Runnable implements Auditable {
  @override
  void record(Profile profile) {
    lastProfileName = profile.name;
  }

  RunStatus run(User user) => user.isActive ? RunStatus.ready : RunStatus.archived;
}

String boot(Profile profile) {
  final runner = Runner();
  runner.record(profile);
  final status = runner.run(User(profile.name, isActive: true));
  return formatRun(profile, status);
}
