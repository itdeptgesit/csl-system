import React, { useState, useEffect } from 'react';
import { defaultTheme, Provider } from '@adobe/react-spectrum';
import { Routes, Route, Navigate, useNavigate, useLocation, NavLink, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { AppSidebarModern as NavigationSidebar } from './components/AppSidebarModern';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command"
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ToastProvider } from './components/ToastProvider';
import { TooltipProvider } from "@/components/ui/tooltip";

import { supabase } from './lib/supabaseClient';
import { UserAccount, UserGroup } from './types';
import { MOCK_GROUPS, APP_MENU_STRUCTURE } from './constants';
import { Language, translations, LanguageContext } from './translations';
import {
  LayoutGrid, LifeBuoy, Activity, Calendar, ShoppingCart, Package,
  Network, Folder, Shield, ChevronDown, ChevronRight, X, Users, Building2,
  Briefcase, Layers, Zap, ChevronLeft, PanelLeftClose, PanelLeft, Phone,
  Settings, Megaphone, Loader2, CheckCircle2, Circle, LayoutDashboard, Kanban, CheckSquare
} from 'lucide-react';

import { checkAssetLoanOverdue } from './utils/LoanNotificationUtils';
import { ProfileView } from './components/ProfileView';
import { CompleteProfileModal } from './components/CompleteProfileModal';


