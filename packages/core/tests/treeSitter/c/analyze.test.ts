import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-c-'));
  tempRoots.push(workspaceRoot);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf8');
  }

  return workspaceRoot;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((workspaceRoot) =>
      fs.rm(workspaceRoot, { recursive: true, force: true }),
    ),
  );
});

describe('pipeline/plugins/treesitter/runtime/analyzeC', () => {
  it('extracts C include relationships and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'src/math/add.h': [
        '#pragma once',
        'int add(int left, int right);',
        '',
      ].join('\n'),
    });
    const mainPath = path.join(workspaceRoot, 'src/main.c');
    const source = [
      '#include "math/add.h"',
      '#include <stdio.h>',
      '',
      'typedef struct Counter {',
      '  int value;',
      '} Counter;',
      '',
      'typedef union Payload {',
      '  int code;',
      '  const char *text;',
      '} Payload;',
      '',
      'enum Mode {',
      '  MODE_FAST',
      '};',
      '',
      'static int global_limit = 32;',
      '',
      'void prepare(void);',
      '',
      'static int helper(void) {',
      '  return add(1, 2);',
      '}',
      '',
      'int main(void) {',
      '  return helper();',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(mainPath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'include',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:include',
        type: 'include',
        specifier: 'math/add.h',
        fromFilePath: mainPath,
        resolvedPath: path.join(workspaceRoot, 'src/math/add.h'),
        toFilePath: path.join(workspaceRoot, 'src/math/add.h'),
      }),
      expect.objectContaining({
        kind: 'include',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:include',
        type: 'include',
        specifier: 'stdio.h',
        fromFilePath: mainPath,
        resolvedPath: null,
        toFilePath: null,
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: mainPath, kind: 'include', name: 'math/add.h' }),
      expect.objectContaining({ filePath: mainPath, kind: 'include', name: 'stdio.h' }),
      expect.objectContaining({ filePath: mainPath, kind: 'struct', name: 'Counter' }),
      expect.objectContaining({ filePath: mainPath, kind: 'union', name: 'Payload' }),
      expect.objectContaining({ filePath: mainPath, kind: 'enum', name: 'Mode' }),
      expect.objectContaining({ filePath: mainPath, kind: 'typedef', name: 'Counter' }),
      expect.objectContaining({ filePath: mainPath, kind: 'typedef', name: 'Payload' }),
      expect.objectContaining({ filePath: mainPath, kind: 'global', name: 'global_limit' }),
      expect.objectContaining({ filePath: mainPath, kind: 'prototype', name: 'prepare' }),
      expect.objectContaining({ filePath: mainPath, kind: 'function', name: 'helper' }),
      expect.objectContaining({ filePath: mainPath, kind: 'function', name: 'main' }),
    ]));
  });

  it('extracts C calls to included declarations', async () => {
    const workspaceRoot = await createWorkspace({
      'src/math/add.h': [
        '#pragma once',
        'int add(int left, int right);',
        '',
      ].join('\n'),
    });
    const mainPath = path.join(workspaceRoot, 'src/main.c');
    const source = [
      '#include "math/add.h"',
      '',
      'int main(void) {',
      '  return add(1, 2);',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(mainPath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'add',
        fromFilePath: mainPath,
        fromSymbolId: `${mainPath}:function:main`,
        toSymbolId: `${path.join(workspaceRoot, 'src/math/add.h')}:prototype:add`,
        resolvedPath: path.join(workspaceRoot, 'src/math/add.h'),
        toFilePath: path.join(workspaceRoot, 'src/math/add.h'),
      }),
    ]));
  });

  it('extracts tiny logger include and call relationships from Tree-sitter C analysis', async () => {
    const workspaceRoot = await createWorkspace({
      'src/logger/logger.h': [
        '#pragma once',
        '',
        'typedef enum LogLevel {',
        '  LOG_LEVEL_INFO,',
        '  LOG_LEVEL_WARN,',
        '  LOG_LEVEL_ERROR',
        '} LogLevel;',
        '',
        'typedef struct Logger {',
        '  LogLevel level;',
        '  int message_count;',
        '} Logger;',
        '',
        'extern int logger_default_capacity;',
        '',
        'void logger_init(Logger *logger, LogLevel level);',
        'void logger_write(Logger *logger, LogLevel level, const char *message);',
        'void logger_flush(Logger *logger);',
        '',
      ].join('\n'),
      'src/logger/format.h': [
        '#pragma once',
        '',
        '#include "logger.h"',
        '',
        'typedef union LogMessage {',
        '  const char *text;',
        '  int code;',
        '} LogMessage;',
        '',
        'typedef struct LogRecord {',
        '  LogLevel level;',
        '  LogMessage message;',
        '} LogRecord;',
        '',
        'const char *logger_level_name(LogLevel level);',
        'void logger_format_line(const LogRecord *record, char *buffer, int buffer_size);',
        '',
      ].join('\n'),
    });
    const headerPath = path.join(workspaceRoot, 'src/logger/logger.h');
    const mainPath = path.join(workspaceRoot, 'src/main.c');
    const source = [
      '#include "logger/logger.h"',
      '',
      'int main(void) {',
      '  Logger logger;',
      '  logger_init(&logger, LOG_LEVEL_INFO);',
      '  logger_write(&logger, LOG_LEVEL_INFO, "boot complete");',
      '  logger_flush(&logger);',
      '  return 0;',
      '}',
      '',
    ].join('\n');
    const loggerPath = path.join(workspaceRoot, 'src/logger/logger.c');
    const loggerSource = [
      '#include "logger.h"',
      '#include "format.h"',
      '',
      'static int logger_output_enabled = 1;',
      '',
      'static int logger_accepts(Logger *logger, LogLevel level) {',
      '  return logger_output_enabled && level >= logger->level;',
      '}',
      '',
      'void logger_init(Logger *logger, LogLevel level) {',
      '  logger->level = level;',
      '  logger->message_count = 0;',
      '}',
      '',
      'void logger_write(Logger *logger, LogLevel level, const char *message) {',
      '  if (!logger_accepts(logger, level)) {',
      '    return;',
      '  }',
      '  char line[128];',
      '  LogRecord record = { level, { .text = message } };',
      '  logger_format_line(&record, line, sizeof line);',
      '  logger->message_count += 1;',
      '}',
      '',
      'void logger_flush(Logger *logger) {',
      '  logger->message_count = 0;',
      '}',
      '',
    ].join('\n');

    const headerResult = await analyzeFileWithTreeSitter(
      headerPath,
      await fs.readFile(headerPath, 'utf8'),
      workspaceRoot,
    );
    const mainResult = await analyzeFileWithTreeSitter(mainPath, source, workspaceRoot);
    const loggerResult = await analyzeFileWithTreeSitter(loggerPath, loggerSource, workspaceRoot);

    expect(mainResult?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'include',
        sourceId: 'codegraphy.treesitter:include',
        type: 'include',
        specifier: 'logger/logger.h',
        resolvedPath: path.join(workspaceRoot, 'src/logger/logger.h'),
        toFilePath: path.join(workspaceRoot, 'src/logger/logger.h'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'logger_init',
        fromSymbolId: `${mainPath}:function:main`,
        toSymbolId: `${path.join(workspaceRoot, 'src/logger/logger.h')}:prototype:logger_init`,
        resolvedPath: path.join(workspaceRoot, 'src/logger/logger.h'),
        toFilePath: path.join(workspaceRoot, 'src/logger/logger.h'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'logger_write',
        fromSymbolId: `${mainPath}:function:main`,
        toSymbolId: `${path.join(workspaceRoot, 'src/logger/logger.h')}:prototype:logger_write`,
        resolvedPath: path.join(workspaceRoot, 'src/logger/logger.h'),
        toFilePath: path.join(workspaceRoot, 'src/logger/logger.h'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'logger_flush',
        fromSymbolId: `${mainPath}:function:main`,
        toSymbolId: `${path.join(workspaceRoot, 'src/logger/logger.h')}:prototype:logger_flush`,
        resolvedPath: path.join(workspaceRoot, 'src/logger/logger.h'),
        toFilePath: path.join(workspaceRoot, 'src/logger/logger.h'),
      }),
    ]));
    expect(loggerResult?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'include',
        sourceId: 'codegraphy.treesitter:include',
        fromSymbolId: `${loggerPath}:include:logger.h`,
        type: 'include',
        specifier: 'logger.h',
        resolvedPath: path.join(workspaceRoot, 'src/logger/logger.h'),
      }),
      expect.objectContaining({
        kind: 'include',
        sourceId: 'codegraphy.treesitter:include',
        fromSymbolId: `${loggerPath}:include:format.h`,
        type: 'include',
        specifier: 'format.h',
        resolvedPath: path.join(workspaceRoot, 'src/logger/format.h'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'logger_format_line',
        fromSymbolId: `${loggerPath}:function:logger_write`,
        toSymbolId: `${path.join(workspaceRoot, 'src/logger/format.h')}:prototype:logger_format_line`,
        resolvedPath: path.join(workspaceRoot, 'src/logger/format.h'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'logger_accepts',
        fromSymbolId: `${loggerPath}:function:logger_write`,
        toSymbolId: `${loggerPath}:function:logger_accepts`,
        resolvedPath: loggerPath,
      }),
    ]));
    expect(headerResult?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: headerPath, kind: 'enum', name: 'LogLevel' }),
      expect.objectContaining({ filePath: headerPath, kind: 'struct', name: 'Logger' }),
      expect.objectContaining({ filePath: headerPath, kind: 'typedef', name: 'LogLevel' }),
      expect.objectContaining({ filePath: headerPath, kind: 'typedef', name: 'Logger' }),
      expect.objectContaining({ filePath: headerPath, kind: 'global', name: 'logger_default_capacity' }),
      expect.objectContaining({ filePath: headerPath, kind: 'prototype', name: 'logger_init' }),
      expect.objectContaining({ filePath: headerPath, kind: 'prototype', name: 'logger_write' }),
      expect.objectContaining({ filePath: headerPath, kind: 'prototype', name: 'logger_flush' }),
    ]));
  });

  it('does not turn unmatched C calls into edges to the only included header', async () => {
    const workspaceRoot = await createWorkspace({
      'src/math/add.h': [
        '#pragma once',
        'int add(int left, int right);',
        '',
      ].join('\n'),
    });
    const mainPath = path.join(workspaceRoot, 'src/main.c');
    const source = [
      '#include "math/add.h"',
      '',
      'static int helper(void) {',
      '  return 1;',
      '}',
      '',
      'int main(void) {',
      '  return helper();',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(mainPath, source, workspaceRoot);

    expect(result?.relations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        specifier: 'helper',
        resolvedPath: path.join(workspaceRoot, 'src/math/add.h'),
      }),
    ]));
  });
});
