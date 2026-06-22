import '../model/profile.dart';

abstract interface class Auditable {
  void record(Profile profile);
}
