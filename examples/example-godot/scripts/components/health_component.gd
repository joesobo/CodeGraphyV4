class_name HealthComponent
extends Node

signal health_changed(current: int, maximum: int)
signal died

@export var max_health: int = 100
@export var invincibility_time: float = 0.2

var current_health: int = 0
var _invincible: bool = false

func _ready() -> void:
	current_health = max_health
	health_changed.emit(current_health, max_health)

func take_damage(amount: int) -> void:
	if _invincible or current_health <= 0:
		return

	current_health = max(0, current_health - amount)
	health_changed.emit(current_health, max_health)

	if current_health <= 0:
		died.emit()
	elif invincibility_time > 0.0:
		_start_invincibility()

func heal(amount: int) -> void:
	current_health = min(max_health, current_health + amount)
	health_changed.emit(current_health, max_health)

func _start_invincibility() -> void:
	_invincible = true
	await get_tree().create_timer(invincibility_time).timeout
	_invincible = false
