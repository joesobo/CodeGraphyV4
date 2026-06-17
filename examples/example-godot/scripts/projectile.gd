class_name Projectile
extends Area2D

signal hit_target(target: Node)

@export var damage: int = 25
@export var speed: float = 520.0
@export var lifetime: float = 1.5

var direction: Vector2 = Vector2.RIGHT
var owner_body: Node
var _age: float = 0.0

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _physics_process(delta: float) -> void:
	_age += delta
	if _age >= lifetime:
		queue_free()
		return

	global_position += direction * speed * delta

func launch(start_position: Vector2, travel_direction: Vector2, source: Node = null) -> void:
	global_position = start_position
	direction = travel_direction.normalized()
	owner_body = source
	rotation = direction.angle()

func _on_body_entered(body: Node) -> void:
	if body == owner_body:
		return

	if body.has_method("take_damage"):
		body.take_damage(damage)
		hit_target.emit(body)
	queue_free()
