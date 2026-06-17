using UnityEngine;

public sealed class EnemyContactDamage : MonoBehaviour {
	[SerializeField] private int damage = 1;

	private void OnTriggerEnter2D(Collider2D other) {
		if (other.TryGetComponent(out PlayerHealth health)) {
			health.TakeDamage(damage);
			Destroy(gameObject);
		}
	}
}
