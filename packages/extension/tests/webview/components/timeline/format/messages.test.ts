import { describe, expect, it } from 'vitest';
import {
  getMessageBody,
  getMessageTitle,
  truncateMessage,
} from '../../../../../src/webview/components/timeline/format/messages';

describe('timeline/messages', () => {
  it('returns the first line as the message title', () => {
    expect(getMessageTitle('Title line\n\nBody line')).toBe('Title line');
  });

  it('returns the remaining lines as the message body', () => {
    expect(getMessageBody('Title line\n\nBody line')).toBe('Body line');
  });

  it('returns multiline bodies without the title line', () => {
    expect(getMessageBody('Title line\nBody line 1\nBody line 2')).toBe('Body line 1\nBody line 2');
  });

  it('returns the full message when it is shorter than the max length', () => {
    expect(truncateMessage('short message', 20)).toBe('short message');
  });

  it('returns the full message when it matches the max length exactly', () => {
    expect(truncateMessage('12345', 5)).toBe('12345');
  });

  it('truncates long messages and appends an ellipsis', () => {
    expect(truncateMessage('abcdefghij', 8)).toBe('abcde...');
  });

  it('uses the default maximum length when one is not provided', () => {
    const longMessage = 'x'.repeat(51);

    expect(truncateMessage(longMessage)).toBe(`${'x'.repeat(47)}...`);
  });
});
