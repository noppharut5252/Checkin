
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import UserCheckInDashboard from './components/UserCheckInDashboard';
import CheckInHistory from './components/CheckInHistory';
import CheckInView from './components/CheckInView';
import ProfileView from './components/ProfileView';
import LoginScreen from './components/LoginScreen';
import AdminCheckInManager from './components/AdminCheckInManager';
import Dashboard from './components/Dashboard'; 
import SettingsView from './components/SettingsView'; 
import ActivityDetailView from './components/ActivityDetailView'; 
import { AppData, User } from './types';
import { fetchData, checkUserRegistration } from './services/api';
import { initLiff } from './services/liff';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';

import ActivityList from './components/ActivityList';
import VenuesView from './components/VenuesView';
import DocumentsView from './components/DocumentsView';
import PublicResultView from './components/PublicResultView';
import SummaryGenerator from './components/SummaryGenerator';
import UserManagement from './components/UserManagement';
import AnnouncementsView from './components/AnnouncementsView';
import PassportView from './components/PassportView';
import InstallGuideView from './components/InstallGuideView';

// --- Improved Redirect Handler ---
// Handles the navigation logic safely inside the Router context
const RedirectHandler = ({ target, onRedirectComplete }: { target: string | null, onRedirectComplete: () => void }) => {
    const navigate = useNavigate();
    
    useEffect(() => {
        if (target) {
            // Add a small delay to ensure Router is fully mounted and ready
            const timer = setTimeout(() => {
                console.log("Executing Deep Link Redirect to:", target);
                try {
                    navigate(decodeURIComponent(target), { replace: true });
                    onRedirectComplete(); // Clear the pending state only after navigation
                } catch (e) {
                    console.error("Navigation failed:", e);
                }
            }, 100); // 100ms delay to prevent race condition with initial render

            return () => clearTimeout(timer);
        }
    }, [target, navigate, onRedirectComplete]);
    
    return null;
};

