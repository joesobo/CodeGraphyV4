using UnityEngine;

[CreateAssetMenu(menuName = "Unity Example/Enemy Definition")]
public sealed class EnemyDefinition : ScriptableObject {
	[SerializeField] private string displayName = "Enemy 1";
	[SerializeField] private GameObject prefab;
	[SerializeField] private float moveSpeed = 1.4f;

	public string DisplayName => displayName;
	public GameObject Prefab => prefab;
	public float MoveSpeed => moveSpeed;
}
