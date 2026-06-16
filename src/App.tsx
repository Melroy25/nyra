import { useEffect } from 'react';
import { useNyraStore } from './store/useNyraStore';
import { useAuth } from './hooks/useAuth';
import { MobileContainer } from './components/MobileContainer';
import { LandingPage } from './pages/LandingPage';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { SymptomIntelligence } from './pages/SymptomIntelligence';
import { AIAssistant } from './pages/AIAssistant';
import { NutritionScreen } from './pages/NutritionScreen';
import { ProfileScreen } from './pages/ProfileScreen';
import { WidgetScreen } from './pages/WidgetScreen';

function App() {
  const { view, setView, setUserId, loadUserData, isLoading } = useNyraStore();
  const { user, loading: authLoading } = useAuth();
  
  const isWidgetMode = window.location.search.includes('widget=');

  // Sync auth state with store
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        setUserId(user.uid);
        // Load user data from Firestore, then navigate to dashboard
        loadUserData(user.uid).then(() => {
          // Only navigate if currently on landing
          const currentView = useNyraStore.getState().view;
          if (currentView === 'landing') {
            setView('dashboard');
          }
        });
      } else {
        setUserId(null);
        setView('landing');
      }
    }
  }, [user, authLoading]);

  const renderActiveView = () => {
    // Show loading while auth is initializing
    if (authLoading || isLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-white via-bgsoft to-purple-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/25 h-full">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg bg-white flex items-center justify-center border border-purple-100/30 mb-4 animate-pulse">
            <span className="text-2xl">💜</span>
          </div>
          <p className="text-sm text-slate-400 animate-pulse">Loading your wellness data...</p>
        </div>
      );
    }

    switch (view) {
      case 'landing':
        return <LandingPage />;
      case 'onboarding':
        return <Onboarding />;
      case 'dashboard':
        return <Dashboard />;
      case 'analytics':
        return <SymptomIntelligence />;
      case 'chat':
        return <AIAssistant />;
      case 'nutrition':
        return <NutritionScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <Dashboard />;
    }
  };

  if (isWidgetMode) {
    if (authLoading || isLoading) {
      return (
        <div className="w-full h-screen flex items-center justify-center p-6 bg-transparent">
          <p className="text-xs text-slate-400 animate-pulse">Loading widget...</p>
        </div>
      );
    }
    return <WidgetScreen />;
  }

  return <MobileContainer>{renderActiveView()}</MobileContainer>;
}

export default App;
