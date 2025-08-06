
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import type { User, DashboardStats, Client, Package } from '../../server/src/schema';

// Components
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';
import ClientManagement from '@/components/ClientManagement';
import PackageManagement from '@/components/PackageManagement';
import Accounts from '@/components/Accounts';
import Reports from '@/components/Reports';
import Settings from '@/components/Settings';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

// Import Cairo font CSS
import '@/App.css';

export type NavigationPage = 
  | 'dashboard' 
  | 'clients' 
  | 'packages' 
  | 'invoices' 
  | 'payments' 
  | 'expenses' 
  | 'income'
  | 'reports' 
  | 'settings';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  // Check for existing authentication on app load
  useEffect(() => {
    const storedUser = localStorage.getItem('isp_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Invalid stored user data:', error);
        localStorage.removeItem('isp_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Load dashboard data when user is authenticated
  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    
    try {
      const [statsResult, clientsResult, packagesResult] = await Promise.all([
        trpc.getDashboardStats.query(),
        trpc.getClients.query(),
        trpc.getPackages.query()
      ]);
      
      setDashboardStats(statsResult);
      setClients(clientsResult);
      setPackages(packagesResult);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const handleLogin = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    localStorage.setItem('isp_user', JSON.stringify(authenticatedUser));
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('isp_user');
    setCurrentPage('dashboard');
    setDashboardStats(null);
    setClients([]);
    setPackages([]);
  };

  const refreshData = useCallback(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-cairo">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            stats={dashboardStats}
            onNavigate={setCurrentPage}
            onRefresh={refreshData}
          />
        );
      case 'clients':
        return (
          <ClientManagement
            clients={clients}
            packages={packages}
            onRefresh={refreshData}
            userRole={user.role}
          />
        );
      case 'packages':
        return (
          <PackageManagement
            packages={packages}
            onRefresh={refreshData}
            userRole={user.role}
          />
        );
      case 'invoices':
      case 'payments':
      case 'expenses':
      case 'income':
        return (
          <Accounts
            activeTab={currentPage}
            onTabChange={setCurrentPage}
            clients={clients}
            userRole={user.role}
            onRefresh={refreshData}
          />
        );
      case 'reports':
        return (
          <Reports
            clients={clients}
            userRole={user.role}
          />
        );
      case 'settings':
        return (
          <Settings
            currentUser={user}
            userRole={user.role}
            onUserUpdate={setUser}
          />
        );
      default:
        return <Dashboard stats={dashboardStats} onNavigate={setCurrentPage} onRefresh={refreshData} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-cairo" dir="rtl">
      <div className="flex">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          userRole={user.role}
        />
        <div className="flex-1 flex flex-col mr-64">
          <Header
            user={user}
            onLogout={handleLogout}
            currentPage={currentPage}
          />
          <main className="flex-1 p-6">
            {renderCurrentPage()}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
