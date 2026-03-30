/**
 * @fileoverview Public facade for the graph view provider.
 */

import * as vscode from 'vscode';
import { GraphViewProviderRuntime } from './graphView/provider/runtime';
import type { GraphViewProviderPublicMethods } from './graphView/provider/wiring/publicApi';

/**
 * Exposes the host runtime through the public API used by commands, tests,
 * and VS Code registration.
 */
/* eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging */
export class GraphViewProvider
  extends GraphViewProviderRuntime
  implements vscode.WebviewViewProvider
{
  public static readonly viewType = 'codegraphy.graphView';
}

// The public methods are assigned during runtime bootstrap, so the instance
// type is widened separately from the class body.
/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging */
export interface GraphViewProvider extends GraphViewProviderPublicMethods {}
/* eslint-enable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging */
