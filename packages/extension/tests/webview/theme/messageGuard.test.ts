import { describe, expect, it } from 'vitest';
import { isThemeChangedMessage } from '../../../src/webview/theme/messageGuard';

describe('isThemeChangedMessage', () => {
  it('returns true for a valid light theme message', () => {
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: { kind: 'light' } })).toBe(true);
  });

  it('returns true for a valid dark theme message', () => {
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: { kind: 'dark' } })).toBe(true);
  });

  it('returns true for a valid high-contrast theme message', () => {
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: { kind: 'high-contrast' } })).toBe(true);
  });

  it('returns false when the type is not THEME_CHANGED', () => {
    expect(isThemeChangedMessage({ type: 'OTHER_MESSAGE', payload: { kind: 'dark' } })).toBe(false);
  });

  it('returns false when the kind is not a valid theme', () => {
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: { kind: 'sepia' } })).toBe(false);
  });

  it('returns false when data is null', () => {
    expect(isThemeChangedMessage(null)).toBe(false);
  });

  it('returns false when data is undefined', () => {
    expect(isThemeChangedMessage(undefined)).toBe(false);
  });

  it('returns false when data is a non-object primitive', () => {
    expect(isThemeChangedMessage(42)).toBe(false);
    expect(isThemeChangedMessage('string')).toBe(false);
    expect(isThemeChangedMessage(true)).toBe(false);
  });

  it('returns false when payload is missing', () => {
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED' })).toBe(false);
  });

  it('returns false when payload is null', () => {
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: null })).toBe(false);
  });

  it('returns false when payload kind is missing', () => {
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: {} })).toBe(false);
  });

  it('returns false when payload kind is a number', () => {
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: { kind: 1 } })).toBe(false);
  });

  it('returns false when type is not a string', () => {
    expect(isThemeChangedMessage({ type: 123, payload: { kind: 'dark' } })).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isThemeChangedMessage({})).toBe(false);
  });

  it('distinguishes valid kinds from close but invalid values', () => {
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: { kind: 'light' } })).toBe(true);
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: { kind: 'dark' } })).toBe(true);
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: { kind: 'high-contrast' } })).toBe(true);
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: { kind: 'Light' } })).toBe(false);
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: { kind: 'Dark' } })).toBe(false);
    expect(isThemeChangedMessage({ type: 'THEME_CHANGED', payload: { kind: 'HIGH-CONTRAST' } })).toBe(false);
  });
});
