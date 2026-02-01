/**
 * App component - imports Button and Header
 * Expected: edges to Button, Header
 */
import { Button } from './Button';
import { Header } from './Header';

export const App = {
  render() {
    return { Button, Header };
  }
};
