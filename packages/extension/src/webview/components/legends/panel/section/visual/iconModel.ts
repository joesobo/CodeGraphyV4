import type { IGroup } from '../../../../../../shared/settings/groups';
import { createLegendIconImport } from '../icons';
import type { LegendRuleChange } from '../contracts';

export function readLegendIconUpload(
  rule: IGroup,
  file: File,
  onChange: LegendRuleChange,
): void {
  void createLegendIconImport(rule.id, file).then(({ imageUrl, importPayload }) => {
    onChange(
      {
        ...rule,
        imagePath: importPayload.imagePath,
        imageUrl,
      },
      [importPayload],
    );
  });
}

export function clearRuleIcon(rule: IGroup): IGroup {
  const nextRule = { ...rule };
  delete nextRule.imagePath;
  delete nextRule.imageUrl;
  return nextRule;
}
