public sealed class EnemyHealth : Health {
	protected override void Die() {
		Destroy(gameObject);
	}
}