const App: React.FC = () => {
  const [data, setData] = useState<AppData>({ 
      checkInLocations: [], 
      checkInActivities: [],
      activities: [],
      teams: [],
      schools: [],
      clusters: [],
      files: [],
      announcements: [],
      venues: [],
      judges: [],
      activityStatus: [],
      appConfig: undefined,
      passportConfig: undefined
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('กำลังเชื่อมต่อระบบ...'); // New state for progress text
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [initialRedirect, setInitialRedirect] = useState<string | null>(null);
  
  // Helper to manage session storage
  const getPendingRedirect = () => {
      try {
          return sessionStorage.getItem('pendingRedirect');
      } catch (e) { return null; }
  };
  
  const setPendingRedirect = (path: string | null) => {
      try {
          if (path) sessionStorage.setItem('pendingRedirect', path);
          else sessionStorage.removeItem('pendingRedirect');
      } catch (e) {}
  };

  // Helper to check if user info is complete (Includes LineID Check)
  const isUserComplete = (u: User) => {
      const hasLineID = !!(u.LineID || u.userline_id);
      const isAdmin = u.Role === 'admin' || u.level === 'admin';
      
      // Enforce LineID for non-admin users
      if (!isAdmin && !hasLineID) return false;
      
      // Enforce Name and SchoolID for everyone
      return !!(u.Name && u.SchoolID);
  };

  useEffect(() => {
      const initApp = async () => {
          setLoading(true);
          setError(null);
          setLoadingStep('กำลังตรวจสอบการเชื่อมต่อ...');

          // 1. Aggressive Hash Capture (Critical for QR Scans)
          const currentHash = window.location.hash;
          
          if (currentHash && 
              currentHash !== '#/' && 
              currentHash !== '#/home' && 
              !currentHash.startsWith('#/login') &&
              !currentHash.startsWith('#/profile') &&
              !currentHash.startsWith('#/install-guide')
          ) {
              const cleanPath = currentHash.substring(1); // Remove '#'
              console.log("Deep link detected on boot:", cleanPath);
              setPendingRedirect(cleanPath);
          }

          try {
              // 2. Parallel Load: Data & Auth
              setLoadingStep('กำลังดาวน์โหลดข้อมูลกิจกรรมและสถานที่...');
              const dataPromise = fetchData().catch(e => {
                  console.error("Data Load Error", e);
                  throw new Error("ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบอินเทอร์เน็ต");
              });

              // Modify authPromise to return the User object directly
              const authPromise = (async (): Promise<User | null> => {
                  // A. Check Local Storage first (Fastest)
                  const savedUserStr = localStorage.getItem('comp_user');
                  if (savedUserStr) {
                      try {
                          const u = JSON.parse(savedUserStr);
                          
                          // Check completeness (Name, School, and LineID)
                          if (!isUserComplete(u)) {
                              setUser(u);
                              setIsRegistering(true); // Force registration mode
                              return u; // Return user even if incomplete
                          }
                          
                          setUser(u);
                          
                          // Background Validation (Optimistic UI)
                          if (u.LineID || u.userline_id) {
                              checkUserRegistration(u.LineID || u.userline_id).then(dbUser => {
                                  if (!dbUser) {
                                      // User deleted remotely?
                                      setUser({ ...u, Role: 'user' });
                                      setIsRegistering(true);
                                      localStorage.removeItem('comp_user');
                                  } else if (JSON.stringify(u) !== JSON.stringify(dbUser)) {
                                      setUser(dbUser);
                                      localStorage.setItem('comp_user', JSON.stringify(dbUser));
                                  }
                              }).catch(e => console.warn("Background Auth Check Failed", e));
                          }
                          return u; // Signal success with user object
                      } catch (e) {
                          localStorage.removeItem('comp_user');
                      }
                  }

                  // B. LIFF Init (if no local user)
                  try {
                      setLoadingStep('กำลังตรวจสอบการเชื่อมต่อ LINE...');
                      const profile = await initLiff();
                      if (profile) {
                          setLoadingStep('ตรวจสอบข้อมูลสมาชิก...');
                          const dbUser = await checkUserRegistration(profile.userId);
                          if (dbUser) {
                              // Existing User
                              if (!isUserComplete(dbUser)) {
                                  setUser(dbUser);
                                  setIsRegistering(true);
                              } else {
                                  setUser(dbUser);
                                  localStorage.setItem('comp_user', JSON.stringify(dbUser));
                              }
                              return dbUser;
                          } else {
                              // New User Registration Flow
                              const partialUser: any = { 
                                   UserID: 'LIFF-' + profile.userId, 
                                   username: profile.displayName, 
                                   LineID: profile.userId, 
                                   PictureUrl: profile.pictureUrl,
                                   Role: 'user',
                                   Name: '', 
                                   Surname: '',
                                   Prefix: ''
                              };
                              setUser(partialUser);
                              setIsRegistering(true); // Force registration
                              return partialUser;
                          }
                      }
                  } catch (e) {
                      console.warn("LIFF Init Error", e);
                  }
                  return null;
              })();

              // Wait for essential promises
              const [dataRes, loadedUser] = await Promise.all([dataPromise, authPromise]);
              
              setLoadingStep('ประมวลผลข้อมูล...');
              if (dataRes) setData(dataRes);
              
              // 3. Finalize Navigation Logic
              const savedRedirect = getPendingRedirect();
              
              setLoadingStep('กำลังจัดเตรียมหน้าจอ...');
              // Correct Logic: Check 'loadedUser' (immediate value) instead of 'user' (stale state)
              if (savedRedirect) {
                  if (loadedUser && isUserComplete(loadedUser)) {
                      console.log("User complete, redirecting to:", savedRedirect);
                      setInitialRedirect(savedRedirect);
                  } else {
                      console.log("Pending redirect saved, waiting for registration/login completion...");
                  }
              }
              
              // Short delay to let user see "Ready" state
              setTimeout(() => setLoading(false), 500);

          } catch (err: any) {
              console.error("App Init Error:", err);
              setError(err.message || "เกิดข้อผิดพลาดในการโหลด");
              setLoading(false);
          }
      };

      initApp();
  }, []);

  const handleLogin = (u: User) => {
      setUser(u);
      localStorage.setItem('comp_user', JSON.stringify(u));
      
      const redirect = getPendingRedirect();

      // Check if profile is complete upon login
      if (isUserComplete(u)) {
          setIsRegistering(false);
          // If complete, allow redirect
          if (redirect) {
              setInitialRedirect(redirect);
          } else {
              setInitialRedirect('/home');
          }
      } else {
          // If incomplete, force registration (keep redirect pending)
          setIsRegistering(true);
      }
  };

  const handleUpdateUser = (updatedUser: User) => {
      setUser(updatedUser);
      localStorage.setItem('comp_user', JSON.stringify(updatedUser));
      
      // Check completeness to exit registration mode
      if (isRegistering && isUserComplete(updatedUser)) {
          setIsRegistering(false);
          
          // Check pending redirect AFTER registration is complete
          const redirect = getPendingRedirect();
          if (redirect) {
              console.log("Registration complete, redirecting to pending:", redirect);
              setInitialRedirect(redirect);
          } else {
              setInitialRedirect('/home');
          }
      }
  };

  // Clear pending redirect from session storage only when navigation actually happens
  const handleRedirectComplete = () => {
      setPendingRedirect(null);
      setInitialRedirect(null);
  };

  if (loading) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6 text-center animate-in fade-in">
              <div className="flex flex-col items-center max-w-lg w-full">
                <img 
                    src="https://raw.githubusercontent.com/noppharut5252/Checkin/refs/heads/main/logo/logo.gif" 
                    alt="Loading..." 
                    className="w-24 h-24 mb-6 object-contain"
                />
                <div className="flex items-center gap-2 text-gray-800 font-bold text-lg mb-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <h3>กำลังโหลดข้อมูล...</h3>
                </div>
                
                {/* Progress Step Indicator */}
                <div className="w-full max-w-xs bg-white rounded-xl p-3 border border-blue-100 shadow-sm flex items-center justify-center min-h-[50px]">
                    <p className="text-blue-600 text-sm font-medium animate-pulse transition-all duration-300">
                        {loadingStep}
                    </p>
                </div>
                
                <p className="text-gray-400 text-xs mt-4">
                    UprightSchool System v1.0.2
                </p>
              </div>
          </div>
      );
  }

  if (error) {
      return (
          <div className="flex items-center justify-center h-screen bg-gray-50 p-6">
              <div className="flex flex-col items-center text-center max-w-sm">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h3>
                <p className="text-gray-500 mb-6">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                >
                    <RefreshCw className="w-5 h-5 mr-2" /> ลองใหม่อีกครั้ง
                </button>
              </div>
          </div>
      );
  }
  
  return (
    <HashRouter>
        {/* Handle imperative redirects from state inside Router context */}
        {initialRedirect && (
            <RedirectHandler target={initialRedirect} onRedirectComplete={handleRedirectComplete} />
        )}
        
        <Routes>
            <Route path="/" element={<Navigate to={isRegistering ? "/profile" : "/home"} replace />} />

            {/* Force profile for registration (Catch ALL if registering) */}
            {isRegistering && (
                <Route path="*" element={
                    <Layout userProfile={user} data={data}>
                        <ProfileView user={user!} data={data} onUpdateUser={handleUpdateUser} isRegistrationMode={true} />
                    </Layout>
                } />
            )}

            <Route path="/home" element={
                <Layout userProfile={user} data={data}>
                    <Dashboard data={data} user={user} />
                </Layout>
            } />

            <Route path="/checkin-dashboard" element={
                <Layout userProfile={user} data={data}>
                    {user && !isRegistering ? (
                        user.Role === 'admin' ? 
                        <AdminCheckInManager data={data} user={user} onDataUpdate={() => window.location.reload()} /> : 
                        <UserCheckInDashboard data={data} user={user} />
                    ) : <LoginScreen onLoginSuccess={handleLogin} />}
                </Layout>
            } />
            
            <Route path="/passport" element={
                <Layout userProfile={user} data={data}>
                    {user && !isRegistering ? <PassportView data={data} user={user} /> : <Navigate to="/login" replace />}
                </Layout>
            } />

            <Route path="/activities" element={
                <Layout userProfile={user} data={data}>
                    <ActivityList data={data} />
                </Layout>
            } />

            <Route path="/venues" element={
                <Layout userProfile={user} data={data}>
                    <VenuesView data={data} user={user} />
                </Layout>
            } />

            <Route path="/settings" element={
                <Layout userProfile={user} data={data}>
                    <SettingsView data={data} user={user} onDataUpdate={() => window.location.reload()} />
                </Layout>
            } />

            <Route path="/users" element={
                <Layout userProfile={user} data={data}>
                    <UserManagement data={data} currentUser={user} />
                </Layout>
            } />

            <Route path="/announcements" element={
                <Layout userProfile={user} data={data}>
                    <AnnouncementsView data={data} user={user} onDataUpdate={() => {}} />
                </Layout>
            } />

            <Route path="/activity-dashboard/:activityId" element={
                <Layout userProfile={user} data={data}>
                    <ActivityDetailView data={data} user={user} onDataUpdate={() => {}} />
                </Layout>
            } />

            {/* Check-in route protected: Redirect to Login if no user */}
            <Route path="/checkin/:activityId" element={
                user && !isRegistering ? (
                    <CheckInView data={data} user={user} />
                ) : <Navigate to="/login" replace />
            } />

            <Route path="/profile" element={
                <Layout userProfile={user} data={data}>
                    {user ? <ProfileView user={user} data={data} onUpdateUser={handleUpdateUser} isRegistrationMode={isRegistering} /> : <Navigate to="/home" replace />}
                </Layout>
            } />
            
            <Route path="/documents" element={<Layout userProfile={user} data={data}><DocumentsView data={data} type="certificate" user={user} /></Layout>} />
            <Route path="/certificates" element={<Layout userProfile={user} data={data}><DocumentsView data={data} type="certificate" user={user} /></Layout>} />
            <Route path="/idcards" element={<Layout userProfile={user} data={data}><DocumentsView data={data} type="idcard" user={user} /></Layout>} />
            <Route path="/share-result" element={<PublicResultView data={data} />} />
            <Route path="/summary" element={<Layout userProfile={user} data={data}><SummaryGenerator data={data} user={user} /></Layout>} />
            <Route path="/install-guide" element={<InstallGuideView />} />

            <Route path="/login" element={
                isRegistering ? <Navigate to="/profile" replace /> : <LoginScreen onLoginSuccess={handleLogin} />
            } />
            
            {/* Catch all - redirect based on auth */}
            <Route path="*" element={<Navigate to={isRegistering ? "/profile" : "/home"} replace />} />
        </Routes>
    </HashRouter>
  );
};

export default App;
