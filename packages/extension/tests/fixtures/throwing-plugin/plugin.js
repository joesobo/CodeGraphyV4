export default function createThrowingFixturePlugin() {
  return {
    id: 'fixture.throwing',
    name: 'Throwing Fixture',
    version: '1.0.0',
    apiVersion: '^2.1.0',
    supportedExtensions: ['.throw'],
    async analyzeFile() {
      throw new Error('deliberate acceptance fixture failure');
    },
  };
}
