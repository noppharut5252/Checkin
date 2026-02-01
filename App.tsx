
import React, { useEffect, useState, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { AlertTriangle, RefreshCw } from 'lucide-react';

import ActivityList from './components/ActivityList';
import VenuesView from './components/VenuesView';
import DocumentsView from './components/DocumentsView';
import PublicResultView from './components/PublicResultView';
import SummaryGenerator from './components/SummaryGenerator';
import UserManagement from './components/UserManagement';
import AnnouncementsView from './components/AnnouncementsView';
import PassportView from './components/PassportView';

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
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Use sessionStorage for pendingRedirect to survive LIFF redirects
  const getPendingRedirect = () => sessionStorage.getItem('pendingRedirect');
  const setPendingRedirect = (path: string | null) => {
      if (path) sessionStorage.setItem('pendingRedirect', path);
      else sessionStorage.removeItem('pendingRedirect');
  };

  // Helper to force hash update
  const performRedirect = () => {
      const redirect = getPendingRedirect();
      if (redirect) {
          console.log("Executing pending redirect:", redirect);
          setPendingRedirect(null);
          // Small delay to ensure Router is ready
          setTimeout(() => window.location.hash = redirect, 100);
      }
  };

  useEffect(() => {
      const initApp = async () => {
          setLoading(true);
          setError(null);

          // 1. Capture Hash immediately (before Router renders)
          const currentHash = window.location.hash;
          if (currentHash && currentHash !== '#/' && currentHash !== '#/home' && !currentHash.startsWith('#/login')) {
              // Decode URI to handle encoded characters in QR codes
              const path = decodeURIComponent(currentHash.substring(1));
              console.log("Deep link detected:", path);
              setPendingRedirect(path);
          }

          try {
              // 2. Parallel Load: Data & Auth
              
              const dataPromise = fetchData().catch(e => {
                  console.error("Data Load Error", e);
                  throw new Error("ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบอินเทอร์เน็ต");
              });

              const authPromise = (async () => {
                  // A. Check Local Storage
                  const savedUserStr = localStorage.getItem('comp_user');
                  if (savedUserStr) {
                      const u = JSON.parse(savedUserStr);
                      // Incomplete Check
                      if (!u.Name || !u.SchoolID) {
                          setUser(u);
                          setIsRegistering(true);
                          return;
                      }
                      
                      setUser(u);
                      
                      // Background Validation
                      if (u.LineID || u.userline_id) {
                          checkUserRegistration(u.LineID || u.userline_id).then(dbUser => {
                              if (!dbUser) {
                                  // User deleted remotely? Force re-register
                                  setUser({ ...u, Role: 'user' });
                                  setIsRegistering(true);
                                  localStorage.removeItem('comp_user');
                              } else if (JSON.stringify(u) !== JSON.stringify(dbUser)) {
                                  setUser(dbUser);
                                  localStorage.setItem('comp_user', JSON.stringify(dbUser));
                              }
                          }).catch(e => console.warn("Background Auth Check Failed", e));
                      }
                      
                      // CRITICAL: Trigger redirect check after restoring session
                      return true; // Signal success
                  }

                  // B. LIFF Init (if no local user)
                  try {
                      const profile = await initLiff();
                      if (profile) {
                          const dbUser = await checkUserRegistration(profile.userId);
                          if (dbUser) {
                              setUser(dbUser);
                              localStorage.setItem('comp_user', JSON.stringify(dbUser));
                              // CRITICAL: Trigger redirect check after LIFF login
                              return true;
                          } else {
                              // New User
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
                              setIsRegistering(true);
                          }
                      }
                  } catch (e) {
                      console.warn("LIFF Init Error", e);
                  }
                  return false;
              })();

              // Wait for both
              const [dataRes, authSuccess] = await Promise.all([dataPromise, authPromise]);
              if (dataRes) setData(dataRes);
              
              // Only stop loading after everything is done
              setLoading(false);

              // Perform redirect logic immediately after loading state clears
              if (authSuccess) {
                  setTimeout(performRedirect, 100); 
              }

          } catch (err: any) {
              setError(err.message || "เกิดข้อผิดพลาดในการโหลด");
              setLoading(false);
          }
      };

      initApp();
  }, []);

  const handleLogin = (u: User) => {
      setUser(u);
      setIsRegistering(false);
      localStorage.setItem('comp_user', JSON.stringify(u));
      
      // Check if we have a pending redirect first
      const redirect = getPendingRedirect();
      if (redirect) {
          performRedirect();
      } else {
          // Default to home if no redirect
          window.location.hash = '/home';
      }
  };

  const handleUpdateUser = (updatedUser: User) => {
      setUser(updatedUser);
      localStorage.setItem('comp_user', JSON.stringify(updatedUser));
      
      if (isRegistering && updatedUser.Name && updatedUser.SchoolID) {
          console.log("Registration complete.");
          setIsRegistering(false);
          performRedirect();
      }
  };

  if (loading) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
              <div className="flex flex-col items-center max-w-lg">
                <img 
                    src="https://raw.githubusercontent.com/noppharut5252/Checkin/refs/heads/main/logo/logo.gif" 
                    alt="Loading..." 
                    className="w-32 h-32 mb-6 object-contain"
                />
                <h3 className="text-gray-800 font-bold text-lg mb-2">กำลังโหลดข้อมูล...</h3>
                <p className="text-gray-500 text-xs leading-relaxed">
                    กิจกรรมการเรียนรู้ ภายใต้โครงการเสริมสร้างคุณธรรม จริยธรรมและธรรมาภิบาลในสถานศึกษา<br/>
                    และสำนักงานเขตพื้นที่การศึกษา (โครงการโรงเรียนสุจริต)<br/>
                    ประจำปีงบประมาณ พ.ศ. 2568 ระดับประเทศ
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

            <Route path="/login" element={<LoginScreen onLoginSuccess={handleLogin} />} />
            
            {/* Catch all - redirect based on auth */}
            <Route path="*" element={<Navigate to={isRegistering ? "/profile" : "/home"} replace />} />
        </Routes>
    </HashRouter>
  );
};

export default App;
