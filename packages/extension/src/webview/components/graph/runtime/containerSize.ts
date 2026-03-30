import {
	useEffect,
	useState,
	type MutableRefObject,
} from 'react';
import type { GraphContainerSize } from '../rendering/surface/sharedProps';

export function useContainerSize(
	containerRef: MutableRefObject<HTMLDivElement | null>,
): GraphContainerSize {
	const [containerSize, setContainerSize] = useState<GraphContainerSize>({ width: 0, height: 0 });

	useEffect(() => {
		const element = containerRef.current;
		if (!element) return;

		const resizeObserver = new ResizeObserver(entries => {
			const entry = entries[0];
			if (entry) {
				setContainerSize({
					width: entry.contentRect.width,
					height: entry.contentRect.height,
				});
			}
		});

		resizeObserver.observe(element);
		setContainerSize({ width: element.clientWidth, height: element.clientHeight });

		return () => resizeObserver.disconnect();
	}, [containerRef]);

	return containerSize;
}
