class_name Player
extends "res://scripts/base/entity.gd"

signal fired(projectile: Projectile)

const JUMP_VELOCITY := -400.0
const SPEED := 300.0
const SPRINT_MULTIPLIER := 1.55

@export var projectile_scene: PackedScene = preload("res://scenes/projectile.tscn")
@export var projectile_parent: NodePath = ^".."
@export var fire_cooldown: float = 0.25

var utils = preload("res://scripts/utils/math_helpers.gd")

var _can_fire: bool = true
var _facing_direction: float = 1.0
var _fire_cooldown_remaining: float = 0.0

@onready var _muzzle: Marker2D = %Muzzle
@onready var sprite: Sprite2D = %Sprite2D

func _ready() -> void:
	super._ready()

func _physics_process(delta: float) -> void:
	_update_fire_cooldown(delta)

	if not is_on_floor():
		velocity += get_gravity() * delta

	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	var direction := Input.get_axis("move_left", "move_right")
	var speed := SPEED * SPRINT_MULTIPLIER if Input.is_action_pressed("sprint") else SPEED
	if direction:
		_facing_direction = signf(direction)
		velocity.x = direction * speed
	else:
		velocity.x = move_toward(velocity.x, 0, SPEED)

	move_and_slide()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("shoot"):
		shoot_at(get_global_mouse_position())

func shoot() -> void:
	shoot_at(_muzzle.global_position + Vector2(_facing_direction, 0.0))

func shoot_at(target_position: Vector2) -> void:
	if not _can_fire:
		return

	var direction := target_position - _muzzle.global_position
	if direction == Vector2.ZERO:
		direction = Vector2(_facing_direction, 0.0)
	_facing_direction = signf(direction.x) if direction.x != 0.0 else _facing_direction

	var projectile := projectile_scene.instantiate() as Projectile
	var parent := get_node_or_null(projectile_parent)
	if parent == null:
		parent = get_tree().current_scene
	parent.add_child(projectile)
	projectile.launch(_muzzle.global_position, direction, self)
	fired.emit(projectile)
	_start_fire_cooldown()

func _start_fire_cooldown() -> void:
	_can_fire = false
	_fire_cooldown_remaining = fire_cooldown

func _update_fire_cooldown(delta: float) -> void:
	if _can_fire:
		return

	_fire_cooldown_remaining -= delta
	if _fire_cooldown_remaining <= 0.0:
		_can_fire = true
