import { useState, useCallback } from 'react';
import type { Screen } from './types';
import { setToken, clearToken, getToken } from './utils';
import { useToast, ToastContainer } from '@shared/components/Toast';
import { Layout } from './components/Layout';
import { LoginScreen } from './screens/LoginScreen';
import { CredentialsScreen } from './screens/CredentialsScreen';
import { ClaimOfferScreen } from './screens/ClaimOfferScreen';
import { PresentationScreen } from './screens/PresentationScreen';
import { KeysDidsScreen } from './screens/KeysDidsScreen';

export default function App() {
  const [screen, setScreen] = useState<Screen>(getToken() ? 'credentials' : 'login');
  const [walletId, setWalletId] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const { toasts, addToast, dismissToast, exiting } = useToast();

  const handleLogin = useCallback((token: string, wid: string) => {
    setToken(token);
    setWalletId(wid);
    setScreen('credentials');
    setRefreshKey(k => k + 1);
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setWalletId('');
    setScreen('login');
  }, []);

  const loggedIn = !!getToken();

  const renderScreen = () => {
    if (!loggedIn) {
      return <LoginScreen onLogin={handleLogin} addToast={addToast} />;
    }
    switch (screen) {
      case 'credentials':
        return <CredentialsScreen key={refreshKey} walletId={walletId} addToast={addToast} />;
      case 'claim':
        return <ClaimOfferScreen walletId={walletId} addToast={addToast} />;
      case 'presentation':
        return <PresentationScreen walletId={walletId} addToast={addToast} />;
      case 'keys-dids':
        return <KeysDidsScreen walletId={walletId} addToast={addToast} />;
      default:
        return <CredentialsScreen key={refreshKey} walletId={walletId} addToast={addToast} />;
    }
  };

  return (
    <>
      <Layout currentScreen={screen} onNavigate={setScreen} loggedIn={loggedIn} onLogout={handleLogout}>
        {renderScreen()}
      </Layout>
      <ToastContainer toasts={toasts} dismissToast={dismissToast} exiting={exiting} />
    </>
  );
}
