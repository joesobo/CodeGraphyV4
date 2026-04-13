# Player controller script
extends CharacterBody2D
class_name Player

const SPEED = 300.0
const JUMP_VELOCITY = -400.0

# Preload commonly used resources
var health_bar_scene = preload("res://scenes/ui/health_bar.tscn")
var death_effect = preload("res://effects/death_particles.tres")

# Use utilities
var utils = preload("res://scripts/utils/math_helpers.gd")

func _ready():
	# Load audio dynamically at runtime
	var jump_sound = load("res://audio/jump.wav")


func _physics_process(delta):
	# Add gravity
	if not is_on_floor():
		velocity += get_gravity() * delta

	# Handle jump
	if Input.is_action_just_pressed("ui_accept") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	# Handle movement
	var direction = Input.get_axis("ui_left", "ui_right")
	if direction:
		velocity.x = direction * SPEED
	else:
		velocity.x = move_toward(velocity.x, 0, SPEED)

	move_and_slide()


func take_damage(amount: int):
	health -= amount
	if health <= 0:
		die()
