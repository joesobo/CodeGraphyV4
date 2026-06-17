class_name GameUI
extends CanvasLayer

@onready var _controls_label: Label = %ControlsLabel

func _ready() -> void:
	_controls_label.text = "WASD move  |  Shift sprint\nSpace jump  |  Click shoot"
