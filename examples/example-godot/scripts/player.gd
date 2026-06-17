class_name Player
extends CharacterBody2D

signal loadout_opened(loadout: PlayerLoadout)

const JUMP_VELOCITY := -400.0
const SPEED := 300.0

@export var health_component: HealthComponent

var loadout_preview_scene: PackedScene = preload("res://scenes/ui/loadout_preview.tscn")
var loadout_resource: PlayerLoadout = preload("res://resources/player_loadout.tres")
var utils = preload("res://scripts/utils/math_helpers.gd")

@onready var sprite: Sprite2D = %Sprite2D

func _ready() -> void:
	health_component.died.connect(_on_health_depleted)

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity += get_gravity() * delta

	if Input.is_action_just_pressed("ui_accept") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	var direction := Input.get_axis("ui_left", "ui_right")
	if direction:
		velocity.x = direction * SPEED
	else:
		velocity.x = move_toward(velocity.x, 0, SPEED)

	move_and_slide()

func open_loadout_preview() -> LoadoutPreview:
	var preview := loadout_preview_scene.instantiate() as LoadoutPreview
	preview.loadout = loadout_resource
	loadout_opened.emit(loadout_resource)
	return preview

func take_damage(amount: int) -> void:
	health_component.take_damage(amount)

func _on_health_depleted() -> void:
	queue_free()
