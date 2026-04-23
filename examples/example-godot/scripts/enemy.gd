class_name Enemy
extends "res://scripts/base/entity.gd"

var math = preload("res://scripts/utils/math_helpers.gd")
var player_ref: Player
var state: StringName = &"patrol"
var patrol_direction: float = 1.0

@export var patrol_speed: float = 100.0
@export var chase_speed: float = 200.0

func _physics_process(delta: float) -> void:
	match state:
		&"patrol":
			_patrol(delta)
		&"chase":
			_chase_player(delta)

func _patrol(_delta: float) -> void:
	velocity.x = patrol_speed * patrol_direction
	move_and_slide()

func _chase_player(_delta: float) -> void:
	if player_ref:
		var direction = (player_ref.global_position - global_position).normalized()
		velocity = direction * chase_speed
		move_and_slide()

func _on_detection_area_body_entered(body: Node) -> void:
	if body is Player:
		player_ref = body
		state = &"chase"
