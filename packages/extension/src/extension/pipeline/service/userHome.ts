export function readWorkspacePipelineUserHomeDir(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const homeDir = env.CODEGRAPHY_HOME?.trim();
  return homeDir && homeDir.length > 0 ? homeDir : undefined;
}
