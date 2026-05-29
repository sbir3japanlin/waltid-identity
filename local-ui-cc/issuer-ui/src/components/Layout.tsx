import type { Screen } from '../types';

const NAV_ITEMS: { screen: Screen; label: string }[] = [
  { screen: 'dashboard', label: 'Dashboard' },
  { screen: 'issue', label: 'Issue Credential' },
  { screen: 'offers', label: 'Offers' },
];

export function Layout({ currentScreen, onNavigate, children }: {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        display: 'flex', gap: 0, padding: '0 20px', background: '#0d1b2a',
        color: '#fff', alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 'bold', marginRight: 20, fontSize: 16 }}>Issuer UI</span>
        {NAV_ITEMS.map(item => (
          <button key={item.screen} onClick={() => onNavigate(item.screen)} style={{
            background: currentScreen === item.screen ? '#1b2838' : 'transparent',
            color: '#fff', border: 'none', padding: '12px 16px', cursor: 'pointer',
            fontSize: 14, borderBottom: currentScreen === item.screen ? '2px solid #4fc3f7' : '2px solid transparent',
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
