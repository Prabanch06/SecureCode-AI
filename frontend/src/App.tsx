import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Code, History, Settings, Menu, X, Shield, Zap, Users, ActivitySquare, ShieldAlert, BarChart3, Sun, Moon, Mail, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { AutoLogout } from './components/AutoLogout';
import { CodeAnalyzer } from './components/CodeAnalyzer';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './components/UserProfile';
import { ScanHistoryView } from './components/ScanHistoryView';
import { TeamManagement } from './components/TeamManagement';
import { ApiUsageDashboard } from './components/ApiUsageDashboard';
import { SecurityDashboard } from './components/SecurityDashboard';
import { TechnicalDebtAnalyzer } from './components/TechnicalDebtAnalyzer';
import { TeamAnalytics } from './components/TeamAnalytics';
import { EmailHub } from './components/EmailHub';
import { Login } from './components/Login';
import { Register } from './components/Register';
import api from './lib/api';
import axios from 'axios';

type Page = 'dashboard' | 'analyze' | 'history' | 'team' | 'api-usage' | 'settings' | 'profile' | 'security' | 'tech-debt' | 'team-analytics' | 'email-hub';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<{ id: number; username: string; email: string; role?: string } | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check if we already have a JWT token in local storage
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/api/auth/profile/');
          setUser({ 
            id: res.data.id, 
            username: res.data.username, 
            email: res.data.email, 
            role: res.data.profile?.role 
          });
          setIsAuthenticated(true);
          setAuthChecking(false);
          return;
        } catch (err) {
          console.error('Token verification failed, checking session...', err);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }

      // 2. Check if we have an active backend session (e.g. redirected back from django-allauth callback)
      try {
        const res = await axios.get('/api/auth/oauth/session-jwt/');
        localStorage.setItem('access_token', res.data.access);
        localStorage.setItem('refresh_token', res.data.refresh);
        setUser({
          id: res.data.user.id,
          username: res.data.user.username,
          email: res.data.user.email,
          role: res.data.user.role
        });
        setIsAuthenticated(true);
        toast.success('Successfully logged in with GitHub!');
      } catch (sessionErr) {
        console.log('No active Django session found.');
      } finally {
        setAuthChecking(false);
      }
    };

    initAuth();
  }, []);

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await api.post('/api/auth/logout/', { refresh });
    } catch (err) {
      console.error('Logout API call failed:', err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  useEffect(() => {
    // Apply dark mode class to html element
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);



  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === 'login') {
      return (
        <Login
          onLoginSuccess={(user) => {
            setUser(user);
            setIsAuthenticated(true);
          }}
          onNavigateToRegister={() => setAuthView('register')}
        />
      );
    } else {
      return (
        <Register
          onRegisterSuccess={(user) => {
            setUser(user);
            setIsAuthenticated(true);
          }}
          onNavigateToLogin={() => setAuthView('login')}
        />
      );
    }
  }

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans transition-colors duration-200`}>
      <Toaster position="top-right" richColors />
      <AutoLogout />
      
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={`w-64 h-full ${darkMode ? 'bg-slate-900 border-r border-slate-800' : 'bg-slate-900'} text-white flex flex-col shrink-0 drop-shadow-xl z-20`}
          >
            <div className="p-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-lg">SC</div>
                <span className="text-xl font-semibold tracking-tight truncate">SecureCode AI</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-slate-800 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Core</div>
              <NavItem 
                icon={<LayoutDashboard className="w-5 h-5" />} 
                label="Dashboard" 
                active={currentPage === 'dashboard'} 
                onClick={() => setCurrentPage('dashboard')} 
              />
              {user?.role !== 'Viewer' && (
                <NavItem 
                  icon={<Code className="w-5 h-5" />} 
                  label="New Analysis" 
                  active={currentPage === 'analyze'} 
                  onClick={() => setCurrentPage('analyze')} 
                />
              )}
              <NavItem 
                icon={<History className="w-5 h-5" />} 
                label="Scan History" 
                active={currentPage === 'history'} 
                onClick={() => setCurrentPage('history')} 
              />
              
              <div className="px-3 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Security & Debt</div>
              <NavItem 
                icon={<ShieldAlert className="w-5 h-5" />} 
                label="Security Dashboard" 
                active={currentPage === 'security'} 
                onClick={() => setCurrentPage('security')} 
              />
              {user?.role !== 'Viewer' && (
                <NavItem 
                  icon={<Zap className="w-5 h-5" />} 
                  label="Technical Debt" 
                  active={currentPage === 'tech-debt'} 
                  onClick={() => setCurrentPage('tech-debt')} 
                />
              )}

              {(user?.role === 'Admin' || user?.role === 'Developer') && (
                <div className="px-3 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">System</div>
              )}
              {user?.role === 'Admin' && (
                <>
                  <NavItem 
                    icon={<Users className="w-5 h-5" />} 
                    label="Team Management" 
                    active={currentPage === 'team'} 
                    onClick={() => setCurrentPage('team')} 
                  />
                  <NavItem 
                    icon={<BarChart3 className="w-5 h-5" />} 
                    label="Team Analytics" 
                    active={currentPage === 'team-analytics'} 
                    onClick={() => setCurrentPage('team-analytics')} 
                  />
                  <NavItem 
                    icon={<ActivitySquare className="w-5 h-5" />} 
                    label="API Usage" 
                    active={currentPage === 'api-usage'} 
                    onClick={() => setCurrentPage('api-usage')} 
                  />
                </>
              )}
              {user?.role !== 'Viewer' && (
                <NavItem 
                  icon={<Mail className="w-5 h-5" />} 
                  label="Email Hub" 
                  active={currentPage === 'email-hub'} 
                  onClick={() => setCurrentPage('email-hub')} 
                />
              )}
            </nav>

            <div className="p-4 border-t border-slate-800">
              <div 
                onClick={() => setCurrentPage('profile')}
                className="flex items-center gap-3 mb-4 px-3 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                  {user?.username ? user.username.substring(0, 2).toUpperCase() : 'US'}
                </div>
                <div className="flex flex-col max-w-[150px]">
                  <span className="text-xs font-medium hover:underline truncate">{user?.username || 'User Profile'}</span>
                  <span className="text-[10px] text-slate-500 truncate">{user?.role || 'Developer'}</span>
                </div>
              </div>
              <NavItem 
                icon={<Settings className="w-5 h-5" />} 
                label="Settings" 
                active={currentPage === 'settings'} 
                onClick={() => setCurrentPage('settings')} 
              />
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 mt-2 rounded-md text-sm font-medium w-full text-left text-red-400 hover:text-red-400 hover:bg-slate-850 transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5 text-red-400" />
                <span>Log Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className={`h-16 ${darkMode ? 'bg-slate-900 border-b border-slate-800' : 'bg-white border-b border-slate-200'} flex items-center justify-between px-8 shrink-0 transition-colors`}>
          <div className="flex items-center gap-4 flex-1">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-md text-slate-600">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="relative w-full max-w-md hidden md:block">
              <input 
                type="text" 
                placeholder="Search repositories, bugs, or projects..." 
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-slate-850 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`} 
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className={`p-2 rounded-lg border transition-colors ${
                darkMode ? 'border-slate-700 hover:bg-slate-800 text-amber-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold hidden md:block ${
              darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}>v1.2.0-Stable</div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto p-4 md:p-8 relative ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto h-full"
            >
              {currentPage === 'dashboard' && (
                <Dashboard 
                  onNavigate={(page) => setCurrentPage(page as Page)} 
                  globalSearchTerm={globalSearchTerm}
                />
              )}
              {currentPage === 'analyze' && user?.role !== 'Viewer' && <CodeAnalyzer />}
              {currentPage === 'history' && (
                <ScanHistoryView 
                  globalSearchTerm={globalSearchTerm}
                  setGlobalSearchTerm={setGlobalSearchTerm}
                />
              )}
              {currentPage === 'email-hub' && user?.role !== 'Viewer' && <EmailHub />}
              {currentPage === 'security' && <SecurityDashboard />}
              {currentPage === 'tech-debt' && user?.role !== 'Viewer' && <TechnicalDebtAnalyzer />}
              {currentPage === 'team' && user?.role === 'Admin' && <TeamManagement />}
              {currentPage === 'team-analytics' && user?.role === 'Admin' && <TeamAnalytics />}
              {currentPage === 'api-usage' && user?.role === 'Admin' && <ApiUsageDashboard />}
              {currentPage === 'profile' && <UserProfile />}
              {currentPage === 'settings' && (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <p>Settings module coming soon.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium w-full text-left transition-colors ${
        active 
          ? 'bg-blue-600 text-white' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
