import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';
import { fileURLToPath } from 'node:url';
import { INSTRUMENTER_CONSTANTS } from '@stryker-mutator/api/core';
import { declareFactoryPlugin, PluginKind, commonTokens, tokens } from '@stryker-mutator/api/plugin';
import { VitestTestRunner } from '../../../node_modules/@stryker-mutator/vitest-runner/dist/src/vitest-test-runner.js';
import { vitestWrapper } from '../../../node_modules/@stryker-mutator/vitest-runner/dist/src/vitest-wrapper.js';

const STRYKER_SETUP = fileURLToPath(
  new URL('../../../node_modules/@stryker-mutator/vitest-runner/dist/src/stryker-setup.js', import.meta.url),
);
const STRYKER_SETUP_SOURCE_MAP = 'stryker-setup.js.map';

function createStrykerSetupSourceMap(setupFilePath) {
  return JSON.stringify({
    version: 3,
    file: path.basename(setupFilePath),
    sources: [],
    names: [],
    mappings: '',
  });
}

class CodeGraphyVitestTestRunner extends VitestTestRunner {
  async init() {
    this.setEnv();
    await fs.promises.copyFile(STRYKER_SETUP, this.localSetupFile);
    await fs.promises.writeFile(
      path.resolve(path.dirname(this.localSetupFile), STRYKER_SETUP_SOURCE_MAP),
      createStrykerSetupSourceMap(this.localSetupFile),
    );

    this.ctx = await vitestWrapper.createVitest('test', {
      config: this.options.vitest?.configFile,
      coverage: { enabled: false },
      pool: 'forks',
      maxWorkers: 1,
      maxConcurrency: 1,
      fileParallelism: false,
      watch: false,
      dir: this.options.vitest?.dir,
      bail: this.options.disableBail ? 0 : 1,
      onConsoleLog: () => false,
    });
    this.ctx.provide('globalNamespace', this.globalNamespace);
    this.ctx.provide(
      'isGreaterThanVitest4Point1',
      semver.satisfies(vitestWrapper.version, '>=4.1.0'),
    );
    this.ctx.config.browser.screenshotFailures = false;
    this.ctx.projects.forEach((project) => {
      project.config.setupFiles = [
        this.localSetupFile,
        ...project.config.setupFiles,
      ];
      project.config.browser.screenshotFailures = false;
    });
    if (this.log.isDebugEnabled()) {
      this.log.debug(`vitest final config: ${JSON.stringify(this.ctx.config, null, 2)}`);
    }
  }
}

function createCodeGraphyVitestTestRunnerFactory(
  namespace = INSTRUMENTER_CONSTANTS.NAMESPACE,
) {
  createCodeGraphyVitestTestRunner.inject = tokens(commonTokens.injector);
  function createCodeGraphyVitestTestRunner(injector) {
    return injector
      .provideValue('globalNamespace', namespace)
      .injectClass(CodeGraphyVitestTestRunner);
  }
  return createCodeGraphyVitestTestRunner;
}

export const codeGraphyVitestTestRunnerFactory = createCodeGraphyVitestTestRunnerFactory();

export const strykerPlugins = [
  declareFactoryPlugin(
    PluginKind.TestRunner,
    'codegraphy-vitest',
    codeGraphyVitestTestRunnerFactory,
  ),
];
