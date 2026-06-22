using UnityEngine;

[RequireComponent(typeof(Rigidbody2D))]
public abstract class Movement : MonoBehaviour {
	[SerializeField] protected float moveSpeed = 4f;

	protected Rigidbody2D Body { get; private set; }

	protected virtual void Awake() {
		Body = GetComponent<Rigidbody2D>();
	}

	protected void SetHorizontalVelocity(float direction, float speedMultiplier = 1f) {
		var velocity = Body.linearVelocity;
		velocity.x = direction * moveSpeed * speedMultiplier;
		Body.linearVelocity = velocity;
	}

	protected void MoveToward(Vector2 targetPosition) {
		var direction = (targetPosition - Body.position).normalized;
		Body.linearVelocity = direction * moveSpeed;
	}
}
