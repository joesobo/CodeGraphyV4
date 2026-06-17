using CodeGraphy.UnityExample.Data;
using UnityEngine;

namespace CodeGraphy.UnityExample
{
    public sealed class GameManager : MonoBehaviour
    {
        [SerializeField] private PlayerController player;
        [SerializeField] private PlayerStats defaultStats;

        private bool hasStarted;

        private void Awake()
        {
            if (player != null && defaultStats != null)
            {
                player.Initialize(defaultStats);
            }
        }

        public void StartGame()
        {
            hasStarted = true;
            player.BeginRun();
        }

        public bool HasStarted => hasStarted;
    }
}
