import React, { useState, useEffect } from 'react';
import { GameProvider } from './context/GameContext';
import { ParticipantPage } from './pages/ParticipantPage';
import { AdminLoginPage } from './components/Admin/AdminLoginPage';
import { AdminDashboard } from './components/Admin/AdminDashboard';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check admin auth status
  useEffect(() => {
    if (currentPath.startsWith('/admin')) {
      fetch('/api/admin/me')
        .then(r => r.json())
        .then(data => {
          setIsAdminAuthenticated(!!data.authenticated);
        })
        .catch(() => setIsAdminAuthenticated(false))
        .finally(() => setIsCheckingAdmin(false));
    } else {
      setIsCheckingAdmin(false);
    }
  }, [currentPath]);

  const handleAdminLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAdminAuthenticated(false);
  };

  if (currentPath.startsWith('/admin')) {
    if (isCheckingAdmin) {
      return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-white">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    if (!isAdminAuthenticated) {
      return <AdminLoginPage onSuccess={() => setIsAdminAuthenticated(true)} />;
    }

    return <AdminDashboard onLogout={handleAdminLogout} />;
  }

  return (
    <GameProvider>
      <ParticipantPage />
    </GameProvider>
  );
};

export default App;
