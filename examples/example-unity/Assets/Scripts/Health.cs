using UnityEngine;

public abstract class Health : MonoBehaviour {
	[SerializeField] private int maxHealth = 1;
	[SerializeField] private HealthBar healthBar;

	private int currentHealth;

	public int CurrentHealth => currentHealth;
	public int MaxHealth => maxHealth;

	protected virtual void Awake() {
		currentHealth = maxHealth;
		UpdateHealthBar();
	}

	public void TakeDamage(int damage) {
		if (damage <= 0 || currentHealth <= 0) {
			return;
		}

		currentHealth = Mathf.Max(0, currentHealth - damage);
		UpdateHealthBar();

		if (currentHealth == 0) {
			Die();
		}
	}

	protected void RestoreToFullHealth() {
		currentHealth = maxHealth;
		UpdateHealthBar();
	}

	private void UpdateHealthBar() {
		if (healthBar) {
			healthBar.SetValue(currentHealth, maxHealth);
		}
	}

	protected abstract void Die();
}
