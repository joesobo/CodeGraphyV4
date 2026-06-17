import 'package:sample_app/app/runner.dart';
import 'package:sample_app/model/profile.dart';
import 'package:sample_app/model/run_status.dart';

void main() {
  final profile = Profile('Ada', status: RunStatus.ready);
  boot(profile);
}
