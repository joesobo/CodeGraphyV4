import { beforeEach, describe, expect, it } from 'vitest';
import { createGraphStore } from '../../../../../src/webview/store/state';
import { clearSentMessages, findMessage } from '../../../../helpers/sentMessages';

describe('GraphStore actions',()=>{
  let store: ReturnType<typeof createGraphStore>;
  beforeEach(()=>{ store=createGraphStore(); clearSentMessages(); });

  it('setSearchQuery updates search query', () => {
      store.getState().setSearchQuery('test');
      expect(store.getState().searchQuery).toBe('test');
    });

  it('setActivePanel updates active panel', () => {
      store.getState().setActivePanel('settings');
      expect(store.getState().activePanel).toBe('settings');
    });

  it('TOGGLE_DEPTH_MODE enables depth mode when an index exists', () => {
      store.getState().handleExtensionMessage({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: {
          hasIndex: true,
          freshness: 'fresh',
          detail: 'CodeGraphy index is fresh.',
        },
      });
      store.getState().handleExtensionMessage({ type: 'TOGGLE_DEPTH_MODE' });
      const msg = findMessage('UPDATE_DEPTH_MODE');
      expect(msg).toBeTruthy();
      expect(msg!.payload.depthMode).toBe(true);
    });

  it('TOGGLE_DEPTH_MODE returns to the main graph when depth mode is already active', () => {
      store.getState().handleExtensionMessage({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: {
          hasIndex: true,
          freshness: 'fresh',
          detail: 'CodeGraphy index is fresh.',
        },
      });
      store.getState().handleExtensionMessage({
        type: 'DEPTH_MODE_UPDATED',
        payload: { depthMode: true },
      });
      store.getState().handleExtensionMessage({ type: 'TOGGLE_DEPTH_MODE' });
      const msg = findMessage('UPDATE_DEPTH_MODE');
      expect(msg).toBeTruthy();
      expect(msg!.payload.depthMode).toBe(false);
    });

  it('TOGGLE_DEPTH_MODE is a no-op before the repo has been indexed', () => {
      store.getState().handleExtensionMessage({ type: 'TOGGLE_DEPTH_MODE' });
      expect(findMessage('UPDATE_DEPTH_MODE')).toBeUndefined();
    });
});
