export function orderSlotHostChildren(host: HTMLDivElement): void {
  const orderedChildren = Array.from(host.children)
    .filter((child): child is HTMLDivElement => child instanceof HTMLDivElement)
    .sort(compareSlotChildren);

  for (const child of orderedChildren) {
    host.appendChild(child);
  }
}

function compareSlotChildren(left: HTMLDivElement, right: HTMLDivElement): number {
  const orderDifference = Number(left.dataset.cgSlotOrder ?? 0)
    - Number(right.dataset.cgSlotOrder ?? 0);
  return orderDifference || contributionId(left).localeCompare(contributionId(right));
}

function contributionId(element: HTMLDivElement): string {
  return element.dataset.cgSlotContribution ?? '';
}
