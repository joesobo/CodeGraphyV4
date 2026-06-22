using UnityEngine;
using UnityEngine.Events;

public sealed class EventDemoButton : MonoBehaviour {
	[SerializeField] private UnityEvent onClicked;

	private GUIStyle style;

	private void OnGUI() {
		style ??= new(GUI.skin.button) {
			fontSize = 12,
			padding = new(10, 10, 6, 6)
		};

		if (GUI.Button(new(16, 124, 190, 32), "Toggle controls", style)) {
			onClicked.Invoke();
		}
	}
}
