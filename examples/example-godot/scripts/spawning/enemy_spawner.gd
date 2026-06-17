class_name EnemySpawner
extends Marker2D

signal enemy_spawned(enemy: Enemy)

@export var enemy_scene: PackedScene = preload("res://scenes/enemy.tscn")
@export var spawn_config: SpawnConfig = preload("res://resources/enemy_spawn_config.tres")
@export var spawn_parent: NodePath = ^".."
@export var player_path: NodePath = ^"../Player"
@export var spawn_interval: float = 2.5
@export var max_active_enemies: int = 3

var _active_enemy_refs: Array[WeakRef] = []
var _player: Player
@onready var _timer: Timer = %SpawnTimer

func _ready() -> void:
	if spawn_config:
		spawn_interval = spawn_config.spawn_interval
		max_active_enemies = spawn_config.max_active_enemies

	_player = get_node_or_null(player_path) as Player
	_spawn_enemy.call_deferred()
	_timer.wait_time = spawn_interval
	_timer.timeout.connect(_spawn_enemy)
	_timer.start()

func _spawn_enemy() -> void:
	_prune_inactive_enemies()
	if _active_enemy_refs.size() >= max_active_enemies:
		return

	var enemy := enemy_scene.instantiate() as Enemy
	enemy.global_position = global_position
	enemy.set_player(_player)

	var parent := get_node_or_null(spawn_parent)
	if parent == null:
		parent = get_tree().current_scene
	parent.add_child(enemy)

	_active_enemy_refs.append(weakref(enemy))
	enemy_spawned.emit(enemy)

func _exit_tree() -> void:
	if _timer and _timer.timeout.is_connected(_spawn_enemy):
		_timer.timeout.disconnect(_spawn_enemy)
	if _timer:
		_timer.stop()
	_active_enemy_refs.clear()

func _prune_inactive_enemies() -> void:
	var live_refs: Array[WeakRef] = []
	for enemy_ref in _active_enemy_refs:
		var enemy := enemy_ref.get_ref() as Enemy
		if enemy != null and enemy.is_inside_tree():
			live_refs.append(enemy_ref)

	_active_enemy_refs = live_refs
