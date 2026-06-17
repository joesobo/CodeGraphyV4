import '../model/profile.dart';
import '../model/run_status.dart';

typedef RunLabel = String Function(Profile profile, RunStatus status);

const String statusPrefix = 'status';

String formatRun(Profile profile, RunStatus status) {
  final normalizedName = profile.name.trim();
  return '$normalizedName: $statusPrefix=${status.name}';
}
