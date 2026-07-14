import {
  SYNTHETIC_FIXTURE_PRESETS,
  type SyntheticFixtureName,
} from '../fixture/presets';

export type BenchmarkRenderer = 'current' | 'webgpu';

export type BenchmarkPhysicsHome = 'auto' | 'main-thread';

export interface BenchmarkArguments {
  attribution: boolean;
  fixture: SyntheticFixtureName;
  renderer: BenchmarkRenderer;
  seed: number;
  runs: number;
  memoryCycles: number;
  idleMs: number;
  baselinePath?: string;
  outputPath: string;
  physicsHome: BenchmarkPhysicsHome;
  timeoutMs: number;
}

const DEFAULT_SEED = 307;
const DEFAULT_RUNS = 3;
const DEFAULT_MEMORY_CYCLES = 5;
const DEFAULT_IDLE_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 120_000;

function readValue(arguments_: readonly string[], index: number, option: string): string {
  const value = arguments_[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseInteger(value: string, option: string, minimum: number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`${option} must be an integer greater than or equal to ${minimum}`);
  }
  return parsed;
}

function isFixtureName(value: string): value is SyntheticFixtureName {
  return Object.hasOwn(SYNTHETIC_FIXTURE_PRESETS, value);
}

function isRenderer(value: string): value is BenchmarkRenderer {
  return value === 'current' || value === 'webgpu';
}

function parseBoolean(value: string, option: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${option} must be true or false`);
}

function isPhysicsHome(value: string): value is BenchmarkPhysicsHome {
  return value === 'auto' || value === 'main-thread';
}

export function parseBenchmarkArguments(arguments_: readonly string[]): BenchmarkArguments {
  let attribution = false;
  let fixture: SyntheticFixtureName | undefined;
  let renderer: BenchmarkRenderer | undefined;
  let seed = DEFAULT_SEED;
  let runs = DEFAULT_RUNS;
  let memoryCycles = DEFAULT_MEMORY_CYCLES;
  let idleMs = DEFAULT_IDLE_MS;
  let baselinePath: string | undefined;
  let outputPath: string | undefined;
  let physicsHome: BenchmarkPhysicsHome = 'auto';
  let timeoutMs = DEFAULT_TIMEOUT_MS;

  for (let index = 0; index < arguments_.length; index += 2) {
    const option = arguments_[index];
    const value = readValue(arguments_, index, option);

    switch (option) {
      case '--attribution':
        attribution = parseBoolean(value, option);
        break;
      case '--fixture':
        if (!isFixtureName(value)) throw new Error(`Unknown fixture: ${value}`);
        fixture = value;
        break;
      case '--renderer':
        if (!isRenderer(value)) throw new Error(`Unknown renderer: ${value}`);
        renderer = value;
        break;
      case '--seed':
        seed = parseInteger(value, option, 0);
        break;
      case '--runs':
        runs = parseInteger(value, option, 3);
        break;
      case '--memory-cycles':
        memoryCycles = parseInteger(value, option, 0);
        break;
      case '--idle-ms':
        idleMs = parseInteger(value, option, 1_000);
        break;
      case '--baseline':
        baselinePath = value;
        break;
      case '--output':
        outputPath = value;
        break;
      case '--physics-home':
        if (!isPhysicsHome(value)) throw new Error(`Unknown physics home: ${value}`);
        physicsHome = value;
        break;
      case '--timeout-ms':
        timeoutMs = parseInteger(value, option, 1);
        break;
      default:
        throw new Error(`Unknown graph benchmark option: ${option}`);
    }
  }

  if (!fixture) throw new Error('--fixture is required');
  if (!renderer) throw new Error('--renderer is required');

  return {
    attribution,
    fixture,
    renderer,
    seed,
    runs,
    memoryCycles,
    idleMs,
    baselinePath,
    outputPath: outputPath ?? `reports/benchmarks/graph/${fixture}-${renderer}.json`,
    physicsHome,
    timeoutMs,
  };
}
