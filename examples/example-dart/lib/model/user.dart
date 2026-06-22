typedef UserId = String;

class User {
  final UserId id;
  final String name;
  final bool isActive;

  const User(this.name, {
    this.id = 'anonymous',
    required this.isActive,
  });
}
