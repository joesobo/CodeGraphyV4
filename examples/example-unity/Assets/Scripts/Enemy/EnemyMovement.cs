using UnityEngine;

[RequireComponent(typeof(Rigidbody2D))]
public sealed class EnemyMovement : Movement {
	private Transform target;

	public void Configure(EnemyDefinition definition, Transform playerTarget) {
		moveSpeed = definition.MoveSpeed;
		target = playerTarget;
	}

	private void FixedUpdate() {
		if (!target) {
			Body.linearVelocity = Vector2.zero;
			return;
		}

		MoveToward(target.position);
	}
}
