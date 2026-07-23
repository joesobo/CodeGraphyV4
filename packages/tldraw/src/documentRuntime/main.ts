import { prepareGraphPhysicsFromBytes } from '@codegraphy-dev/graph-renderer';
import { startPhysicsRuntime, type PhysicsScriptContext } from './physics/runtime';
import { applyCodeGraphyTheme } from './theme/model';

const PHYSICS_WASM_BASE64 = 'Q09ERUdSQVBIWV9QSFlTSUNTX1dBU00=';

function decodePhysicsBytes(): Uint8Array<ArrayBuffer> {
  const binary = atob(PHYSICS_WASM_BASE64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export default async function runCodeGraphyPhysics(context: PhysicsScriptContext): Promise<void> {
  applyCodeGraphyTheme(context.editor);
  await prepareGraphPhysicsFromBytes(decodePhysicsBytes());
  startPhysicsRuntime(context);
}
