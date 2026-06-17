class_name GameUI
extends CanvasLayer

signal loadout_toggled

@onready var loadout_anchor: LoadoutPreview = %LoadoutAnchor

func show_loadout(loadout: PlayerLoadout) -> void:
	loadout_anchor.loadout = loadout
	loadout_anchor.visible = true
	loadout_toggled.emit()

func hide_loadout() -> void:
	loadout_anchor.visible = false
	loadout_toggled.emit()
