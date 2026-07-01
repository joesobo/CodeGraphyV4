export const CODEGRAPHY_WEB_ROUTE_IDS = [
  'register',
  'login',
  'subscription',
  'account',
  'billing',
  'access',
] as const;

export type CodeGraphyWebRouteId = typeof CODEGRAPHY_WEB_ROUTE_IDS[number];

export interface CodeGraphyWebRoute {
  id: CodeGraphyWebRouteId;
  label: string;
  path: string;
  purpose: string;
  requiresSignedInUser: boolean;
  showInNavigation: boolean;
}

export interface CodeGraphyWebApp {
  name: 'CodeGraphy Web';
  routes: CodeGraphyWebRoute[];
}

export interface CodeGraphyWebNavigationItem {
  id: Exclude<CodeGraphyWebRouteId, 'access'>;
  label: string;
  path: string;
}

const ROUTES: CodeGraphyWebRoute[] = [
  {
    id: 'register',
    label: 'Register',
    path: '/register',
    purpose: 'Create a CodeGraphy account.',
    requiresSignedInUser: false,
    showInNavigation: true,
  },
  {
    id: 'login',
    label: 'Login',
    path: '/login',
    purpose: 'Authenticate an existing CodeGraphy account.',
    requiresSignedInUser: false,
    showInNavigation: true,
  },
  {
    id: 'subscription',
    label: 'Subscription',
    path: '/subscription',
    purpose: 'Choose or review a CodeGraphy subscription.',
    requiresSignedInUser: true,
    showInNavigation: true,
  },
  {
    id: 'account',
    label: 'Account',
    path: '/account',
    purpose: 'Manage CodeGraphy account details.',
    requiresSignedInUser: true,
    showInNavigation: true,
  },
  {
    id: 'billing',
    label: 'Billing',
    path: '/billing',
    purpose: 'Manage invoices, payment methods, and billing portal links.',
    requiresSignedInUser: true,
    showInNavigation: true,
  },
  {
    id: 'access',
    label: 'Access',
    path: '/access/:accessKey',
    purpose: 'Return a signed access decision for CodeGraphy hosts and paid plugins.',
    requiresSignedInUser: true,
    showInNavigation: false,
  },
];

function isNavigationRoute(
  route: CodeGraphyWebRoute,
): route is CodeGraphyWebRoute & { id: Exclude<CodeGraphyWebRouteId, 'access'> } {
  return route.showInNavigation && route.id !== 'access';
}

export function createCodeGraphyWebApp(): CodeGraphyWebApp {
  return {
    name: 'CodeGraphy Web',
    routes: ROUTES.map(route => ({ ...route })),
  };
}

export function createCodeGraphyWebNavigation(
  app: CodeGraphyWebApp,
): CodeGraphyWebNavigationItem[] {
  return app.routes
    .filter(isNavigationRoute)
    .map(route => ({
      id: route.id,
      label: route.label,
      path: route.path,
    }));
}
