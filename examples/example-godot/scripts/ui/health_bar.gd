class_name HealthBar
extends ProgressBar

func bind(health: HealthComponent) -> void:
	health.health_changed.connect(set_health)
	set_health(health.current_health, health.max_health)

func set_health(current: int, maximum: int) -> void:
	max_value = maximum
	value = current
