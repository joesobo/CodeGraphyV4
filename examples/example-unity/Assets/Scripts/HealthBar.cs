using UnityEngine;

public sealed class HealthBar : MonoBehaviour {
	[SerializeField] private Transform fill;

	private Vector3 fullScale;
	private bool scaleInitialized;

	private void Awake() {
		InitializeScale();
	}

	public void SetValue(int currentHealth, int maxHealth) {
		if (!fill || maxHealth <= 0) {
			return;
		}

		InitializeScale();

		var ratio = Mathf.Clamp01((float)currentHealth / maxHealth);
		fill.localScale = new(fullScale.x * ratio, fullScale.y, fullScale.z);
	}

	private void InitializeScale() {
		if (!fill || scaleInitialized) {
			return;
		}

		fullScale = fill.localScale;
		scaleInitialized = true;
	}
}
