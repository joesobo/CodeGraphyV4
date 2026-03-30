export interface IFileInfo {
  path: string;
  size: number;
  lastModified: number;
  plugin?: string;
  incomingCount: number;
  outgoingCount: number;
  visits: number;
}
