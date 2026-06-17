class_name Enemy
extends "res://scripts/base/entity.gd"

var math = preload("res://scripts/utils/math_helpers.gd")
var player_ref: Player
var state: StringName = &"chase"
var _can_attack: bool = true
var _attack_cooldown_remaining: float = 0.0

@export var patrol_speed: float = 80.0
@export var chase_speed: float = 135.0
@export var attack_damage: int = 10
@export var attack_range: float = 38.0
@export var attack_cooldown: float = 0.7

func set_player(player: Player) -> void:
	player_ref = player

func _physics_process(delta: float) -> void:
	_update_attack_cooldown(delta)

	if not is_on_floor():
		velocity += get_gravity() * delta

	if player_ref == null or not is_instance_valid(player_ref):
		velocity.x = move_toward(velocity.x, 0.0, patrol_speed)
		move_and_slide()
		return

	_chase_player(delta)
	move_and_slide()

func _patrol(_delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, patrol_speed)
	move_and_slide()

func _chase_player(_delta: float) -> void:
	var offset := player_ref.global_position - global_position
	var distance := absf(offset.x)
	var direction := signf(offset.x)

	if distance <= attack_range:
		velocity.x = move_toward(velocity.x, 0.0, chase_speed)
		_attack_player()
		return

	direction = MathHelpers.move_toward_angle(direction, direction, 0.0)
	velocity.x = direction * chase_speed

func _attack_player() -> void:
	if not _can_attack:
		return

	player_ref.take_damage(attack_damage)
	_start_attack_cooldown()

func _start_attack_cooldown() -> void:
	_can_attack = false
	_attack_cooldown_remaining = attack_cooldown

func _update_attack_cooldown(delta: float) -> void:
	if _can_attack:
		return

	_attack_cooldown_remaining -= delta
	if _attack_cooldown_remaining <= 0.0:
		_can_attack = true

func _on_detection_area_body_entered(body: Node) -> void:
	if body is Player:
		player_ref = body
		state = &"chase"
