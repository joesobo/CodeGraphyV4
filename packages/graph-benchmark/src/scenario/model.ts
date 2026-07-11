import {
  SYNTHETIC_FIXTURE_PRESETS,
  type SyntheticFixtureName,
} from '../fixture/presets';

interface TimedAction {
  atTick: number;
}

export type FeelScenarioAction = TimedAction & (
  | { type: 'load' }
  | { type: 'pointer-down'; nodeId?: string; x?: number; y?: number }
  | { type: 'pointer-move'; x: number; y: number }
  | { type: 'pointer-up' }
  | {
    type: 'set-force';
    force: 'repel' | 'center' | 'linkDistance' | 'linkStrength';
    value: number;
  }
  | { type: 'set-filter'; visibleFraction: number; seed: number }
  | { type: 'pin'; nodeIds: string[] }
  | { type: 'unpin'; nodeIds: string[] }
);

export interface FeelScenario {
  schemaVersion: 1;
  id: string;
  fixture: {
    name: SyntheticFixtureName;
    seed: number;
  };
  durationTicks: number;
  actions: FeelScenarioAction[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function integer(value: unknown, label: string, minimum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new Error(`${label} must be an integer greater than or equal to ${minimum}`);
  }
  return value as number;
}

function number(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((entry, index) => string(entry, `${label}[${index}]`));
}

function optionalNumber(value: unknown, label: string): number | undefined {
  return value === undefined ? undefined : number(value, label);
}

function parseAction(value: unknown, index: number): FeelScenarioAction {
  const action = record(value, `actions[${index}]`);
  const atTick = integer(action.atTick, `actions[${index}].atTick`, 0);
  const type = string(action.type, `actions[${index}].type`);

  switch (type) {
    case 'load':
    case 'pointer-up':
      return { atTick, type };
    case 'pointer-down':
      return {
        atTick,
        type,
        ...(action.nodeId === undefined ? {} : {
          nodeId: string(action.nodeId, `actions[${index}].nodeId`),
        }),
        ...(action.x === undefined ? {} : { x: optionalNumber(action.x, `actions[${index}].x`) }),
        ...(action.y === undefined ? {} : { y: optionalNumber(action.y, `actions[${index}].y`) }),
      };
    case 'pointer-move':
      return {
        atTick,
        type,
        x: number(action.x, `actions[${index}].x`),
        y: number(action.y, `actions[${index}].y`),
      };
    case 'set-force': {
      const force = string(action.force, `actions[${index}].force`);
      if (!['repel', 'center', 'linkDistance', 'linkStrength'].includes(force)) {
        throw new Error(`actions[${index}].force is not supported`);
      }
      return {
        atTick,
        type,
        force: force as Extract<FeelScenarioAction, { type: 'set-force' }>['force'],
        value: number(action.value, `actions[${index}].value`),
      };
    }
    case 'set-filter':
      return {
        atTick,
        type,
        visibleFraction: number(action.visibleFraction, `actions[${index}].visibleFraction`),
        seed: integer(action.seed, `actions[${index}].seed`, 0),
      };
    case 'pin':
    case 'unpin':
      return {
        atTick,
        type,
        nodeIds: stringArray(action.nodeIds, `actions[${index}].nodeIds`),
      };
    default:
      throw new Error(`actions[${index}].type is not supported: ${type}`);
  }
}

export function parseFeelScenario(value: unknown): FeelScenario {
  const scenario = record(value, 'scenario');
  if (scenario.schemaVersion !== 1) throw new Error('scenario.schemaVersion must be 1');
  const fixture = record(scenario.fixture, 'scenario.fixture');
  const fixtureName = string(fixture.name, 'scenario.fixture.name');
  if (!Object.hasOwn(SYNTHETIC_FIXTURE_PRESETS, fixtureName)) {
    throw new Error(`Unknown scenario fixture: ${fixtureName}`);
  }
  if (!Array.isArray(scenario.actions)) throw new Error('scenario.actions must be an array');
  const actions = scenario.actions.map(parseAction);
  if (actions.some((action, index) => index > 0 && action.atTick < actions[index - 1].atTick)) {
    throw new Error('scenario.actions must be ordered by atTick');
  }

  return {
    schemaVersion: 1,
    id: string(scenario.id, 'scenario.id'),
    fixture: {
      name: fixtureName as SyntheticFixtureName,
      seed: integer(fixture.seed, 'scenario.fixture.seed', 0),
    },
    durationTicks: integer(scenario.durationTicks, 'scenario.durationTicks', 1),
    actions,
  };
}
