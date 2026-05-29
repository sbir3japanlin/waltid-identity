import type { Screen } from '../types';

const NAV_ITEMS: { screen: Screen; label: string }[] = [
  { screen: 'credentials', label: 'Credentials' },
  { screen: 'claim', label: 'Claim Offer' },
  { screen: 'presentation', label: 'Presentation' },
  { screen: 'keys-dids', label: 'Keys & DIDs' },
];

export function Layout({ currentScreen, onNavigate, loggedIn, onLogout, children }: {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
  loggedIn: boolean;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {loggedIn && (
        <nav style={{
          display: 'flex', gap: 0, padding: '0 20px', background: '#1a1a2e',
          color: '#fff', alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 'bold', marginRight: 20, fontSize: 16 }}>Wallet UI</span>
          {NAV_ITEMS.map(item => (
            <button key={item.screen} onClick={() => onNavigate(item.screen)} style={{
              background: currentScreen === item.screen ? '#16213e' : 'transparent',
              color: '#fff', border: 'none', padding: '12px 16px', cursor: 'pointer',
              fontSize: 14, borderBottom: currentScreen === item.screen ? '2px solid #4fc3f7' : '2px solid transparent',
            }}>
              {item.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={onLogout} style={{
            background: 'transparent', color: '#ff8a80', border: '1px solid #ff8a80',
            padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13,
          }}>
            Logout
          </button>
        </nav>
      )}
      <main style={{ flex: 1, padding: 24 }}>
        {children}
      </main>
    </div>
  );
}
