# Enemy AI script
extends CharacterBody2D
class_name Enemy

# Extends from a base class
extends "res://scripts/base/entity.gd"

var player_ref: Player  # Reference to class_name

# Shared utilities
var math = preload("res://scripts/utils/math_helpers.gd")

@export var patrol_speed: float = 100.0
@export var chase_speed: float = 200.0

var state: String = "patrol"


func _physics_process(delta):
	match state:
		"patrol":
			patrol(delta)
		"chase":
			chase_player(delta)


func patrol(delta):
	# Simple patrol logic
	velocity.x = patrol_speed
	move_and_slide()


func chase_player(delta):
	if player_ref:
		var direction = (player_ref.global_position - global_position).normalized()
		velocity = direction * chase_speed
		move_and_slide()


func _on_detection_area_body_entered(body):
	if body is Player:
		player_ref = body
		state = "chase"
