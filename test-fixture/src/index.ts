/**
 * Entry point - imports using path aliases
 * Expected: edges to App, api, config
 */
import { App } from '@components/App';
import { fetchData } from '@services/api';
import { config } from './config';

console.log('Starting app with config:', config);
fetchData().then(() => App.render());
