export function renderChevron(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	scale: number,
	collapsed: boolean,
	color: string,
): void {
	const size = 7 * scale;

	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = Math.max(1.25 * scale, 0.5);
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	if (collapsed) {
		ctx.moveTo(x - size * 0.5, y + size * 0.25);
		ctx.lineTo(x, y - size * 0.35);
		ctx.lineTo(x + size * 0.5, y + size * 0.25);
	} else {
		ctx.moveTo(x - size * 0.5, y - size * 0.25);
		ctx.lineTo(x, y + size * 0.35);
		ctx.lineTo(x + size * 0.5, y - size * 0.25);
	}
	ctx.stroke();
	ctx.restore();
}
