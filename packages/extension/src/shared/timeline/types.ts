export interface ICommitInfo {
  sha: string;
  timestamp: number;
  message: string;
  author: string;
  parents: string[];
}

export interface ITimelineData {
  commits: ICommitInfo[];
  currentSha: string;
}
