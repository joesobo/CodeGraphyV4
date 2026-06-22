using UnityEngine;

[RequireComponent(typeof(Rigidbody2D))]
public sealed class Bullet : MonoBehaviour {
	[SerializeField] private float speed = 12f;
	[SerializeField] private int damage = 1;
	[SerializeField] private float lifetime = 2f;

	private Rigidbody2D body;

	private void Awake() {
		body = GetComponent<Rigidbody2D>();
	}

	private void OnEnable() {
		Destroy(gameObject, lifetime);
	}

	public void Launch(Vector2 direction) {
		transform.right = direction;
		body.linearVelocity = direction.normalized * speed;
	}

	private void OnTriggerEnter2D(Collider2D other) {
		if (other.TryGetComponent(out EnemyHealth health)) {
			health.TakeDamage(damage);
			Destroy(gameObject);
		}
	}
}
