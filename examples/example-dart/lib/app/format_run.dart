import '../model/profile.dart';
import '../model/run_status.dart';

String formatRun(Profile profile, RunStatus status) {
  return '${profile.name}: ${status.name}';
}
