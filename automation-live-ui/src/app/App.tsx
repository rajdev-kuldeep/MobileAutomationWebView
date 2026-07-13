import { useLiveEvents } from '../hooks/useLiveEvents';
import { AppShell } from '../components/layout/AppShell';

export function App() {
  useLiveEvents(); // single WebSocket → stores wire-up
  return <AppShell />;
}
