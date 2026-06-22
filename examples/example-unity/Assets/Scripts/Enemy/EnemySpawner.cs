using UnityEngine;

public sealed class EnemySpawner : MonoBehaviour {
	[SerializeField] private EnemyDefinition[] enemyDefinitions;
	[SerializeField] private Transform player;
	[SerializeField] private float spawnHeight = 7f;
	[SerializeField] private float spawnHorizontalRange = 7f;
	[SerializeField] private float spawnInterval = 2.5f;

	private float nextSpawnTime;

	private void Awake() {
		if (!player) {
			var playerHealth = FindAnyObjectByType<PlayerHealth>();

			if (playerHealth) {
				player = playerHealth.transform;
			}
		}
	}

	private void Update() {
		if (enemyDefinitions == null || enemyDefinitions.Length == 0 || !player) {
			return;
		}

		if (Time.time < nextSpawnTime) {
			return;
		}

		SpawnEnemy();
		nextSpawnTime = Time.time + spawnInterval;
	}

	private void SpawnEnemy() {
		var enemyDefinition = PickEnemyDefinition();

		if (!enemyDefinition || !enemyDefinition.Prefab) {
			return;
		}

		var offsetX = Random.Range(-spawnHorizontalRange, spawnHorizontalRange);
		Vector3 spawnOffset = new(offsetX, spawnHeight, 0f);
		var spawnPosition = player.position + spawnOffset;
		var enemy = Instantiate(enemyDefinition.Prefab, spawnPosition, Quaternion.identity);

		if (enemy.TryGetComponent(out EnemyMovement movement)) {
			movement.Configure(enemyDefinition, player);
		}
	}

	private EnemyDefinition PickEnemyDefinition() {
		var index = Random.Range(0, enemyDefinitions.Length);
		return enemyDefinitions[index];
	}
}
