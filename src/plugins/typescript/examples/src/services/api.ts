/**
 * API service - imports helpers and config
 * Expected: edges to helpers, config
 */
import { processData } from '../utils/helpers';
import { config } from '../config';

export async function fetchData() {
  const response = await fetch(config.apiUrl);
  const data = await response.json();
  return processData(data);
}
