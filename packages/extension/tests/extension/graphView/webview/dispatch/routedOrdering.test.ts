import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchGraphViewPrimaryRouteMessage } from '../../../../../src/extension/graphView/webview/dispatch/routed';

const routingMocks = vi.hoisted(() => ({
  applyCommandMessage: vi.fn(),
  applyExportMessage: vi.fn(),
  applyNodeFileMessage: vi.fn(),
  applyPhysicsMessage: vi.fn(),
  applySurfaceMessage: vi.fn(),
  applyTimelineMessage: vi.fn(),
  createGraphViewPrimaryExportHandlers: vi.fn(),
  createGraphViewPrimaryNodeFileHandlers: vi.fn(),
}));

vi.mock('../../../../../src/extension/graphView/webview/messages/commands/dispatch', () => ({
  applyCommandMessage: routingMocks.applyCommandMessage,
}));

vi.mock('../../../../../src/extension/graphView/webview/messages/exports', () => ({
  applyExportMessage: routingMocks.applyExportMessage,
}));

vi.mock('../../../../../src/extension/graphView/webview/nodeFile/router', () => ({
  applyNodeFileMessage: routingMocks.applyNodeFileMessage,
}));

vi.mock('../../../../../src/extension/graphView/webview/messages/physics', () => ({
  applyPhysicsMessage: routingMocks.applyPhysicsMessage,
}));

vi.mock('../../../../../src/extension/graphView/webview/messages/surface', () => ({
  applySurfaceMessage: routingMocks.applySurfaceMessage,
}));

vi.mock('../../../../../src/extension/graphView/webview/messages/timeline', () => ({
  applyTimelineMessage: routingMocks.applyTimelineMessage,
}));

vi.mock('../../../../../src/extension/graphView/webview/dispatch/exportHandlers', () => ({
  createGraphViewPrimaryExportHandlers: routingMocks.createGraphViewPrimaryExportHandlers,
}));

vi.mock('../../../../../src/extension/graphView/webview/dispatch/primaryState', () => ({
  createGraphViewPrimaryNodeFileHandlers: routingMocks.createGraphViewPrimaryNodeFileHandlers,
}));

describe('graph view primary routed dispatch ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routingMocks.createGraphViewPrimaryNodeFileHandlers.mockReturnValue({ node: 'handlers' });
    routingMocks.createGraphViewPrimaryExportHandlers.mockReturnValue({ export: 'handlers' });
    routingMocks.applyNodeFileMessage.mockResolvedValue(false);
    routingMocks.applyExportMessage.mockResolvedValue(false);
    routingMocks.applyCommandMessage.mockResolvedValue(false);
    routingMocks.applyTimelineMessage.mockResolvedValue(false);
    routingMocks.applyPhysicsMessage.mockResolvedValue(false);
    routingMocks.applySurfaceMessage.mockResolvedValue(false);
  });

  it('short-circuits when the node-file router handles the message', async () => {
    const context = { id: 'context' };
    const message = { type: 'NODE_SELECTED', payload: { nodeId: 'src/app.ts' } };
    routingMocks.applyNodeFileMessage.mockResolvedValue(true);

    await expect(dispatchGraphViewPrimaryRouteMessage(message as never, context as never)).resolves.toEqual({ handled: true });

    expect(routingMocks.createGraphViewPrimaryNodeFileHandlers).toHaveBeenCalledWith(context);
    expect(routingMocks.applyNodeFileMessage).toHaveBeenCalledWith(message, { node: 'handlers' });
    expect(routingMocks.applyExportMessage).not.toHaveBeenCalled();
    expect(routingMocks.applyCommandMessage).not.toHaveBeenCalled();
    expect(routingMocks.applyTimelineMessage).not.toHaveBeenCalled();
    expect(routingMocks.applyPhysicsMessage).not.toHaveBeenCalled();
    expect(routingMocks.applySurfaceMessage).not.toHaveBeenCalled();
  });

  it('continues through routers until a later handler claims the message', async () => {
    const context = { id: 'context' };
    const message = { type: 'DAG_MODE_UPDATED', payload: { enabled: true } };
    routingMocks.applyTimelineMessage.mockResolvedValue(true);

    await expect(dispatchGraphViewPrimaryRouteMessage(message as never, context as never)).resolves.toEqual({ handled: true });

    expect(routingMocks.createGraphViewPrimaryExportHandlers).toHaveBeenCalledWith(context);
    expect(routingMocks.applyNodeFileMessage).toHaveBeenCalledWith(message, { node: 'handlers' });
    expect(routingMocks.applyExportMessage).toHaveBeenCalledWith(message, { export: 'handlers' });
    expect(routingMocks.applyCommandMessage).toHaveBeenCalledWith(message, context);
    expect(routingMocks.applyTimelineMessage).toHaveBeenCalledWith(message, context);
    expect(routingMocks.applyPhysicsMessage).not.toHaveBeenCalled();
    expect(routingMocks.applySurfaceMessage).not.toHaveBeenCalled();
  });

  it('returns handled when the command router claims the message', async () => {
    const context = { id: 'context' };
    const message = { type: 'COMMAND', payload: { command: 'refresh' } };
    routingMocks.applyCommandMessage.mockResolvedValue(true);

    await expect(dispatchGraphViewPrimaryRouteMessage(message as never, context as never)).resolves.toEqual({ handled: true });

    expect(routingMocks.applyTimelineMessage).not.toHaveBeenCalled();
    expect(routingMocks.applyPhysicsMessage).not.toHaveBeenCalled();
    expect(routingMocks.applySurfaceMessage).not.toHaveBeenCalled();
  });

  it('returns handled when the physics router claims the message', async () => {
    const context = { id: 'context' };
    const message = { type: 'PHYSICS_UPDATED', payload: { enabled: true } };
    routingMocks.applyPhysicsMessage.mockResolvedValue(true);

    await expect(dispatchGraphViewPrimaryRouteMessage(message as never, context as never)).resolves.toEqual({ handled: true });

    expect(routingMocks.applySurfaceMessage).not.toHaveBeenCalled();
  });

  it('returns handled when the surface router claims the message', async () => {
    const context = { id: 'context' };
    const message = { type: 'SURFACE_MODE_UPDATED', payload: { mode: '2d' } };
    routingMocks.applySurfaceMessage.mockResolvedValue(true);

    await expect(dispatchGraphViewPrimaryRouteMessage(message as never, context as never)).resolves.toEqual({ handled: true });

    expect(routingMocks.applySurfaceMessage).toHaveBeenCalledWith(message);
  });

  it('returns unhandled only after every route declines the message', async () => {
    const context = { id: 'context' };
    const message = { type: 'UPDATE_LEGENDS', payload: { legends: [] } };

    await expect(dispatchGraphViewPrimaryRouteMessage(message as never, context as never)).resolves.toEqual({ handled: false });

    expect(routingMocks.applyNodeFileMessage).toHaveBeenCalledOnce();
    expect(routingMocks.applyExportMessage).toHaveBeenCalledOnce();
    expect(routingMocks.applyCommandMessage).toHaveBeenCalledOnce();
    expect(routingMocks.applyTimelineMessage).toHaveBeenCalledOnce();
    expect(routingMocks.applyPhysicsMessage).toHaveBeenCalledOnce();
    expect(routingMocks.applySurfaceMessage).toHaveBeenCalledWith(message);
  });
});
