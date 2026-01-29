
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, User, CheckInActivity, CheckInLocation } from '../types';
import { 
    Users, MapPin, Clock, Activity, 
    BarChart3, TrendingUp, Search, PlayCircle, LogIn, ArrowRight,
    Megaphone, FileText, Calendar, Filter, Timer, ChevronLeft, ChevronRight,
    Navigation, ImageIcon, X, Map as MapIcon, List, ScanLine, QrCode, CheckSquare, Sparkles, Building, Layers
} from 'lucide-react';
import StatCard from './StatCard';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import QRScannerModal from './QRScannerModal';

interface DashboardProps {
  data: AppData;
  user?: User | null;
}

// Helper for Image URLs (Moved outside to be reusable or inside component)
const getImageUrl = (idOrUrl?: string) => {
    if (!idOrUrl) return '';
    if (idOrUrl.startsWith('http')) return idOrUrl;
    return `https://drive.google.com/thumbnail?id=${idOrUrl}&sz=w1000`;
};

// --- Internal Component: Countdown Badge ---
const CountdownBadge: React.FC<{ startDateTime?: string }> = ({ startDateTime }) => {
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    useEffect(() => {
        if (!startDateTime) return;
        
        const calculate = () => {
            const now = new Date().getTime();
            const start = new Date(startDateTime).getTime();
            
            if (isNaN(start)) return;

            const diff = start - now;

            if (diff <= 0) {
                setTimeLeft(null); 
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
                setTimeLeft(`อีก ${days} วัน ${hours} ชม.`);
            } else {
                setTimeLeft(`อีก ${hours} ชม. ${minutes} นาที`);
            }
        };

        calculate();
        const timer = setInterval(calculate, 60000); 
        return () => clearInterval(timer);
    }, [startDateTime]);

    if (!timeLeft) return null;

    return (
        <div className="absolute top-2 left-2 z-20 bg-blue-600/90 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-bold shadow-sm flex items-center animate-in fade-in border border-blue-400/30">
            <Timer className="w-3 h-3 mr-1" />
            {timeLeft}
        </div>
    );
};

