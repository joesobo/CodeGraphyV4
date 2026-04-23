class_name LoadoutPreview
extends Control

@export var loadout: PlayerLoadout

@onready var _card_texture: TextureRect = %CardTexture
@onready var _summary_label: Label = %SummaryLabel
@onready var _title_label: Label = %TitleLabel

func _ready() -> void:
	_refresh()

func set_loadout(value: PlayerLoadout) -> void:
	loadout = value
	if is_inside_tree():
		_refresh()

func _refresh() -> void:
	if loadout == null:
		_title_label.text = "Loadout Preview"
		_summary_label.text = "Assign a PlayerLoadout resource to preview it here."
		_card_texture.texture = null
		return

	_title_label.text = loadout.display_name
	_summary_label.text = loadout.summary
	_card_texture.texture = loadout.preview_texture
