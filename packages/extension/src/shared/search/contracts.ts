export interface SearchOptions {
  matchCase: boolean;
  wholeWord: boolean;
  regex: boolean;
}

export interface SearchState {
  query: string;
  options: SearchOptions;
}
