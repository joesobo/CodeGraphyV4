import type { PathResolver } from './PathResolver';
import type { ParsedPythonImport } from './astParser';

/** Context shared across Python connection sources for a single file analysis. */
export interface PythonRuleContext {
  resolver: PathResolver;
  imports: ParsedPythonImport[];
}