// Lazy Load Managers
const UserManagement = React.lazy(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
// ProfileView is now a direct import
const MasterCompany = React.lazy(() => import('./components/MasterCompany').then(m => ({ default: m.MasterCompany })));
const MasterDepartment = React.lazy(() => import('./components/MasterDepartment').then(m => ({ default: m.MasterDepartment })));
const MasterCategory = React.lazy(() => import('./components/MasterCategory').then(m => ({ default: m.MasterCategory })));
const MasterGroup = React.lazy(() => import('./components/MasterGroup').then(m => ({ default: m.MasterGroup })));
const SystemSettings = React.lazy(() => import('./components/SystemSettings').then(m => ({ default: m.SystemSettings })));
const AuditLogManager = React.lazy(() => import('./components/AuditLogManager').then(m => ({ default: m.AuditLogManager })));
const CredentialManager = React.lazy(() => import('./components/CredentialManager'));

const LoginPage = React.lazy(() => import('./components/LoginPage').then(m => ({ default: m.LoginPage })));
const DangerConfirmModal = React.lazy(() => import('./components/DangerConfirmModal').then(m => ({ default: m.DangerConfirmModal })));
const PrivacyPolicy = React.lazy(() => import('./components/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = React.lazy(() => import('./components/TermsOfService').then(m => ({ default: m.TermsOfService })));

// CSL ERP Modules
const CSLDashboard = React.lazy(() => import('./components/CSLDashboard').then(m => ({ default: m.CSLDashboard })));
const CSLRequestManager = React.lazy(() => import('./components/CSLRequestManager').then(m => ({ default: m.CSLRequestManager })));
const CSLCreateRequest = React.lazy(() => import('./components/CSLCreateRequest').then(m => ({ default: m.CSLCreateRequest })));
const CSLRoutineManager = React.lazy(() => import('./components/CSLRoutineManager').then(m => ({ default: m.CSLRoutineManager })));
const CSLDirectoryManager = React.lazy(() => import('./components/CSLDirectoryManager').then(m => ({ default: m.CSLDirectoryManager })));
const CSLDocumentsManager = React.lazy(() => import('./components/CSLDocumentsManager').then(m => ({ default: m.CSLDocumentsManager })));
const CSLBudgetManager = React.lazy(() => import('./components/CSLBudgetManager').then(m => ({ default: m.CSLBudgetManager })));
const CSLReportsManager = React.lazy(() => import('./components/CSLReportsManager').then(m => ({ default: m.CSLReportsManager })));
const CSLSettings = React.lazy(() => import('./components/CSLSettings').then(m => ({ default: m.CSLSettings })));
const CSLTaskManager = React.lazy(() => import('./components/CSLTaskManager').then(m => ({ default: m.CSLTaskManager })));

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard: LayoutDashboard,
  LifeBuoy: LifeBuoy,
  Activity: Activity,
  Kanban: Kanban,
  Calendar: Calendar,
  ShoppingCart: ShoppingCart,
  Cpu: Package,
  Network: Network,
  FolderOpen: Folder,
  Shield: Shield,
  Users: Users,
  Building2: Building2,
  Briefcase: Briefcase,
  Layers: Layers,
  Zap: Zap,
  Phone: Phone,
  Settings: Settings,
  Megaphone: Megaphone,
  Key: CheckCircle2,
  User: Circle,
  CheckSquare: CheckSquare,
}

const PublicLayout: React.FC<{
  children: React.ReactNode;
  appSettings: any;
  onLogout: () => void;
  currentUser: UserAccount | null;
  groupDefinitions: UserGroup[];
  variant?: 'admin' | 'public';
  hideHeader?: boolean;
  hideFooter?: boolean;
  searchProps?: {
    value: string;
    onChange: (val: string) => void;
  };
  refreshUserProfile?: () => void;
}> = ({ children, appSettings, onLogout, currentUser, groupDefinitions, variant = 'admin', hideHeader = false, hideFooter = false, searchProps, refreshUserProfile }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-sidebar text-foreground transition-colors duration-300 overflow-hidden relative font-sans">
      <CompleteProfileModal user={currentUser} onUpdateSuccess={refreshUserProfile} />
      {variant !== 'public' && (
        <NavigationSidebar
          currentUser={currentUser}
          groupDefinitions={groupDefinitions}
          onLogout={onLogout}
          appName={appSettings.name}
          logoUrl={appSettings.logo}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {!hideHeader && (
          <Header
            onLogout={onLogout}
            onNavigate={(v) => navigate(`/${v}`)}
            userGroups={currentUser?.groups || []}
            userRole={currentUser?.role}
            groupDefinitions={groupDefinitions}
            currentView={location.pathname.substring(1)}
            user={currentUser ? {
              id: currentUser.id,
              name: currentUser.fullName,
              role: currentUser.role,
              email: currentUser.email,
              jobTitle: currentUser.jobTitle,
              avatarUrl: currentUser.avatarUrl
            } : undefined}
            appName={appSettings.name}
            logoUrl={appSettings.logo}
            forceShowLogo={variant === 'public'}
          />
        )}

        <main className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
          <div className="flex-1 p-4 md:p-8">
            <div className="max-w-7xl mx-auto h-full text-slate-900 dark:text-slate-100">
              {children}
            </div>
          </div>
          {!hideFooter && <Footer />}
        </main>
      </div>
    </div>
  );
};

const SleekLoader: React.FC = () => {
  return (
    <div className="h-screen w-full bg-background relative overflow-hidden">
      {/* Inline styles for custom animations */}
      <style>{`
        @keyframes top-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-top-shimmer {
          animation: top-shimmer 1.8s infinite linear;
        }
      `}</style>

      {/* Sleek top-edge glowing progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-muted/10 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-transparent via-primary to-transparent w-full animate-top-shimmer absolute"
          style={{ boxShadow: '0 0 4px var(--primary)' }}
        />
      </div>
    </div>
  );
};

const InternalApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [groupDefinitions, setGroupDefinitions] = useState<UserGroup[]>(MOCK_GROUPS);
  const [appSettings, setAppSettings] = useState({
    name: 'CSL-LINK',
    logo: '/image/logo.png',
    primaryColor: '#2563eb',
    fontFamily: 'Inter'
  });

  const [language, setLanguageState] = useState<Language>('en');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [globalFloorFilter, setGlobalFloorFilter] = useState<'All' | 26 | 27>('All');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const LOADING_MESSAGES = [
    "Synchronizing secure layers...",
    "Initializing core modules...",
    "Calibrating technical nodes...",
    "Authenticating credentials...",
    "Commencing GESIT..."
  ];

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isCheckingSession) {
      const interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isCheckingSession]);

  console.log("App.tsx: Rendering InternalApp, isCheckingSession:", isCheckingSession);

  useEffect(() => {
    console.log("App.tsx: Running initial effect...");
    // Initialize Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const savedLang = localStorage.getItem('app_lang') as Language;
    if (savedLang) setLanguageState(savedLang);

    const checkSession = async () => {
      console.log("App.tsx: Checking session...");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("App.tsx: Session check result:", !!session);
        if (session?.user?.email) {
          await handleLogin(session.user.email);
        }
      } catch (err: any) {
        console.error("LoginPage: Login error:", err);
      } finally {
        console.log("App.tsx: Session check complete, setting loading to false.");
        setIsCheckingSession(false);
      }
    };

    // Safety timeout
    const timeout = setTimeout(() => {
      if (isCheckingSession) {
        console.warn("App.tsx: Session check timing out, forcing UI render.");
        setIsCheckingSession(false);
      }
    }, 5000);

    checkSession();

    const ALLOWED_DOMAINS = ['gesit.co.id', 'gnr.co.id'];
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("App.tsx: Auth state changed:", _event, !!session);
      if (session?.user?.email) {
        const email = session.user.email;
        const domain = email.split('@')[1]?.toLowerCase();
        if (!ALLOWED_DOMAINS.includes(domain)) {
          console.warn("App.tsx: Access denied for domain:", domain);
          await supabase.auth.signOut();
          showToast(`Akses ditolak. Hanya domain ${ALLOWED_DOMAINS.map(d => '@' + d).join(' & ')} yang diizinkan.`, 'error');
          return;
        }
        handleLogin(email);
      } else if (_event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('system_settings').select('*').single();
        if (data) {
          const newSettings = {
            name: data.app_name || 'CSL-LINK',
            logo: data.logo_url || '/image/logo.png',
            primaryColor: data.primary_color || '#2563eb',
            fontFamily: data.font_family || 'Inter'
          };
          setAppSettings(newSettings);

          // Apply primary color to CSS variables (fallback to stylesheet for Threads theme)
          if (newSettings.primaryColor === '#000000') {
            document.documentElement.style.removeProperty('--primary');
            document.documentElement.style.removeProperty('--color-primary');
          } else {
            document.documentElement.style.setProperty('--primary', newSettings.primaryColor);
            document.documentElement.style.setProperty('--color-primary', newSettings.primaryColor);
          }

          // Apply font family safely with quotes and fallback
          document.documentElement.style.setProperty('--font-sans', `"${newSettings.fontFamily}", sans-serif`);

          // Dynamically load font from Google Fonts
          const fontUrl = `https://fonts.googleapis.com/css2?family=${newSettings.fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
          let link = document.getElementById('google-fonts') as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.id = 'google-fonts';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
          }
          link.href = fontUrl;
        }
      } catch (err) { /* ignore */ }
    };
    if (!isCheckingSession) fetchSettings();
  }, [isCheckingSession]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
  };

  const t = (key: keyof typeof translations.en): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  useEffect(() => {
    const fetchGroups = async () => {
      const { data } = await supabase.from('user_groups').select('*');
      if (data && data.length > 0) {
        const mapped = data.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          allowedMenus: g.allowed_menus || []
        }));
        setGroupDefinitions(mapped);
      }
    };
    if (isAuthenticated) fetchGroups();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!currentUser) return;

    const roleLower = currentUser.role?.toLowerCase();
    if (roleLower !== 'admin' && roleLower !== 'staff') return;

    console.log('App.tsx: Starting overdue check cycle for:', currentUser.role);

    // Run immediately on login
    checkAssetLoanOverdue(currentUser);

    // Then re-check every 5 minutes to catch newly overdue items
    const interval = setInterval(() => {
      console.log('App.tsx: Periodic overdue check...');
      checkAssetLoanOverdue(currentUser);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogin = async (email: string) => {
    console.log("App.tsx: Handling login for", email);
    try {
      // 1. Update timestamp first
      await supabase.from('user_accounts').update({ last_login: new Date().toISOString() }).eq('email', email);

      // 2. Then fetch
      const { data, error } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('App.tsx: SELECT user_accounts error:', error);
        throw error;
      }
      console.log("App.tsx: user_accounts query result:", data ? 'found' : 'not found');

      if (data) {
        const userProfile: UserAccount = {
          id: data.id,
          email: data.email,
          username: data.username,
          fullName: data.full_name,
          role: data.role,
          groups: data.groups || [],
          status: data.status,
          department: data.department,
          phone: data.phone,
          address: data.address,
          jobTitle: data.job_title,
          supervisorId: data.supervisor_id?.toString(),
          managerId: data.manager_id?.toString(),
          vpId: data.vp_id?.toString(),
          avatarUrl: data.avatar_url,
          company: data.company,
          lastLogin: data.last_login,
          isHelpdeskSupport: data.is_helpdesk_support,
          createdAt: data.created_at
        };

        // Load Google connection from Supabase safely
        if (data['google_access_token']) {
          localStorage.setItem('gcal_access_token', data['google_access_token']);
        }
        if (data['google_token_expiry']) {
          localStorage.setItem('gcal_token_expiry', data['google_token_expiry']);
        }
        if (data['google_connected_flag'] !== undefined && data['google_connected_flag'] !== null) {
          localStorage.setItem('google_connected_flag', String(data['google_connected_flag']));
        }

        setCurrentUser(userProfile);
        setIsAuthenticated(true);
      } else {
        // Auto-registration for missing internal accounts
        console.log("App.tsx: User not found in database, creating new account for", email);
        const { data: { session } } = await supabase.auth.getSession();
        const fullName = session?.user?.user_metadata?.full_name || email.split('@')[0];

        const { data: newUser, error: createError } = await supabase
          .from('user_accounts')
          .insert([{
            email: email,
            full_name: fullName,
            role: 'User',
            groups: ['user'],
            status: 'Active',
            department: 'Other',
            company: 'GESIT'
          }])
          .select()
          .single();

        if (createError) {
          console.error('App.tsx: Auto-registration failed:', createError);
          throw new Error(`Akun Anda tidak ditemukan di sistem. Hubungi administrator untuk mendaftarkan akun Anda. (${createError.message})`);
        }

        if (newUser) {
          const userProfile: UserAccount = {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.full_name,
            role: newUser.role,
            groups: newUser.groups || [],
            status: newUser.status,
            department: newUser.department,
            phone: newUser.phone,
            address: newUser.address,
            jobTitle: newUser.job_title,
            avatarUrl: newUser.avatar_url,
            company: newUser.company,
            isHelpdeskSupport: newUser.is_helpdesk_support
          };
          setCurrentUser(userProfile);
          setIsAuthenticated(true);
          showToast(t('welcomeAutoReg'), 'success');
        }
      }
    } catch (error: any) {
      console.error('Login error full:', error);
      showToast(error?.message || t('loginFailedAdmin'), 'error');
    }
  };

  const executeLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    }
    
    // Force clear local storage to prevent auto-login bug
    const theme = localStorage.getItem('theme');
    localStorage.clear();
    if (theme) localStorage.setItem('theme', theme);
    
    setIsAuthenticated(false);
    setCurrentUser(null);
    setIsLogoutModalOpen(false);
    navigate('/login', { replace: true });
  };

  const refreshUserProfile = async () => {
    if (currentUser?.email) {
      await handleLogin(currentUser.email);
    }
  };

  const handleGlobalShare = () => {
    const url = window.location.origin + '/directory';
    navigator.clipboard.writeText(url);
    showToast(t('linkCopied'), 'success');
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Active Session Registration & Revocation Enforcement
  useEffect(() => {
    if (!currentUser) return;

    let checkInterval: NodeJS.Timeout;

    const manageSession = async () => {
      let currentIp = '127.0.0.1';
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        currentIp = data.ip;
      } catch (err) {
        // Keep default
      }

      const ua = navigator.userAgent;
      let device = "Windows PC";
      if (ua.includes("Mac OS X")) device = "Macintosh (macOS)";
      else if (ua.includes("iPhone")) device = "iPhone (iOS)";
      else if (ua.includes("Android")) device = "Smartphone (Android)";
      else if (ua.includes("Linux")) device = "Linux PC";

      let browser = "Chrome";
      if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
      else if (ua.includes("Edg")) browser = "Edge";

      // Get or create device session token
      let token = localStorage.getItem('device_session_token');
      if (!token) {
        try {
          token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).substring(2)}${Date.now()}`;
        } catch (e) {
          token = `${Math.random().toString(36).substring(2)}${Date.now()}`;
        }
        localStorage.setItem('device_session_token', token);
      }

      try {
        // Register/update current session
        const { error: upsertError } = await supabase
          .from('user_sessions')
          .upsert({
            user_id: currentUser.id,
            device,
            browser,
            ip: currentIp,
            last_updated: new Date().toISOString(),
            session_token: token
          }, { onConflict: 'session_token' });

        if (upsertError) throw upsertError;

        // Periodic check to verify if the session still exists
        checkInterval = setInterval(async () => {
          const { data: sessionRows, error: checkError } = await supabase
            .from('user_sessions')
            .select('session_token')
            .eq('session_token', token);

          if (!checkError && sessionRows) {
            if (sessionRows.length === 0) {
              // The session has been revoked! Log out immediately.
              clearInterval(checkInterval);
              executeLogout();
              showToast("Session revoked from another device. Logging out...", "error");
            }
          }
        }, 10000); // Check every 10 seconds

      } catch (err: any) {
        console.log("Global session DB registration failed or table missing:", err?.message);
      }
    };

    manageSession();

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [currentUser]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <AnimatePresence mode="wait">
        {isCheckingSession ? (
          <SleekLoader />
        ) : (
          <motion.div
            key="app-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col min-h-screen"
          >
            <React.Suspense fallback={<SleekLoader />}>
              <Routes>
                {/* Public Routes - No Sidebar */}
                <Route path="/login" element={
                  <div className="h-screen w-full">
                    {!isAuthenticated ? (
                      <LoginPage
                        onLogin={handleLogin}
                        appName={appSettings.name}
                        logoUrl={appSettings.logo}
                        primaryColor={appSettings.primaryColor}
                      />
                    ) : <Navigate to="/" replace />}
                  </div>
                } />
                
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                
                {/* Consolidated Protected Routes - Single stable layout instance */}
                <Route path="/*" element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <TooltipProvider>
                      <SidebarProvider>
                        <DashboardLayout
                          appSettings={appSettings}
                          currentUser={currentUser}
                          groupDefinitions={groupDefinitions}
                          isMobileSidebarOpen={isMobileSidebarOpen}
                          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
                          isSidebarCollapsed={isSidebarCollapsed}
                          setIsSidebarCollapsed={setIsSidebarCollapsed}
                          setIsLogoutModalOpen={setIsLogoutModalOpen}
                          refreshUserProfile={refreshUserProfile}
                          floorFilter={globalFloorFilter}
                          onFloorFilterChange={setGlobalFloorFilter}
                          onShare={handleGlobalShare}
                        >
                          <Routes>
                             <Route index element={<CSLDashboard currentUser={currentUser} onNavigate={(v) => navigate(`/${v}`)} />} />
                            <Route path="profile" element={<ProfileView onLogout={() => setIsLogoutModalOpen(true)} user={currentUser} onUpdateSuccess={refreshUserProfile} />} />
                             {/* CSL ERP Routes */}
                             <Route path="csl-requests" element={<CSLRequestManager currentUser={currentUser} view="all" />} />
                             <Route path="csl-all-requests" element={<CSLRequestManager currentUser={currentUser} view="all" />} />
                             <Route path="csl-my-requests" element={<CSLRequestManager currentUser={currentUser} view="mine" />} />
                             <Route path="csl-my-tickets" element={<CSLRequestManager currentUser={currentUser} view="mine" />} />
                             <Route path="csl-categories" element={<CSLRequestManager currentUser={currentUser} view="categories" />} />
                             
                             {/* Routine Activity */}
                             <Route path="routine" element={<CSLRoutineManager currentUser={currentUser} view="monitoring" />} />
                             <Route path="routine-activity" element={<CSLRoutineManager currentUser={currentUser} view="activity" />} />
                             <Route path="routine-timeline" element={<CSLRoutineManager currentUser={currentUser} view="timeline" />} />
                             <Route path="routine-monitoring" element={<CSLRoutineManager currentUser={currentUser} view="monitoring" />} />
                             
                             {/* Task Management */}
                             <Route path="routine-task" element={<CSLTaskManager currentUser={currentUser} />} />

                             {/* Documents */}
                             <Route path="documents" element={<CSLDocumentsManager currentUser={currentUser} category="all" />} />
                             <Route path="documents-all" element={<CSLDocumentsManager currentUser={currentUser} category="all" />} />
                             <Route path="documents-agreement" element={<CSLDocumentsManager currentUser={currentUser} category="agreement" />} />
                             <Route path="documents-legal" element={<CSLDocumentsManager currentUser={currentUser} category="legal" />} />
                             <Route path="documents-gdrive" element={<CSLDocumentsManager currentUser={currentUser} category="gdrive" />} />

                             {/* Budget & Cost */}
                             <Route path="budget" element={<CSLBudgetManager currentUser={currentUser} view="expense" />} />
                             <Route path="budget-expense" element={<CSLBudgetManager currentUser={currentUser} view="expense" />} />

                             {/* Phone Directory */}
                             <Route path="directory" element={<CSLDirectoryManager currentUser={currentUser} category="all" />} />
                             <Route path="directory-all" element={<CSLDirectoryManager currentUser={currentUser} category="all" />} />
                             <Route path="directory-lawyer" element={<CSLDirectoryManager currentUser={currentUser} category="lawyer" />} />
                             <Route path="directory-vendor" element={<CSLDirectoryManager currentUser={currentUser} category="vendor" />} />
                             <Route path="directory-government" element={<CSLDirectoryManager currentUser={currentUser} category="government" />} />
                             <Route path="directory-other" element={<CSLDirectoryManager currentUser={currentUser} category="other" />} />

                             {/* Reports */}
                             <Route path="reports" element={<CSLReportsManager currentUser={currentUser} view="request" />} />
                             <Route path="reports-request" element={<CSLReportsManager currentUser={currentUser} view="request" />} />
                             <Route path="reports-task" element={<CSLReportsManager currentUser={currentUser} view="task" />} />
                             <Route path="reports-budget" element={<CSLReportsManager currentUser={currentUser} view="budget" />} />

                             {/* Settings */}
                             <Route path="settings" element={<CSLSettings currentUser={currentUser} view="categories" />} />
                             <Route path="settings-categories" element={<CSLSettings currentUser={currentUser} view="categories" />} />
                             <Route path="settings-sla" element={<CSLSettings currentUser={currentUser} view="sla" />} />
                             <Route path="settings-notifications" element={<CSLSettings currentUser={currentUser} view="notifications" />} />
                             <Route path="settings-users" element={<CSLSettings currentUser={currentUser} view="users" />} />
                             <Route path="settings-companies" element={<CSLSettings currentUser={currentUser} view="companies" />} />
                             <Route path="settings-departments" element={<CSLSettings currentUser={currentUser} view="departments" />} />
                             <Route path="settings-system" element={<CSLSettings currentUser={currentUser} view="system" />} />
                            
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </DashboardLayout>
                      </SidebarProvider>
                    </TooltipProvider>
                  </ProtectedRoute>
                } />
              </Routes>

                              <DangerConfirmModal
                  isOpen={isLogoutModalOpen}
                  onClose={() => setIsLogoutModalOpen(false)}
                  onConfirm={executeLogout}
                  title={t('signOutTitle')}
                  message={t('signOutMsg')}
                  variant="logout"
                />

              <AnimatePresence>
                {toast && (
                  <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
                  >
                    <div className="flex items-center gap-3 px-6 py-4 bg-slate-900/90 dark:bg-zinc-800/90 backdrop-blur-xl border border-white/10 dark:border-zinc-700/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] min-w-[320px]">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <X size={18} />}
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Notification</p>
                        <p className="text-[13px] font-bold text-white tracking-tight">{toast.message}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </React.Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </LanguageContext.Provider>
  );
};

// Wrapper Component to provide Router Context
const App: React.FC = () => {
  return (
    <Provider theme={defaultTheme} colorScheme="light">
      <ToastProvider>
        <InternalApp />
      </ToastProvider>
    </Provider>
  );
};

export default App;



const ProtectedRoute: React.FC<{ isAuthenticated: boolean; children: React.ReactNode }> = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const DashboardLayout: React.FC<any & { children?: React.ReactNode }> = ({
  appSettings, currentUser, groupDefinitions,
  isMobileSidebarOpen, setIsMobileSidebarOpen,
  isSidebarCollapsed, setIsSidebarCollapsed,
  setIsLogoutModalOpen, refreshUserProfile,
  floorFilter, onFloorFilterChange, onShare,
  children
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = currentUser?.role?.toLowerCase() || '';
  const groups = currentUser?.groups || [];
  const currentView = location.pathname.substring(1) || 'dashboard';
  const isITStaff = role.includes('admin') || groups.some(g => g.toLowerCase() === 'it' || g.toLowerCase().includes('support')) || currentUser?.isHelpdeskSupport === true;

  // Strict Access Control Logic
  const allowedMenuIds = React.useMemo(() => {
    const allowed = new Set<string>();
    const role = currentUser?.role?.toLowerCase() || '';

    // Admin/Super Admin bypass
    if (role.includes('admin')) {
      return null; // Null means all access
    }

    const userGroups = currentUser?.groups || [];
    if (!userGroups || userGroups.length === 0) {
      // Remove 'dashboard' from default allowed for regular users
      allowed.add('helpdesk');
      allowed.add('asset-loan');
      allowed.add('extension-directory');
      allowed.add('profile');
      return allowed;
    }

    userGroups.forEach(groupId => {
      const groupConfig = groupDefinitions?.find(g => g.id === groupId);
      if (groupConfig && Array.isArray(groupConfig.allowedMenus)) {
        groupConfig.allowedMenus.forEach(menuId => allowed.add(menuId));
      }
    });

    // Ensure parents are allowed if children are
    const allMenus = APP_MENU_STRUCTURE || [];
    allMenus.forEach(menu => {
      if (menu.parentId && allowed.has(menu.id)) {
        allowed.add(menu.parentId);
      }
    });

    return allowed;
  }, [currentUser, groupDefinitions]);

  // Effect to handle redirection for unauthorized access
  React.useEffect(() => {
    // Redirect users who don't have dashboard access to their default page
    if (currentView === 'dashboard' && allowedMenuIds !== null && !allowedMenuIds.has('dashboard')) {
      navigate('/csl-my-requests', { replace: true });
      return;
    }

    // Handle unauthorized routes
    if (allowedMenuIds && currentView !== 'profile') {
      if (!allowedMenuIds.has(currentView)) {
        console.warn(`Unauthorized access attempt to: /${currentView}. Redirecting.`);
        navigate(allowedMenuIds.has('dashboard') ? '/' : '/csl-my-requests', { replace: true });
      }
    }
  }, [allowedMenuIds, currentView, navigate]);

  return (
    <SidebarProvider>
      <CompleteProfileModal user={currentUser} onUpdateSuccess={refreshUserProfile} />
      <NavigationSidebar
        currentUser={currentUser}
        groupDefinitions={groupDefinitions}
        onLogout={() => setIsLogoutModalOpen(true)}
        onNavigate={(v) => navigate(`/${v}`)}
        appName={appSettings.name}
        logoUrl={appSettings.logo}
      />
      <SidebarInset>
        {/* Rest of the content */}
        <header className="bg-background/70 backdrop-blur-lg sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 px-4 border-b border-border/40 transition-all duration-300">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground/80 transition-all flex items-center justify-center border border-border/10">
              <PanelLeft size={16} strokeWidth={1.5} />
            </SidebarTrigger>
            <div className="h-4 w-[1px] bg-border/40 mx-1.5 hidden md:block" />
            <Breadcrumb className="hidden md:block">
              <BreadcrumbList className="gap-1.5">
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="text-[13px] font-medium text-muted-foreground/60 hover:text-foreground">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/30">
                  <ChevronRight size={13} />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[13px] font-medium capitalize text-foreground/80">{currentView.replace(/-/g, ' ')}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-1">
            <Header
              onLogout={() => setIsLogoutModalOpen(true)}
              onNavigate={(v) => navigate(`/${v}`)}
              currentView={currentView}
              userGroups={currentUser?.groups || []}
              userRole={currentUser?.role}
              groupDefinitions={groupDefinitions}
              user={currentUser ? {
                id: currentUser.id,
                name: currentUser.fullName,
                role: currentUser.role,
                email: currentUser.email,
                jobTitle: currentUser.jobTitle,
                avatarUrl: currentUser.avatarUrl
              } : undefined}
              appName={appSettings.name}
              logoUrl={appSettings.logo}
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <main className="flex-1 flex flex-col">
            <div className="flex-1 py-4 md:py-6 lg:py-8">
              <div className="w-full min-h-full">
                {children ? children : <Outlet />}
              </div>
            </div>
            <Footer />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

