# Main game manager - autoload singleton
extends Node
class_name GameManager

# Preload scenes for spawning
var player_scene = preload("res://scenes/player.tscn")
var enemy_scene = preload("res://scenes/enemy.tscn")
var ui_scene = preload("res://scenes/ui/game_ui.tscn")

# Load config at runtime
var config: Dictionary = {}

var current_level: int = 0
var score: int = 0

signal score_changed(new_score: int)
signal level_changed(new_level: int)


func _ready():
	# Load configuration
	config = load_config()


func load_config() -> Dictionary:
	var file = FileAccess.open("user://config.json", FileAccess.READ)
	if file:
		return JSON.parse_string(file.get_as_text())
	return {}


func spawn_player(position: Vector2) -> Player:
	var player = player_scene.instantiate()
	player.global_position = position
	get_tree().current_scene.add_child(player)
	return player


func spawn_enemy(position: Vector2) -> Enemy:
	var enemy = enemy_scene.instantiate()
	enemy.global_position = position
	get_tree().current_scene.add_child(enemy)
	return enemy


func add_score(points: int) -> void:
	score += points
	score_changed.emit(score)


func next_level() -> void:
	current_level += 1
	level_changed.emit(current_level)
	# Load next level scene
	var level_path = "res://scenes/levels/level_%d.tscn" % current_level
	get_tree().change_scene_to_file(level_path)
