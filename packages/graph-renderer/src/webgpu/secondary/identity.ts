import type { GraphRendererFrame, GraphRendererSecondaryFrame } from '../../contracts';
import type { GraphBufferState } from '../buffer/state';

export interface SecondaryStyleIdentity {
  getLinkColor: GraphRendererSecondaryFrame['getLinkColor'];
  getLinkOpacity: GraphRendererSecondaryFrame['getLinkOpacity'];
  getLinkWidth: GraphRendererSecondaryFrame['getLinkWidth'];
  getNodeStyle: GraphRendererSecondaryFrame['getNodeStyle'];
  links: GraphRendererFrame['links'];
  nodes: GraphRendererFrame['nodes'];
  renderedLinkOrderRevision: number;
  version: number;
}

export function createSecondaryStyleIdentity(
  primary: GraphBufferState,
  frame: GraphRendererFrame,
  secondary: GraphRendererSecondaryFrame,
): SecondaryStyleIdentity {
  return {
    getLinkColor: secondary.getLinkColor,
    getLinkOpacity: secondary.getLinkOpacity,
    getLinkWidth: secondary.getLinkWidth,
    getNodeStyle: secondary.getNodeStyle,
    links: frame.links,
    nodes: frame.nodes,
    renderedLinkOrderRevision: primary.renderedLinkOrderRevision,
    version: secondary.styleVersion,
  };
}

export function secondaryStyleIdentityChanged(
  current: SecondaryStyleIdentity | undefined,
  primary: GraphBufferState,
  frame: GraphRendererFrame,
  secondary: GraphRendererSecondaryFrame,
): boolean {
  return current?.version !== secondary.styleVersion
    || current.renderedLinkOrderRevision !== primary.renderedLinkOrderRevision
    || current.nodes !== frame.nodes
    || current.links !== frame.links
    || current.getNodeStyle !== secondary.getNodeStyle
    || current.getLinkColor !== secondary.getLinkColor
    || current.getLinkOpacity !== secondary.getLinkOpacity
    || current.getLinkWidth !== secondary.getLinkWidth;
}
