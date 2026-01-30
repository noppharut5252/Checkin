
import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, AppData, AppConfig } from '../types';
import { 
    LayoutDashboard, MapPin, Users, Trophy, Edit3, Award, Printer, 
    FileBadge, IdCard, Gavel, Megaphone, School, UserCog, LogOut, 
    Menu, X, UserCircle, LogIn, ChevronRight, ChevronLeft, Settings, BrainCircuit, MonitorPlay, GraduationCap, Map, ScanLine, QrCode, ShieldCheck
} from 'lucide-react';
import { logoutLiff } from '../services/liff';
import QRScannerModal from './QRScannerModal';

interface LayoutProps {
  children: React.ReactNode;
  userProfile?: User | null;
  data: AppData;
}

const Layout: React.FC<LayoutProps> = ({ children, userProfile, data }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Global Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const role = userProfile?.level?.toLowerCase() || 'guest';
  const isAdminOrArea = role === 'admin' || role === 'area';
  const isLoggedIn = !!userProfile;

  const config: AppConfig = data.appConfig || {};

  const allMenuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/home', alwaysVisible: true },
      { id: 'passport', label: 'Digital Passport', icon: ShieldCheck, path: '/passport', configKey: 'menu_passport' },
      { id: 'live', label: 'Live Score', icon: MonitorPlay, path: '/live', configKey: 'menu_live' },
      { id: 'teams', label: 'ทีมแข่งขัน', icon: Users, path: '/teams', configKey: 'menu_teams' },
      { id: 'venues', label: 'สนาม/วันแข่ง', icon: MapPin, path: '/venues', configKey: 'menu_venues' },
      { id: 'activities', label: 'รายการแข่งขัน', icon: Trophy, path: '/activities', configKey: 'menu_activities' },
      { id: 'score', label: 'บันทึกคะแนน', icon: Edit3, path: '/score', configKey: 'menu_score', restricted: true }, 
      { id: 'results', label: 'ผลการแข่งขัน', icon: Award, path: '/results', configKey: 'menu_results' },
      { id: 'documents', label: 'เอกสาร/พิมพ์', icon: Printer, path: '/documents', configKey: 'menu_documents' },
      { id: 'certificates', label: 'เกียรติบัตร', icon: FileBadge, path: '/certificates', configKey: 'menu_certificates' },
      { id: 'judge_certs', label: 'เกียรติบัตร กก.', icon: GraduationCap, path: '/judge-certificates', configKey: 'menu_judge_certificates' },
      { id: 'idcards', label: 'บัตรประจำตัว', icon: IdCard, path: '/idcards', configKey: 'menu_idcards' },
      { id: 'judges', label: 'ทำเนียบกรรมการ', icon: Gavel, path: '/judges', configKey: 'menu_judges' },
      { id: 'announcements', label: 'ข่าว/คู่มือ', icon: Megaphone, path: '/announcements', configKey: 'menu_announcements' },
      { id: 'schools', label: 'โรงเรียน', icon: School, path: '/schools', configKey: 'menu_schools' },
      // Strict Admin Only for Users Menu
      { id: 'users', label: 'ผู้ใช้งาน', icon: UserCog, path: '/users', configKey: 'menu_users', strictAdmin: true },
      { id: 'summary', label: 'Smart Summary', icon: BrainCircuit, path: '/summary', configKey: 'menu_summary', restricted: true },
      { id: 'checkin_mgr', label: 'จัดการจุดเช็คอิน', icon: Map, path: '/checkin-dashboard', adminOnly: true, configKey: 'menu_checkin_mgr' },
      { id: 'checkin', label: 'รายการเช็คอิน', icon: MapPin, path: '/checkin-dashboard', mobileOnly: true }, 
      { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings, path: '/settings', adminOnly: true }
  ];

  const visibleMenu = useMemo(() => {
      return allMenuItems.filter(item => {
          // Strict Admin Check overrides isAdminOrArea
          // @ts-ignore
          if (item.strictAdmin && role !== 'admin') return false;

          if (isAdminOrArea) return true;
          
          // Specific Role Check
          // @ts-ignore
          if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
          
          if (item.adminOnly && !isAdminOrArea) return false;
          if (item.configKey && config[item.configKey] === false) return false;
          return true;
      });
  }, [isAdminOrArea, role, config]);

  // Split Mobile Nav Items for Layout (2 Left, Center Button, 2 Right)
  // Updated: Changed "Checkin" to "Menu" to restore functionality
  const mobileNavItems: { id: string; label: string; icon: any; path?: string; action?: () => void }[] = [
      { id: 'home', label: 'หน้าแรก', icon: LayoutDashboard, path: '/home' },
      { id: 'menu', label: 'เมนู', icon: Menu, action: () => setIsSidebarOpen(true) },
      // CENTER SCAN BUTTON HERE
      { id: 'passport', label: 'Passport', icon: ShieldCheck, path: '/passport' },
      { id: 'profile', label: 'บัญชี', icon: UserCircle, path: '/profile' }
  ];

  const handleNav = (path: string) => {
      navigate(path);
      setIsSidebarOpen(false);
  };

  const handleLogout = () => {
      localStorage.removeItem('comp_user');
      logoutLiff();
      window.location.reload();
  };

  const handleScanResult = (code: string) => {
      setIsScannerOpen(false);
      let activityId = code;
      
      // Support URL scanning
      if (code.includes('/checkin/')) {
          const parts = code.split('/checkin/');
          if (parts.length > 1) {
              activityId = parts[1].split('?')[0]; 
          }
      }
      
      // Navigate to check-in view
      navigate(`/checkin/${activityId}`);
  };

  const currentPath = location.pathname;

  return (
    <div className="flex h-screen bg-gray-50 font-kanit overflow-hidden">
        
        {/* Global Scanner Modal */}
        <QRScannerModal 
            isOpen={isScannerOpen} 
            onClose={() => setIsScannerOpen(false)} 
            onScan={handleScanResult} 
        />

        {/* --- Sidebar (Desktop) --- */}
        <aside className={`hidden md:flex bg-white border-r border-gray-200 flex-col shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`h-16 flex items-center px-4 border-b border-gray-100 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
                    <div className="bg-blue-50 p-1.5 rounded-lg shrink-0 border border-blue-100">
                        <img 
                            src="https://raw.githubusercontent.com/noppharut5252/Checkin/refs/heads/main/logo/logo.png" 
                            className="w-6 h-6 object-contain"
                            alt="Logo"
                        />
                    </div>
                    {!isCollapsed && <span className="font-bold text-gray-800 text-lg tracking-tight ml-3 truncate">UprightSchool</span>}
                </div>
                {!isCollapsed && (
                    <button onClick={() => setIsCollapsed(true)} className="text-gray-400 hover:text-gray-600">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}
            </div>
            
            {isCollapsed && (
                <div className="flex justify-center py-2 border-b border-gray-50">
                    <button onClick={() => setIsCollapsed(false)} className="text-gray-400 hover:text-gray-600">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                {visibleMenu.filter(m => !m.mobileOnly).map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleNav(item.path)}
                        className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${currentPath.startsWith(item.path) ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'} ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? item.label : ''}
                    >
                        <item.icon className={`w-5 h-5 shrink-0 ${currentPath.startsWith(item.path) ? 'text-blue-600' : 'text-gray-400'} ${!isCollapsed ? 'mr-3' : ''}`} />
                        {!isCollapsed && (
                            <>
                                <span className="truncate">{item.label}</span>
                                {currentPath.startsWith(item.path) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
                            </>
                        )}
                        
                        {/* Tooltip for collapsed mode */}
                        {isCollapsed && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                {item.label}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="p-4 border-t border-gray-100">
                {isLoggedIn ? (
                    <div className={`flex items-center gap-3 p-2 rounded-xl bg-gray-50 border border-gray-100 ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                            {userProfile.PictureUrl || userProfile.pictureUrl ? (
                                <img src={userProfile.PictureUrl || userProfile.pictureUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <UserCircle className="w-6 h-6 text-gray-400" />
                            )}
                        </div>
                        {!isCollapsed && (
                            <>
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleNav('/profile')}>
                                    <p className="text-sm font-bold text-gray-800 truncate">{userProfile.Name || userProfile.displayName}</p>
                                    <p className="text-xs text-gray-500 truncate capitalize">{userProfile.Role || userProfile.level}</p>
                                </div>
                                <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <button onClick={() => navigate('/login')} className={`w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow hover:bg-blue-700 flex items-center justify-center ${isCollapsed ? 'px-0' : ''}`}>
                        <LogIn className={`w-4 h-4 ${!isCollapsed ? 'mr-2' : ''}`} /> {!isCollapsed && 'เข้าสู่ระบบ'}
                    </button>
                )}
            </div>
        </aside>

        {/* --- Mobile Sidebar Overlay (Bottom Sheet) --- */}
        {isSidebarOpen && (
            <div className="fixed inset-0 z-[60] md:hidden">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
                <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                    
                    {/* Handle Bar */}
                    <div className="flex justify-center pt-3 pb-1" onClick={() => setIsSidebarOpen(false)}>
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                    </div>

                    <div className="h-14 flex items-center justify-between px-6 border-b border-gray-100">
                        <span className="font-bold text-gray-800 text-lg">เมนูหลัก</span>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X className="w-5 h-5" /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-1">
                        {visibleMenu.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleNav(item.path)}
                                className={`w-full flex items-center px-4 py-3.5 rounded-2xl text-sm font-medium transition-all ${currentPath.startsWith(item.path) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <div className={`p-2 rounded-xl mr-3 ${currentPath.startsWith(item.path) ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                                    <item.icon className={`w-5 h-5 ${currentPath.startsWith(item.path) ? 'text-blue-600' : 'text-gray-500'}`} />
                                </div>
                                {item.label}
                                <ChevronRight className="w-4 h-4 ml-auto text-gray-300" />
                            </button>
                        ))}
                    </div>
                    
                    <div className="p-4 bg-gray-50 border-t border-gray-100 pb-safe">
                        {isLoggedIn ? (
                            <button onClick={handleLogout} className="w-full py-3 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-bold flex items-center justify-center shadow-sm active:scale-95 transition-transform">
                                <LogOut className="w-4 h-4 mr-2" /> ออกจากระบบ
                            </button>
                        ) : (
                            <button onClick={() => handleNav('/login')} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center justify-center shadow-md active:scale-95 transition-transform">
                                <LogIn className="w-4 h-4 mr-2" /> เข้าสู่ระบบ
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* --- Main Content --- */}
        <main className="flex-1 flex flex-col min-w-0 bg-gray-50 relative">
            
            {/* Mobile Header */}
            <header className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <img 
                        src="https://raw.githubusercontent.com/noppharut5252/Checkin/refs/heads/main/logo/logo.png" 
                        className="w-7 h-7 object-contain"
                        alt="Logo"
                    />
                    <span className="font-bold text-gray-800">UprightSchool</span>
                </div>
                {isLoggedIn ? (
                    <div className="flex items-center gap-3">
                        <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 p-1">
                            <LogOut className="w-5 h-5" />
                        </button>
                        <div onClick={() => handleNav('/profile')} className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-100 shadow-sm cursor-pointer">
                            <img src={userProfile?.PictureUrl || userProfile?.pictureUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} className="w-full h-full object-cover" />
                        </div>
                    </div>
                ) : (
                    <button onClick={() => handleNav('/login')} className="text-blue-600 font-bold text-sm">เข้าสู่ระบบ</button>
                )}
            </header>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                <div className="max-w-6xl mx-auto w-full">
                    {children}
                </div>
            </div>

            {/* Mobile Bottom Navigation (Updated with Floating Button) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="relative flex justify-between items-center h-16 px-1">
                    
                    {/* Floating Center Button */}
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-50">
                        <button 
                            onClick={() => setIsScannerOpen(true)}
                            className="bg-blue-600 text-white p-4 rounded-full shadow-lg border-4 border-gray-50 hover:bg-blue-700 active:scale-95 transition-all flex flex-col items-center justify-center group"
                        >
                            <ScanLine className="w-7 h-7" />
                        </button>
                    </div>

                    {/* Left Items */}
                    <div className="flex flex-1 justify-around">
                        {mobileNavItems.slice(0, 2).map((item) => (
                            <button
                                key={item.id}
                                onClick={() => item.action ? item.action() : handleNav(item.path!)}
                                className="flex flex-col items-center justify-center w-full h-full relative group pt-1"
                            >
                                <div className={`p-1 rounded-xl transition-all ${item.path && currentPath === item.path ? 'text-blue-600 -translate-y-1' : 'text-gray-400'}`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <span className={`text-[10px] font-medium transition-colors ${item.path && currentPath === item.path ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Spacer for Center Button */}
                    <div className="w-16 shrink-0"></div>

                    {/* Right Items */}
                    <div className="flex flex-1 justify-around">
                        {mobileNavItems.slice(2, 4).map((item) => (
                            <button
                                key={item.id}
                                onClick={() => item.action ? item.action() : handleNav(item.path!)}
                                className="flex flex-col items-center justify-center w-full h-full relative group pt-1"
                            >
                                <div className={`p-1 rounded-xl transition-all ${item.path && currentPath === item.path ? 'text-blue-600 -translate-y-1' : 'text-gray-400'}`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <span className={`text-[10px] font-medium transition-colors ${item.path && currentPath === item.path ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>

                </div>
            </div>
        </main>
    </div>
  );
};

export default Layout;
