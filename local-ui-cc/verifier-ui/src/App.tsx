import { useState } from 'react';
import type { Screen } from './types';
import { useToast, ToastContainer } from '@shared/components/Toast';
import { Layout } from './components/Layout';
import { NewRequestScreen } from './screens/NewRequestScreen';
import { SessionsScreen } from './screens/SessionsScreen';

export default function App() {
  const [screen, setScreen] = useState<Screen>('new-request');
  const { toasts, addToast, dismissToast, exiting } = useToast();

  const renderScreen = () => {
    switch (screen) {
      case 'new-request': return <NewRequestScreen addToast={addToast} />;
      case 'sessions': return <SessionsScreen addToast={addToast} />;
      default: return <NewRequestScreen addToast={addToast} />;
    }
  };

  return (
    <>
      <Layout currentScreen={screen} onNavigate={setScreen}>
        {renderScreen()}
      </Layout>
      <ToastContainer toasts={toasts} dismissToast={dismissToast} exiting={exiting} />
    </>
  );
}
