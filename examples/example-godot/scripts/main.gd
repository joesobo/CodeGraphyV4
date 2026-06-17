class_name Main
extends Node2D

@onready var _player: Player = %Player
@onready var _enemy: Enemy = %Enemy
@onready var _enemy_spawner: Node = %EnemySpawner

func _ready() -> void:
	_enemy_spawner.enemy_spawned.connect(_wire_enemy)
	_wire_enemy(_enemy)

func _wire_enemy(enemy: Enemy) -> void:
	enemy.set_player(_player)
