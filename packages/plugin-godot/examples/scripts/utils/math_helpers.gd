# Math utility functions
class_name MathHelpers

static func lerp_angle(from: float, to: float, weight: float) -> float:
	return from + short_angle_dist(from, to) * weight


static func short_angle_dist(from: float, to: float) -> float:
	var diff = fmod(to - from, TAU)
	return fmod(2.0 * diff, TAU) - diff


static func move_toward_angle(from: float, to: float, delta: float) -> float:
	var diff = short_angle_dist(from, to)
	if abs(diff) <= delta:
		return to
	return from + sign(diff) * delta


static func random_point_in_circle(radius: float) -> Vector2:
	var angle = randf() * TAU
	var r = sqrt(randf()) * radius
	return Vector2(cos(angle) * r, sin(angle) * r)
