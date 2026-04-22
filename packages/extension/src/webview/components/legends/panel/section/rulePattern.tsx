import React, { useEffect, useState } from 'react';
import type { IGroup } from '../../../../../shared/settings/groups';
import { Input } from '../../../ui/input';
import type { LegendRuleChange } from './contracts';

function ReadOnlyPattern({ rule }: { rule: IGroup }): React.ReactElement {
  const label = rule.displayLabel ?? rule.pattern;

  return (
    <div className="break-all text-xs font-medium leading-5" title={label}>
      {label}
    </div>
  );
}

function EditablePattern({
  rule,
  index,
  onChange,
}: {
  rule: IGroup;
  index: number;
  onChange: LegendRuleChange;
}): React.ReactElement {
  const [draftPattern, setDraftPattern] = useState(rule.pattern);

  useEffect(() => {
    setDraftPattern(rule.pattern);
  }, [rule.pattern]);

  const commitPattern = (): void => {
    const nextPattern = draftPattern.trim();
    if (!nextPattern) {
      setDraftPattern(rule.pattern);
      return;
    }

    if (nextPattern !== rule.pattern) {
      onChange({ ...rule, pattern: nextPattern });
    }
  };

  return (
    <Input
      value={draftPattern}
      onChange={(event) => setDraftPattern(event.target.value)}
      onBlur={commitPattern}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commitPattern();
          event.currentTarget.blur();
        }
      }}
      title={rule.pattern}
      aria-label={`Legend pattern ${index + 1}`}
      className="h-7 min-w-0 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
    />
  );
}

export function RulePatternCell({
  rule,
  index,
  onChange,
}: {
  rule: IGroup;
  index: number;
  onChange: LegendRuleChange;
}): React.ReactElement {
  return (
    <div className="min-w-0 flex-1">
      {rule.isPluginDefault === true ? (
        <ReadOnlyPattern rule={rule} />
      ) : (
        <EditablePattern rule={rule} index={index} onChange={onChange} />
      )}
    </div>
  );
}
