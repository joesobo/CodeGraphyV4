using UnityEngine;

public interface IEnemyLifecycle {
	void Configure(EnemyDefinition definition, Transform playerTarget);
}
