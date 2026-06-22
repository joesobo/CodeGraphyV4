using UnityEngine;
using UnityEngine.InputSystem;

public sealed class PlayerWeapon : MonoBehaviour {
	[SerializeField] private Bullet bulletPrefab;
	[SerializeField] private Transform playerVisual;
	[SerializeField] private Transform weaponPivot;
	[SerializeField] private Transform muzzle;
	[SerializeField] private Camera aimingCamera;
	[SerializeField] private Vector3 rightHandLocalPosition = new(0.55f, 0.2f, 0f);
	[SerializeField] private Vector3 leftHandLocalPosition = new(-0.55f, 0.2f, 0f);
	[SerializeField] private float aimFlipDeadZone = 0.15f;
	[SerializeField] private float fireCooldown = 0.18f;

	private bool facingLeft;
	private float nextFireTime;

	private void Update() {
		AimAtMouse();
	}

	public void OnAttack(InputValue value) {
		if (!value.isPressed || Time.time < nextFireTime) {
			return;
		}

		Fire();
		nextFireTime = Time.time + fireCooldown;
	}

	private void AimAtMouse() {
		if (!weaponPivot || !muzzle || !aimingCamera) {
			return;
		}

		var direction = GetAimDirection();
		weaponPivot.right = direction;
		FaceAimDirection(direction);
	}

	private void Fire() {
		if (!bulletPrefab || !muzzle || !aimingCamera) {
			return;
		}

		var direction = GetAimDirection();

		var bullet = Instantiate(bulletPrefab, muzzle.position, Quaternion.identity);
		bullet.Launch(direction);
	}

	private Vector2 GetAimDirection() {
		var target = GetAimWorldPosition();
		var direction = ((Vector2)target - (Vector2)muzzle.position).normalized;

		return direction.sqrMagnitude <= 0.001f ? Vector2.right : direction;
	}

	private void FaceAimDirection(Vector2 direction) {
		if (direction.x < -aimFlipDeadZone) {
			facingLeft = true;
		} else if (direction.x > aimFlipDeadZone) {
			facingLeft = false;
		}

		if (playerVisual) {
			var visualScale = playerVisual.localScale;
			visualScale.x = facingLeft ? -Mathf.Abs(visualScale.x) : Mathf.Abs(visualScale.x);
			playerVisual.localScale = visualScale;
		}

		weaponPivot.localPosition = facingLeft ? leftHandLocalPosition : rightHandLocalPosition;
	}

	private Vector3 GetAimWorldPosition() {
		if (Mouse.current == null) {
			return muzzle.position + transform.up;
		}

		var mousePosition = Mouse.current.position.ReadValue();
		var worldPosition = aimingCamera.ScreenToWorldPoint(new(mousePosition.x, mousePosition.y, -aimingCamera.transform.position.z));
		worldPosition.z = 0f;
		return worldPosition;
	}
}
