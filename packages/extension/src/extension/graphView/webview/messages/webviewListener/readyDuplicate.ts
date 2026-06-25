import type {
  WebviewReadyDelivery,
  WebviewReadyTracking,
} from './contracts';

export function shouldIgnoreDuplicateReady(
  delivery: WebviewReadyDelivery,
  tracking: WebviewReadyTracking,
): boolean {
  return isSameReadyPage(delivery, tracking)
    || wasReadyPostedBeforeBootstrapCompleted(delivery, tracking);
}

function isSameReadyPage(delivery: WebviewReadyDelivery, tracking: WebviewReadyTracking): boolean {
  return delivery.pageId !== undefined && delivery.pageId === tracking.pageId;
}

function wasReadyPostedBeforeBootstrapCompleted(
  delivery: WebviewReadyDelivery,
  tracking: WebviewReadyTracking,
): boolean {
  return delivery.postedAt !== undefined
    && tracking.completedAt !== undefined
    && delivery.postedAt <= tracking.completedAt;
}
