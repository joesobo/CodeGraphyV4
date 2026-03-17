import {
	useEffect,
	type MutableRefObject,
} from 'react';
import SpriteText from 'three-spritetext';
import { setSpriteVisible } from '../../graphSupport/types';

interface UseLabelVisibilityOptions {
	showLabels: boolean;
	spritesRef: MutableRefObject<Map<string, SpriteText>>;
}

export function useLabelVisibility({
	showLabels,
	spritesRef,
}: UseLabelVisibilityOptions): void {
	useEffect(() => {
		for (const sprite of spritesRef.current.values()) {
			setSpriteVisible(sprite, showLabels);
		}
	}, [showLabels, spritesRef]);
}
