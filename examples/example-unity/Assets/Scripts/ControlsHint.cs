using UnityEngine;

public sealed class ControlsHint : MonoBehaviour {
	private const string ControlsText = "A / D or Arrows  Move\nShift  Sprint\nSpace  Jump\nClick  Shoot";

	private GUIStyle style;
	private bool visible = true;

	public void ToggleControlsHint() {
		visible = !visible;
	}

	private void OnGUI() {
		if (!visible) {
			return;
		}

		style ??= new(GUI.skin.label) {
			fontSize = 14,
			padding = new(12, 12, 10, 10)
		};
		style.normal.textColor = new(1f, 1f, 1f, 0.72f);

		var previousColor = GUI.color;
		GUI.color = new(0f, 0f, 0f, 0.28f);
		GUI.Box(new(16, 18, 190, 96), GUIContent.none);
		GUI.color = previousColor;
		GUI.Label(new(24, 24, 180, 88), ControlsText, style);
	}
}
