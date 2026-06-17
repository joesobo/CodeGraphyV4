using CodeGraphy.UnityExample.Data;
using UnityEngine;

namespace CodeGraphy.UnityExample
{
    public sealed class PlayerController : MonoBehaviour
    {
        [SerializeField] private PlayerStats stats;

        private int currentHealth;

        public void Initialize(PlayerStats playerStats)
        {
            stats = playerStats;
            currentHealth = stats.MaxHealth;
        }

        public void BeginRun()
        {
            Debug.Log($"{stats.DisplayName} starts with speed {stats.MoveSpeed}");
        }

        public void ApplyDamage(int damage)
        {
            currentHealth = Mathf.Max(0, currentHealth - damage);
        }
    }
}
