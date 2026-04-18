import React, { useState } from 'react';
import { RulePromptDialog } from './Dialog';
import {
  createSubmittedRulePromptState,
  getRulePromptColor,
  getRulePromptTitle,
} from './model';

export type RulePromptState =
  | { kind: 'filter'; pattern: string }
  | { kind: 'legend'; pattern: string; color: string; target: 'node' | 'edge' };

interface RulePromptProps {
  onClose: () => void;
  onSubmit: (state: RulePromptState) => void;
  state: RulePromptState | null;
}

export function RulePrompt({
  onClose,
  onSubmit,
  state,
}: RulePromptProps): React.ReactElement | null {
  const [pattern, setPattern] = useState(state?.pattern ?? '');
  const [color, setColor] = useState(getRulePromptColor(state));

  React.useEffect(() => {
    setPattern(state?.pattern ?? '');
    setColor(getRulePromptColor(state));
  }, [state]);

  if (!state) {
    return null;
  }

  const title = getRulePromptTitle(state);
  const submit = () => onSubmit(createSubmittedRulePromptState(state, pattern, color));

  return (
    <RulePromptDialog
      title={title}
      pattern={pattern}
      color={color}
      isLegend={state.kind === 'legend'}
      onClose={onClose}
      onSave={submit}
      onPatternChange={setPattern}
      onColorChange={setColor}
    />
  );
}
