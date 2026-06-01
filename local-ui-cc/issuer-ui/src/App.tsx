import { useState } from 'react';
import type { Screen } from './types';
import { useToast, ToastContainer } from '@shared/components/Toast';
import { Layout } from './components/Layout';
import { DashboardScreen } from './screens/DashboardScreen';
import { IssueCredentialScreen } from './screens/IssueCredentialScreen';
import { OffersScreen } from './screens/OffersScreen';

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const { toasts, addToast, dismissToast } = useToast();

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard': return <DashboardScreen addToast={addToast} />;
      case 'issue': return <IssueCredentialScreen addToast={addToast} />;
      case 'offers': return <OffersScreen addToast={addToast} />;
      default: return <DashboardScreen addToast={addToast} />;
    }
  };

  return (
    <>
      <Layout currentScreen={screen} onNavigate={setScreen}>
        {renderScreen()}
      </Layout>
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </>
  );
}
