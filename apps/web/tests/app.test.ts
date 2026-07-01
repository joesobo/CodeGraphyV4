import { describe, expect, it } from 'vitest';
import {
  CODEGRAPHY_WEB_ROUTE_IDS,
  createCodeGraphyWebApp,
  createCodeGraphyWebNavigation,
} from '../src';

describe('@codegraphy/web app shell', () => {
  it('declares the account, billing, subscription, and access flow routes', () => {
    const app = createCodeGraphyWebApp();

    expect(app.name).toBe('CodeGraphy Web');
    expect(app.routes.map(route => route.id)).toEqual(CODEGRAPHY_WEB_ROUTE_IDS);
    expect(app.routes).toEqual([
      expect.objectContaining({ id: 'register', path: '/register' }),
      expect.objectContaining({ id: 'login', path: '/login' }),
      expect.objectContaining({ id: 'subscription', path: '/subscription' }),
      expect.objectContaining({ id: 'account', path: '/account' }),
      expect.objectContaining({ id: 'billing', path: '/billing' }),
      expect.objectContaining({ id: 'access', path: '/access/:accessKey' }),
    ]);
  });

  it('marks access as the callback that returns paid capability state to hosts', () => {
    const app = createCodeGraphyWebApp();
    const accessRoute = app.routes.find(route => route.id === 'access');

    expect(accessRoute).toMatchObject({
      id: 'access',
      purpose: 'Return a signed access decision for CodeGraphy hosts and paid plugins.',
      requiresSignedInUser: true,
    });
  });

  it('builds navigation without exposing access callback routes as normal nav items', () => {
    const app = createCodeGraphyWebApp();

    expect(createCodeGraphyWebNavigation(app)).toEqual([
      { id: 'register', label: 'Register', path: '/register' },
      { id: 'login', label: 'Login', path: '/login' },
      { id: 'subscription', label: 'Subscription', path: '/subscription' },
      { id: 'account', label: 'Account', path: '/account' },
      { id: 'billing', label: 'Billing', path: '/billing' },
    ]);
  });
});
