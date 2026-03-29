interface SendGraphViewFileInfoMessageOptions<TPayload> {
  loadFileInfo: (filePath: string) => Promise<TPayload | undefined>;
  sendMessage: (message: unknown) => void;
  logError: (label: string, error: unknown) => void;
}

export async function sendGraphViewFileInfoMessage<TPayload>(
  filePath: string,
  { loadFileInfo, sendMessage, logError }: SendGraphViewFileInfoMessageOptions<TPayload>,
): Promise<void> {
  try {
    const payload = await loadFileInfo(filePath);
    if (!payload) return;

    sendMessage({ type: 'FILE_INFO', payload });
  } catch (error) {
    logError('[CodeGraphy] Failed to get file info:', error);
  }
}
