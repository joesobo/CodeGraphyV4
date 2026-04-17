import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { postMessage } from '../../vscodeApi';
import { buildNextFilterPatterns, buildNextLegendRules } from './rules';
import type { RulePromptState } from './view';
import type { IGroup } from '../../../shared/settings/groups';

interface UseRulePromptHandlersOptions {
  filterPatterns: string[];
  userLegendRules: IGroup[];
  setFilterPatterns: (patterns: string[]) => void;
  setOptimisticUserLegends: (legends: IGroup[]) => void;
  setRulePrompt: Dispatch<SetStateAction<RulePromptState | null>>;
}

export function useRulePromptHandlers({
  filterPatterns,
  userLegendRules,
  setFilterPatterns,
  setOptimisticUserLegends,
  setRulePrompt,
}: UseRulePromptHandlersOptions): {
  closeRulePrompt: () => void;
  openFilterPrompt: (pattern: string) => void;
  openLegendPrompt: (rule: { pattern: string; color: string; target: 'node' | 'edge' }) => void;
  handleRulePromptSubmit: (nextState: RulePromptState) => void;
} {
  const closeRulePrompt = useCallback(() => {
    setRulePrompt(null);
  }, [setRulePrompt]);

  const openFilterPrompt = useCallback((pattern: string) => {
    setRulePrompt({ kind: 'filter', pattern });
  }, [setRulePrompt]);

  const openLegendPrompt = useCallback((rule: { pattern: string; color: string; target: 'node' | 'edge' }) => {
    setRulePrompt({ kind: 'legend', ...rule });
  }, [setRulePrompt]);

  const handleRulePromptSubmit = useCallback((nextState: RulePromptState) => {
    if (nextState.kind === 'filter') {
      const nextPatterns = buildNextFilterPatterns(filterPatterns, nextState.pattern);
      if (nextPatterns) {
        setFilterPatterns(nextPatterns);
        postMessage({ type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: nextPatterns } });
      }
      setRulePrompt(null);
      return;
    }

    const nextLegends = buildNextLegendRules(
      userLegendRules,
      nextState,
      () => `legend:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    );
    if (nextLegends) {
      setOptimisticUserLegends(nextLegends);
      postMessage({
        type: 'UPDATE_LEGENDS',
        payload: { legends: nextLegends },
      });
    }
    setRulePrompt(null);
  }, [filterPatterns, setFilterPatterns, setOptimisticUserLegends, setRulePrompt, userLegendRules]);

  return {
    closeRulePrompt,
    openFilterPrompt,
    openLegendPrompt,
    handleRulePromptSubmit,
  };
}
