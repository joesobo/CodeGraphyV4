import {
  DEFAULT_SYNTHETIC_FIXTURE_SEED,
  isSyntheticFixtureName,
  type SyntheticFixtureName,
} from '../fixture/presets';

export type BenchmarkRenderer = 'current' | 'webgpu';

export interface BenchmarkArguments {
  attribution: boolean;
  fixture: SyntheticFixtureName;
  headless: boolean;
  renderer: BenchmarkRenderer;
  seed: number;
  runs: number;
  memoryCycles: number;
  idleMs: number;
  baselinePath?: string;
  outputPath: string;
  timeoutMs: number;
}

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

function isRenderer(value: string): value is BenchmarkRenderer {
  return value === 'current' || value === 'webgpu';
}

function parseBoolean(value: string, option: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${option} must be true or false`);
}

export function parseBenchmarkArguments(arguments_: readonly string[]): BenchmarkArguments {
  let attribution = false;
  let fixture: SyntheticFixtureName | undefined;
  let headless = true;
  let renderer: BenchmarkRenderer | undefined;
  let seed = DEFAULT_SYNTHETIC_FIXTURE_SEED;
  let runs = DEFAULT_RUNS;
  let memoryCycles = DEFAULT_MEMORY_CYCLES;
  let idleMs = DEFAULT_IDLE_MS;
  let baselinePath: string | undefined;
  let outputPath: string | undefined;
  let timeoutMs = DEFAULT_TIMEOUT_MS;

  for (let index = 0; index < arguments_.length; index += 2) {
    const option = arguments_[index];
    const value = readValue(arguments_, index, option);

    switch (option) {
      case '--attribution':
        attribution = parseBoolean(value, option);
        break;
      case '--fixture':
        if (!isSyntheticFixtureName(value)) throw new Error(`Unknown fixture: ${value}`);
        fixture = value;
        break;
      case '--headless':
        headless = parseBoolean(value, option);
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
    headless,
    renderer,
    seed,
    runs,
    memoryCycles,
    idleMs,
    baselinePath,
    outputPath: outputPath ?? `reports/benchmarks/graph/${fixture}-${renderer}.json`,
    timeoutMs,
  };
}
