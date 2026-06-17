using UnityEngine;
using UnityEngine.Events;

namespace CodeGraphy.UnityExample.UI
{
    public sealed class StartButton : MonoBehaviour
    {
        [SerializeField] private GameManager gameManager;
        [SerializeField] private UnityEvent onClicked;

        public void OnStartClicked()
        {
            gameManager.StartGame();
            onClicked.Invoke();
        }
    }
}
