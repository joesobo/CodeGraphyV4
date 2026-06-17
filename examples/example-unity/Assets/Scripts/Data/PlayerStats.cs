using UnityEngine;

namespace CodeGraphy.UnityExample.Data
{
    [CreateAssetMenu(menuName = "CodeGraphy/Player Stats")]
    public sealed class PlayerStats : ScriptableObject
    {
        [SerializeField] private int maxHealth = 100;
        [SerializeField] private float moveSpeed = 6.5f;
        [SerializeField] private string displayName = "Runner";

        public int MaxHealth => maxHealth;
        public float MoveSpeed => moveSpeed;
        public string DisplayName => displayName;
    }
}
