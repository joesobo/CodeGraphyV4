const ICON_FILE_READ_ERROR = 'Unable to read icon file.';

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }

      reject(new Error(ICON_FILE_READ_ERROR));
    });
    reader.addEventListener('error', () => reject(reader.error ?? new Error(ICON_FILE_READ_ERROR)));
    reader.readAsArrayBuffer(file);
  });
}
