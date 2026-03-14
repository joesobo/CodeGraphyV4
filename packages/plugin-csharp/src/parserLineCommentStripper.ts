export type LineParseState = {
  inMultiLineComment: boolean;
};

export function stripCommentsFromLine(
  rawLine: string,
  previousState: LineParseState,
): { code: string; state: LineParseState } {
  let line = rawLine;
  let inMultiLineComment = previousState.inMultiLineComment;

  if (inMultiLineComment) {
    const endIndex = line.indexOf('*/');
    if (endIndex === -1) {
      return { code: '', state: { inMultiLineComment: true } };
    }
    line = line.substring(endIndex + 2);
    inMultiLineComment = false;
  }

  const commentStartIndex = line.indexOf('/*');
  if (commentStartIndex !== -1) {
    const commentEndIndex = line.indexOf('*/', commentStartIndex + 2);
    if (commentEndIndex !== -1) {
      line = line.substring(0, commentStartIndex) + line.substring(commentEndIndex + 2);
    } else {
      line = line.substring(0, commentStartIndex);
      inMultiLineComment = true;
    }
  }

  const singleLineCommentIndex = line.indexOf('//');
  if (singleLineCommentIndex !== -1) {
    line = line.substring(0, singleLineCommentIndex);
  }

  return { code: line, state: { inMultiLineComment } };
}
