import type { Screen } from '../types';

const NAV_ITEMS: { screen: Screen; label: string }[] = [
  { screen: 'new-request', label: 'New Request' },
  { screen: 'sessions', label: 'Sessions' },
];

export function Layout({ currentScreen, onNavigate, children }: {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        display: 'flex', gap: 0, padding: '0 20px', background: '#1a0a00',
        color: '#fff', alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 'bold', marginRight: 20, fontSize: 16 }}>Verifier UI</span>
        {NAV_ITEMS.map(item => (
          <button key={item.screen} onClick={() => onNavigate(item.screen)} style={{
            background: currentScreen === item.screen ? '#2a1a10' : 'transparent',
            color: '#fff', border: 'none', padding: '12px 16px', cursor: 'pointer',
            fontSize: 14, borderBottom: currentScreen === item.screen ? '2px solid #ff9800' : '2px solid transparent',
          }}>
            {item.label}
          </button>
        ))}
      </nav>
      <main style={{ flex: 1, padding: 24 }}>
        {children}
      </main>
    </div>
  );
}
