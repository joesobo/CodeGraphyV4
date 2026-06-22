using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(Rigidbody2D))]
[RequireComponent(typeof(Collider2D))]
public sealed class PlayerMovement : Movement {
	[SerializeField] private float sprintMultiplier = 1.6f;
	[SerializeField] private float jumpVelocity = 7.5f;
	[SerializeField] private LayerMask groundLayers = ~0;

	private Collider2D bodyCollider;
	private Vector2 moveInput;
	private bool jumpQueued;
	private bool sprinting;

	protected override void Awake() {
		base.Awake();
		bodyCollider = GetComponent<Collider2D>();
	}

	public void OnMove(InputValue value) {
		moveInput = value.Get<Vector2>();
	}

	public void OnJump(InputValue value) {
		if (value.isPressed) {
			jumpQueued = true;
		}
	}

	public void OnSprint(InputValue value) {
		sprinting = value.isPressed;
	}

	private void FixedUpdate() {
		SetHorizontalVelocity(moveInput.x, sprinting ? sprintMultiplier : 1f);

		if (jumpQueued && bodyCollider.IsTouchingLayers(groundLayers)) {
			var velocity = Body.linearVelocity;
			velocity.y = jumpVelocity;
			Body.linearVelocity = velocity;
		}

		jumpQueued = false;
	}
}
