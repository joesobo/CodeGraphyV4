import { clampChannel } from '../channels';

const CHANNEL_PATTERN = /^\d+$/;

export function parseRgbChannel(channel: string | undefined): number | null {
  const channelText = channel ?? '';
  if (!CHANNEL_PATTERN.test(channelText)) {
    return null;
  }

  return clampChannel(Number.parseInt(channelText, 10));
}
