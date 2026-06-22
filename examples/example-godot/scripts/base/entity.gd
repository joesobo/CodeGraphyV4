class_name Entity
extends CharacterBody2D

@export var health_component: NodePath = ^"HealthComponent"
@export var health_bar: NodePath = ^"HealthBar"

var _health_component: HealthComponent
var _health_bar: Node

func _ready() -> void:
	_health_component = get_node_or_null(health_component) as HealthComponent
	if _health_component:
		_health_component.died.connect(_on_health_depleted)
		_health_bar = get_node_or_null(health_bar)
		if _health_bar and _health_bar.has_method("bind"):
			_health_bar.bind(_health_component)

func get_health_component() -> HealthComponent:
	return _health_component

func take_damage(amount: int) -> void:
	if _health_component:
		_health_component.take_damage(amount)

func _on_health_depleted() -> void:
	queue_free()
