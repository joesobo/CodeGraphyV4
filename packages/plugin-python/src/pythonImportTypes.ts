export type ParsedPythonImport =
  | {
      kind: 'import';
      module: string;
      line: number;
    }
  | {
      kind: 'from';
      module: string;
      names: string[];
      level: number;
      line: number;
    };
