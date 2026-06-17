import 'base_runner.dart';
import 'runnable.dart';
import 'auditable.dart';
import 'format_run.dart';
import '../model/user.dart';
import 'package:sample_app/model/profile.dart';
import 'package:sample_app/model/run_status.dart';

const int defaultRetryCount = 2;
final String runnerName = 'daily-runner';
int completedRuns = 0;

extension ProfileAudit on Profile {
  String get auditLabel => '$runnerName:${name.toLowerCase()}';
}

class Runner extends BaseRunner with Runnable implements Auditable {
  final RunLabel labelFormatter;
  int retries;

  Runner({
    this.labelFormatter = formatRun,
    this.retries = defaultRetryCount,
  });

  @override
  void record(Profile profile) {
    lastProfileName = profile.name;
    final auditLabel = profile.auditLabel;
    completedRuns += auditLabel.length;
  }

  @override
  RunStatus run(User user) => user.isActive ? RunStatus.ready : RunStatus.archived;
}

String boot(Profile profile) {
  final runner = Runner();
  runner.record(profile);
  final status = runner.run(User(profile.name, isActive: true));
  return formatRun(profile, status);
}
