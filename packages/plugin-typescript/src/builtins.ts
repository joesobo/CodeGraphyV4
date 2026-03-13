const BUILTIN_MODULES = new Set([
  'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'util',
  'stream', 'events', 'buffer', 'child_process', 'cluster',
  'dns', 'net', 'readline', 'tls', 'dgram', 'assert', 'zlib',
  'querystring', 'string_decoder', 'timers', 'tty', 'v8', 'vm',
  'worker_threads', 'perf_hooks', 'async_hooks', 'inspector',
]);

export function isBuiltIn(specifier: string): boolean {
  const base = specifier.startsWith('node:')
    ? specifier.slice(5)
    : specifier;

  return BUILTIN_MODULES.has(base.split('/')[0]);
}

export function isBareSpecifier(specifier: string): boolean {
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    return false;
  }
  return /^(@[\w-]+\/)?[\w-]/.test(specifier);
}
