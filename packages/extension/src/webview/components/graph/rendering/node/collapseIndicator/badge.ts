import type { FGNode } from '../../../model/build';

export function renderCountBadge(
	ctx: CanvasRenderingContext2D,
	node: FGNode,
	label: string,
	scale: number,
	textColor: string,
): void {
	const x = node.x! + node.size * 0.55;
	const y = node.y! + node.size * 0.55;
	const radius = Math.max(6 * scale, 4);

	ctx.save();
	ctx.fillStyle = node.borderColor || node.color;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = textColor;
	ctx.font = `${Math.max(8 * scale, 5)}px Sans-Serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(label, x, y);
	ctx.restore();
}
