/**
 * API service - imports processing and appConfig
 * Expected: edges to processing, appConfig
 */
import { processData } from '../utils/processing';
import { config } from '../appConfig';

export async function fetchData() {
  const response = await fetch(config.apiUrl);
  const data = await response.json();
  return processData(data);
}
