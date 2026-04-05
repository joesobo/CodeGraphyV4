# Base entity class for all game entities
extends CharacterBody2D
class_name Entity

@export var max_health: int = 100
var health: int = max_health

signal health_changed(new_health: int)
signal died()


func take_damage(amount: int) -> void:
	health = max(0, health - amount)
	health_changed.emit(health)
	
	if health <= 0:
		die()


func heal(amount: int) -> void:
	health = min(max_health, health + amount)
	health_changed.emit(health)


func die() -> void:
	died.emit()
	queue_free()
