using UnityEngine;

[RequireComponent(typeof(Rigidbody2D))]
public sealed class PlayerHealth : Health {
	private Rigidbody2D body;
	private Vector3 respawnPosition;

	protected override void Awake() {
		base.Awake();
		body = GetComponent<Rigidbody2D>();
		respawnPosition = transform.position;
	}

	protected override void Die() {
		transform.position = respawnPosition;

		if (body) {
			body.linearVelocity = Vector2.zero;
		}

		RestoreToFullHealth();
	}
}