// --- Internal Component: Location Modal (Improved with Gallery) ---
const LocationModal: React.FC<{ location: CheckInLocation | null, isOpen: boolean, onClose: () => void }> = ({ location, isOpen, onClose }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // Derived images array
    const images = useMemo(() => {
        if (!location) return [];
        let imgs: string[] = [];
        // Try parsing JSON array
        try {
            if (location.Images) {
                imgs = JSON.parse(location.Images);
            }
        } catch(e) {}
        
        // Fallback to legacy single image if no array
        if (imgs.length === 0 && location.Image) {
            imgs.push(location.Image);
        }
        return imgs;
    }, [location]);

    useEffect(() => {
        setCurrentImageIndex(0); // Reset index on open
    }, [location]);

    if (!isOpen || !location) return null;

    const nextImage = () => {
        setCurrentImageIndex(prev => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Image Gallery */}
                <div className="relative h-64 bg-gray-900 shrink-0 group">
                    {images.length > 0 ? (
                        <img 
                            src={getImageUrl(images[currentImageIndex])} 
                            alt={location.Name} 
                            className="w-full h-full object-cover transition-opacity duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                            <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                            <span className="text-xs">ไม่มีรูปภาพสถานที่</span>
                        </div>
                    )}
                    
                    {/* Navigation Controls */}
                    {images.length > 1 && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            {/* Dots */}
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                                {images.map((_, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`w-1.5 h-1.5 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    <button 
                        onClick={onClose}
                        className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-colors z-20"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-gray-800 shadow-sm flex items-center max-w-[80%]">
                        <MapPin className="w-3 h-3 mr-1 text-red-500 shrink-0" /> <span className="truncate">{location.Name}</span>
                    </div>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Floor / Room Info */}
                    {(location.Floor || location.Room) && (
                        <div className="flex gap-4 mb-4">
                            {location.Floor && (
                                <div className="flex items-center text-sm font-medium text-gray-700 bg-orange-50 px-3 py-2 rounded-lg border border-orange-100 flex-1">
                                    <Layers className="w-4 h-4 mr-2 text-orange-500"/> 
                                    ชั้น: {location.Floor}
                                </div>
                            )}
                            {location.Room && (
                                <div className="flex items-center text-sm font-medium text-gray-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 flex-1">
                                    <Building className="w-4 h-4 mr-2 text-blue-500"/> 
                                    ห้อง: {location.Room}
                                </div>
                            )}
                        </div>
                    )}

                    <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                        <Navigation className="w-5 h-5 mr-2 text-blue-600" /> 
                        ข้อมูลการเดินทาง / จุดสังเกต
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                        {location.Description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span>พิกัด GPS:</span>
                        <span className="font-mono">{parseFloat(location.Latitude).toFixed(5)}, {parseFloat(location.Longitude).toFixed(5)}</span>
                    </div>

                    <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${location.Latitude},${location.Longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center active:scale-95"
                    >
                        <Navigation className="w-5 h-5 mr-2" /> นำทางด้วย Google Maps
                    </a>
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ data, user }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');
  const [locationFilter, setLocationFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4); 

  // Location Modal
  const [selectedLocation, setSelectedLocation] = useState<CheckInLocation | null>(null);
  
  // Scanner Modal (User View)
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Role Check
  const role = user?.level?.toLowerCase() || 'guest';
  const isAdmin = role === 'admin' || role === 'area' || role === 'group_admin';

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, statusFilter, locationFilter, itemsPerPage]);

  const isDateValid = (d: any) => d && !isNaN(new Date(d).getTime());

  const getActivityStatus = (act: CheckInActivity) => {
      const now = new Date();
      const start = isDateValid(act.StartDateTime) ? new Date(act.StartDateTime!) : null;
      const end = isDateValid(act.EndDateTime) ? new Date(act.EndDateTime!) : null;
      const count = act.CurrentCount || 0;
      const cap = act.Capacity || 0;

      if (start && start > now) return { label: 'ยังไม่เริ่ม', color: 'bg-blue-100 text-blue-700', key: 'upcoming' };
      if (end && end < now) return { label: 'จบแล้ว', color: 'bg-gray-100 text-gray-500', key: 'ended' };
      if (cap > 0 && count >= cap) return { label: 'เต็ม', color: 'bg-red-100 text-red-700', key: 'active' }; 
      return { label: 'กำลังดำเนินอยู่', color: 'bg-green-100 text-green-700', key: 'active' };
  };

  const getDateDisplay = (startStr?: string, endStr?: string) => {
      const start = isDateValid(startStr) ? new Date(startStr!) : null;
      const end = isDateValid(endStr) ? new Date(endStr!) : null;

      if (!start) return 'ไม่ระบุเวลา';
      
      // Simple format
      const sDate = start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      const sTime = start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      
      if (!end) return `${sDate} ${sTime}`;
      const eTime = end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      
      return `${sDate} | ${sTime}-${eTime}`;
  };

  // --- Statistics (Admin Only) ---
  const stats = useMemo(() => {
      const activities = data.checkInActivities || [];
      const totalActivities = activities.length;
      const totalLocations = data.checkInLocations?.length || 0;
      const totalCheckIns = activities.reduce((acc, act) => acc + (act.CurrentCount || 0), 0);
      const totalCapacity = activities.reduce((acc, act) => acc + (act.Capacity || 0), 0);
      const activeActivities = activities.filter(a => getActivityStatus(a).key === 'active').length;

      const chartData = activities
          .sort((a, b) => (b.CurrentCount || 0) - (a.CurrentCount || 0))
          .slice(0, 5)
          .map(a => ({
              name: (a.Name || '').length > 15 ? (a.Name || '').substring(0, 15) + '...' : (a.Name || ''),
              full_name: a.Name || '',
              count: a.CurrentCount || 0
          }));

      return { totalActivities, totalLocations, totalCheckIns, totalCapacity, activeActivities, chartData };
  }, [data.checkInActivities, data.checkInLocations]);

  // --- Filtering Logic ---
  const filteredActivities = useMemo(() => {
      let filtered = (data.checkInActivities || []).filter(act => {
          const matchesSearch = (act.Name || '').toLowerCase().includes(searchTerm.toLowerCase());
          const status = getActivityStatus(act);
          const matchesStatus = statusFilter === 'all' || status.key === statusFilter;
          const matchesLocation = locationFilter === 'all' || act.LocationID === locationFilter;
          return matchesSearch && matchesStatus && matchesLocation;
      });

      filtered.sort((a, b) => {
          const statusA = getActivityStatus(a);
          const statusB = getActivityStatus(b);
          const getPriority = (key: string) => {
              if (key === 'active') return 1;
              if (key === 'upcoming') return 2;
              return 3; 
          };
          const pA = getPriority(statusA.key);
          const pB = getPriority(statusB.key);
          if (pA !== pB) return pA - pB;
          
          if (pA === 1) { // Active -> End Date Asc
             const endA = a.EndDateTime ? new Date(a.EndDateTime).getTime() : Infinity;
             const endB = b.EndDateTime ? new Date(b.EndDateTime).getTime() : Infinity;
             return endA - endB;
          }
          if (pA === 2) { // Upcoming -> Start Date Asc
             const startA = a.StartDateTime ? new Date(a.StartDateTime).getTime() : Infinity;
             const startB = b.StartDateTime ? new Date(b.StartDateTime).getTime() : Infinity;
             return startA - startB;
          }
          return 0;
      });
      return filtered;
  }, [data.checkInActivities, searchTerm, statusFilter, locationFilter]);

  // --- My Activities (User Only) ---
  const myActivities = useMemo(() => {
      if (!user || !user.assignedActivities || user.assignedActivities.length === 0) return [];
      return data.checkInActivities.filter(act => user.assignedActivities?.includes(act.ActivityID));
  }, [user, data.checkInActivities]);

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const paginatedActivities = filteredActivities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const recentAnnouncements = useMemo(() => {
      return (data.announcements || [])
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3);
  }, [data.announcements]);

  const getPercentage = (current: number, max: number) => {
      if (!max || max === 0) return 0;
      return Math.min(100, Math.round((current / max) * 100));
  };

  const handleScanResult = (code: string) => {
      setIsScannerOpen(false);
      let activityId = code;
      if (code.includes('/checkin/')) {
          const parts = code.split('/checkin/');
          if (parts.length > 1) activityId = parts[1].split('?')[0]; 
      }
      navigate(`/checkin/${activityId}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
        
        <LocationModal 
            location={selectedLocation} 
            isOpen={!!selectedLocation} 
            onClose={() => setSelectedLocation(null)} 
        />

        <QRScannerModal 
            isOpen={isScannerOpen} 
            onClose={() => setIsScannerOpen(false)} 
            onScan={handleScanResult} 
        />

        {/* --- Header Section (Both Views) --- */}
        <div className={`rounded-3xl p-8 text-white shadow-xl relative overflow-hidden ${isAdmin ? 'bg-gradient-to-r from-slate-700 to-slate-900' : 'bg-gradient-to-r from-blue-600 to-indigo-700'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-10 -translate-y-10">
                <Activity className="w-64 h-64" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        {user ? (
                            <img src={user.PictureUrl || `https://ui-avatars.com/api/?name=${user.Name}&background=random`} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <Activity className="w-8 h-8 text-white" />
                        )}
                    </div>
                    <span className="font-medium text-white/90">
                        {user ? `สวัสดี, ${user.Name}` : 'ยินดีต้อนรับสู่ระบบเช็คอิน'}
                    </span>
                </div>
                <h1 className="text-3xl font-bold mb-2">
                    {isAdmin ? 'Admin Dashboard' : 'Activity Dashboard'}
                </h1>
                <p className="text-blue-100 max-w-xl text-lg mb-6">
                    {isAdmin ? 'ภาพรวมสถิติและการจัดการระบบเช็คอิน' : 'ค้นหากิจกรรมและเช็คอินเข้าร่วมงาน'}
                </p>
                
                {/* User Actions */}
                {!isAdmin && (
                    <div className="flex flex-wrap gap-3">
                        {user ? (
                            <button 
                                onClick={() => setIsScannerOpen(true)}
                                className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-50 transition-all flex items-center active:scale-95"
                            >
                                <ScanLine className="w-5 h-5 mr-2" /> สแกนเช็คอิน (QR)
                            </button>
                        ) : (
                            <button 
                                onClick={() => navigate('/login')}
                                className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/30 transition-all flex items-center"
                            >
                                <LogIn className="w-5 h-5 mr-2" /> เข้าสู่ระบบ
                            </button>
                        )}
                    </div>
                )}

                {/* Admin Actions */}
                {isAdmin && (
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => navigate('/checkin-dashboard')} className="bg-white text-slate-800 px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-slate-50 transition-all flex items-center text-sm">
                            <MapIcon className="w-4 h-4 mr-2" /> จัดการสถานที่/กิจกรรม
                        </button>
                        <button onClick={() => navigate('/users')} className="bg-white/10 text-white border border-white/20 px-5 py-2.5 rounded-xl font-bold hover:bg-white/20 transition-all flex items-center text-sm">
                            <Users className="w-4 h-4 mr-2" /> จัดการผู้ใช้
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* --- Admin View: Stats & Charts --- */}
        {isAdmin && (
            <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="เช็คอินแล้ว" value={stats.totalCheckIns.toLocaleString()} icon={Users} colorClass="bg-green-500" description={`จากความจุ ${stats.totalCapacity}`} />
                    <StatCard title="กิจกรรม Active" value={stats.activeActivities} icon={Activity} colorClass="bg-blue-500" description={`รวม ${stats.totalActivities} กิจกรรม`} />
                    <StatCard title="สถานที่จัดงาน" value={stats.totalLocations} icon={MapPin} colorClass="bg-purple-500" />
                    <StatCard title="Participation" value={`${stats.totalCapacity > 0 ? Math.round((stats.totalCheckIns / stats.totalCapacity) * 100) : 0}%`} icon={TrendingUp} colorClass="bg-orange-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-blue-600"/> 5 อันดับกิจกรรมยอดนิยม</h3>
                        <div className="h-[300px] w-full flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={32}>
                                        {stats.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#4F46E5' : '#818CF8'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {/* Admin Announcement Widget */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center"><Megaphone className="w-5 h-5 mr-2 text-green-600"/> ข่าวสารระบบ</h3>
                            <button onClick={() => navigate('/announcements')} className="text-xs text-blue-600 hover:underline">จัดการ</button>
                        </div>
                        <div className="space-y-3">
                            {recentAnnouncements.map((ann) => (
                                <div key={ann.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-2">
                                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${ann.type === 'news' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                        {ann.type === 'news' ? <Megaphone className="w-3 h-3"/> : <FileText className="w-3 h-3"/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{ann.title}</h4>
                                        <div className="text-[10px] text-gray-500 mt-1">{new Date(ann.date).toLocaleDateString('th-TH')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </>
        )}

        {/* --- User View: My Activities & Announcements --- */}
        {!isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: My Activities (If Login) */}
                <div className="lg:col-span-2 space-y-6">
                    {user && myActivities.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                <Sparkles className="w-5 h-5 mr-2 text-yellow-500" /> กิจกรรมของฉัน (My Activities)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {myActivities.map(act => {
                                    const status = getActivityStatus(act);
                                    const loc = data.checkInLocations.find(l => l.LocationID === act.LocationID);
                                    return (
                                        <div key={act.ActivityID} className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-2 hover:shadow-md transition-all cursor-pointer" onClick={() => navigate(`/activity-dashboard/${act.ActivityID}`)}>
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-900 line-clamp-1">{act.Name}</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${status.color}`}>{status.label}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 flex items-center"><MapPin className="w-3 h-3 mr-1"/> {loc?.Name || 'N/A'}</p>
                                            <div className="mt-auto pt-2 flex justify-between items-center border-t border-blue-100/50">
                                                <span className="text-[10px] text-gray-500">{getDateDisplay(act.StartDateTime)}</span>
                                                <button className="text-xs font-bold text-blue-600 flex items-center">เข้าดู <ArrowRight className="w-3 h-3 ml-1"/></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Announcement Feed (User) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center"><Megaphone className="w-5 h-5 mr-2 text-green-600"/> ข่าวประชาสัมพันธ์</h3>
                            <button onClick={() => navigate('/announcements')} className="text-xs text-blue-600 hover:underline">ดูทั้งหมด</button>
                        </div>
                        {recentAnnouncements.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {recentAnnouncements.map((ann) => (
                                    <div key={ann.id} onClick={() => navigate('/announcements')} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-green-200 transition-colors cursor-pointer group">
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg shrink-0 ${ann.type === 'news' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                                {ann.type === 'news' ? <Megaphone className="w-4 h-4"/> : <FileText className="w-4 h-4"/>}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors line-clamp-1">{ann.title}</h4>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ann.content}</p>
                                                <div className="flex items-center text-[10px] text-gray-400 mt-2">
                                                    <Calendar className="w-3 h-3 mr-1" /> {new Date(ann.date).toLocaleDateString('th-TH')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">ยังไม่มีประกาศใหม่</div>
                        )}
                    </div>
                </div>

                {/* Right: Quick Links / Venue Guide */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <Navigation className="w-5 h-5 mr-2 text-purple-600" /> ค้นหาสถานที่
                        </h3>
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500 mb-2">เลือกดูสถานที่จัดงานเพื่อนำทาง</p>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                                {data.checkInLocations.map(loc => (
                                    <button 
                                        key={loc.LocationID}
                                        onClick={() => setSelectedLocation(loc)}
                                        className="w-full p-3 bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 rounded-xl flex items-center justify-between group transition-all text-left"
                                    >
                                        <div className="flex items-center min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-gray-100 mr-3 text-purple-500 shrink-0 overflow-hidden">
                                                {/* Use getImageUrl helper here */}
                                                {loc.Image ? <img src={getImageUrl(loc.Image)} className="w-full h-full object-cover"/> : <MapPin className="w-4 h-4" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700 truncate block">{loc.Name}</span>
                                                {(loc.Floor || loc.Room) && (
                                                    <span className="text-[10px] text-gray-400 block truncate">{loc.Floor ? `ชั้น ${loc.Floor}` : ''} {loc.Room ? `ห้อง ${loc.Room}` : ''}</span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- All Activities List (Common) --- */}
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Activity className="w-6 h-6 mr-2 text-blue-600" />
                    {isAdmin ? `รายการกิจกรรมทั้งหมด (${filteredActivities.length})` : 'ค้นหากิจกรรม'}
                </h2>
                
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:w-60 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="ค้นหากิจกรรม..." 
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Items Per Page Selector */}
                    <div className="relative shrink-0">
                        <select
                            className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white cursor-pointer text-sm"
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        >
                            <option value={4}>4 / หน้า</option>
                            <option value={8}>8 / หน้า</option>
                            <option value={12}>12 / หน้า</option>
                            <option value={24}>24 / หน้า</option>
                        </select>
                        <List className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Filters */}
                    <div className="relative shrink-0 w-36">
                        <select
                            className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white cursor-pointer text-sm"
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                        >
                            <option value="all">ทุกสถานที่</option>
                            {data.checkInLocations.map(loc => (
                                <option key={loc.LocationID} value={loc.LocationID}>{loc.Name}</option>
                            ))}
                        </select>
                        <MapIcon className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="relative shrink-0 w-32">
                        <select
                            className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white cursor-pointer text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                        >
                            <option value="all">ทุกสถานะ</option>
                            <option value="active">กำลังแข่ง</option>
                            <option value="upcoming">ยังไม่เริ่ม</option>
                            <option value="ended">จบแล้ว</option>
                        </select>
                        <Filter className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {paginatedActivities.map(act => {
                    const status = getActivityStatus(act);
                    const location = data.checkInLocations.find(l => l.LocationID === act.LocationID);
                    const percentage = getPercentage(act.CurrentCount || 0, act.Capacity || 0);

                    return (
                        <div key={act.ActivityID} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full group">
                            {/* Image Header */}
                            <div className="h-32 bg-gray-100 relative shrink-0 overflow-hidden">
                                {act.Image ? (
                                    <img src={getImageUrl(act.Image)} alt={act.Name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                                        <Activity className="w-12 h-12 text-blue-200" />
                                    </div>
                                )}
                                
                                {/* Countdown Badge Overlay - Only if upcoming */}
                                {status.key === 'upcoming' && (
                                    <CountdownBadge startDateTime={act.StartDateTime} />
                                )}

                                <div className="absolute top-2 right-2 z-10">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold shadow-sm backdrop-blur-sm ${status.color}`}>
                                        {status.label}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-gray-900 mb-2 text-base leading-tight line-clamp-2 h-12 overflow-hidden" title={act.Name}>
                                    {act.Name}
                                </h3>
                                
                                <div className="text-sm text-gray-500 space-y-2 mb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center flex-1 min-w-0 mr-2">
                                            <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400 shrink-0" />
                                            <span className="truncate text-xs">{location?.Name || 'Unknown Location'}</span>
                                        </div>
                                        {/* View Venue Button */}
                                        {location && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedLocation(location); }}
                                                className="text-[10px] bg-gray-100 hover:bg-blue-50 text-blue-600 px-2 py-1 rounded border border-gray-200 hover:border-blue-200 flex items-center shrink-0 transition-colors"
                                                title="ดูข้อมูลสถานที่"
                                            >
                                                <MapIcon className="w-3 h-3 mr-1" /> แผนที่
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center" title="Start - End Time">
                                        <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400 shrink-0" />
                                        <span className="text-xs">{getDateDisplay(act.StartDateTime, act.EndDateTime)}</span>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                                        <span>ผู้เข้าร่วม</span>
                                        <span>{act.CurrentCount || 0} / {act.Capacity || '∞'}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-3">
                                        <div 
                                            className={`h-full rounded-full ${percentage >= 100 ? 'bg-red-500' : 'bg-green-500'}`} 
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => navigate(`/activity-dashboard/${act.ActivityID}`)}
                                        className="w-full py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 font-bold rounded-lg text-xs flex items-center justify-center transition-all"
                                    >
                                        รายละเอียด <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {filteredActivities.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">ไม่พบกิจกรรมที่ค้นหา</p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                            .map((p, i, arr) => (
                                <React.Fragment key={p}>
                                    {i > 0 && arr[i - 1] !== p - 1 && <span className="text-gray-400 px-1">...</span>}
                                    <button
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                                            currentPage === p 
                                            ? 'bg-blue-600 text-white shadow-md' 
                                            : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            ))
                        }
                    </div>

                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default Dashboard;
