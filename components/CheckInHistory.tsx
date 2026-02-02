
import React, { useEffect, useState, useMemo } from 'react';
import { CheckInUser, CheckInLog, AppData } from '../types';
import { 
    History, Calendar, MapPin, CheckCircle, Loader2, Navigation, 
    AlertTriangle, Search, Filter, Image as ImageIcon, X, Map as MapIcon, 
    TrendingUp, Camera, Clock, FileText
} from 'lucide-react';
import { getUserCheckInHistory, updateCheckInSurveyStatus } from '../services/api';

interface CheckInHistoryProps {
    user: CheckInUser;
    data?: AppData; // Added data prop to access activity survey links
}

// Helper for date grouping
const formatDateGroup = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'วันนี้ (Today)';
    if (date.toDateString() === yesterday.toDateString()) return 'เมื่อวาน (Yesterday)';
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
};

const CheckInHistory: React.FC<CheckInHistoryProps> = ({ user, data }) => {
    const [history, setHistory] = useState<CheckInLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'with_photo'>('all');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const refreshHistory = async () => {
         const uid = user.UserID || user.userid;
         if (!uid) return;
         try {
             const logs = await getUserCheckInHistory(uid);
             setHistory(logs);
         } catch(e) {}
    };

    useEffect(() => {
        const loadHistory = async () => {
             const uid = user.UserID || user.userid;
             if (!uid) {
                 setLoading(false);
                 setError('ไม่พบข้อมูลผู้ใช้งาน (User ID missing)');
                 return;
             }

             setLoading(true);
             try {
                 const logs = await getUserCheckInHistory(uid);
                 setHistory(logs);
             } catch (e) {
                 console.error("Failed to load history", e);
                 setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
             } finally {
                 setLoading(false);
             }
        };
        loadHistory();
    }, [user]);

    const getImageUrl = (url: string) => url && !url.startsWith('http') ? `https://drive.google.com/thumbnail?id=${url}&sz=w1000` : url;

    const handleSurveyClick = async (log: CheckInLog, surveyLink: string) => {
        window.open(surveyLink, '_blank');
        // Optimistic update
        setHistory(prev => prev.map(l => l.CheckInID === log.CheckInID ? { ...l, SurveyStatus: 'Done' } : l));
        // Background update
        await updateCheckInSurveyStatus(log.CheckInID, 'Done');
        refreshHistory(); // Ensure sync
    };

    // --- Computed Data ---
    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            const matchesSearch = 
                (item.ActivityName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.LocationName || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesFilter = filterType === 'all' || (filterType === 'with_photo' && item.PhotoURL);
            
            return matchesSearch && matchesFilter;
        });
    }, [history, searchTerm, filterType]);

    const groupedHistory = useMemo(() => {
        const groups: Record<string, CheckInLog[]> = {};
        filteredHistory.forEach(log => {
            const groupKey = formatDateGroup(log.Timestamp);
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(log);
        });
        return groups;
    }, [filteredHistory]);

    const stats = useMemo(() => {
        return {
            total: history.length,
            withPhoto: history.filter(h => h.PhotoURL).length,
            latest: history.length > 0 ? new Date(history[0].Timestamp).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-'
        };
    }, [history]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm">กำลังโหลดประวัติ...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-red-400 bg-red-50 rounded-2xl border border-red-100 m-4">
                <AlertTriangle className="w-10 h-10 mb-2" />
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="pb-24 space-y-6 animate-in fade-in font-kanit">
            
            {/* 1. Stats Header */}
            <div className="grid grid-cols-3 gap-3 px-1">
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-full mb-1"><History className="w-4 h-4" /></div>
                    <div className="text-lg font-bold text-gray-800">{stats.total}</div>
                    <div className="text-[10px] text-gray-500">ครั้งทั้งหมด</div>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="p-2 bg-green-50 text-green-600 rounded-full mb-1"><Camera className="w-4 h-4" /></div>
                    <div className="text-lg font-bold text-gray-800">{stats.withPhoto}</div>
                    <div className="text-[10px] text-gray-500">มีรูปถ่าย</div>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-full mb-1"><Clock className="w-4 h-4" /></div>
                    <div className="text-lg font-bold text-gray-800">{stats.latest}</div>
                    <div className="text-[10px] text-gray-500">ล่าสุดเมื่อ</div>
                </div>
            </div>

            {/* 2. Search & Filter */}
            <div className="flex gap-2 px-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ค้นหากิจกรรม..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => setFilterType(prev => prev === 'all' ? 'with_photo' : 'all')}
                    className={`px-3 py-2 rounded-xl border flex items-center transition-all ${filterType === 'with_photo' ? 'bg-blue-50 border-blue-200 text-blue-600 font-bold' : 'bg-white border-gray-200 text-gray-500'}`}
                >
                    <ImageIcon className="w-4 h-4" />
                </button>
            </div>

            {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-200 mx-1">
                    <History className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">ไม่พบประวัติการเช็คอิน</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedHistory).map(([dateLabel, logs]) => (
                        <div key={dateLabel}>
                            {/* Date Header */}
                            <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur py-2 mb-2 px-2">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
                                    <Calendar className="w-3 h-3 mr-1.5" /> {dateLabel}
                                </h3>
                            </div>

                            {/* Timeline Items */}
                            <div className="relative pl-4 border-l-2 border-gray-200 space-y-6 ml-2 pr-1">
                                {(logs as CheckInLog[]).map((item) => {
                                    // Lookup Survey Link
                                    const activity = data?.checkInActivities.find(a => a.ActivityID === item.ActivityID);
                                    const surveyLink = activity?.SurveyLink;
                                    const isSurveyDone = item.SurveyStatus === 'Done';

                                    return (
                                        <div key={item.CheckInID} className="relative pl-6">
                                            {/* Dot Connector */}
                                            <div className="absolute -left-[21px] top-1 w-4 h-4 bg-white border-4 border-blue-500 rounded-full"></div>
                                            
                                            {/* Card Content */}
                                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 transition-all hover:shadow-md">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 text-sm line-clamp-2">{item.ActivityName || item.ActivityID}</h4>
                                                        <div className="flex items-center text-xs text-gray-500 mt-1">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {new Date(item.Timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                    {/* Map Link Button */}
                                                    {(item.UserLat && item.UserLng) || item.LocationName ? (
                                                        <a 
                                                            href={`https://www.google.com/maps/search/?api=1&query=${item.UserLat},${item.UserLng}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                            title="ดูแผนที่"
                                                        >
                                                            <MapIcon className="w-4 h-4" />
                                                        </a>
                                                    ) : null}
                                                </div>

                                                <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                                                    <span>{item.LocationName || item.LocationID}</span>
                                                </div>

                                                {(item.PhotoURL || item.Comment || item.Distance) && (
                                                    <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                                                        {item.PhotoURL && (
                                                            <div 
                                                                className="w-full h-32 rounded-lg overflow-hidden border border-gray-200 cursor-zoom-in relative group"
                                                                onClick={() => setSelectedImage(getImageUrl(item.PhotoURL!))}
                                                            >
                                                                <img src={getImageUrl(item.PhotoURL)} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                                            </div>
                                                        )}
                                                        
                                                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                                                            {item.Distance && (
                                                                <span className="flex items-center">
                                                                    <Navigation className="w-3 h-3 mr-1"/> ระยะห่าง: {item.Distance} ม.
                                                                </span>
                                                            )}
                                                            {item.Comment && (
                                                                <span className="italic text-gray-600 truncate max-w-[150px]">
                                                                    "{item.Comment}"
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Survey Button in History */}
                                                {surveyLink && (
                                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                                        {isSurveyDone ? (
                                                            <div className="flex items-center text-xs text-green-600 font-bold">
                                                                <CheckCircle className="w-4 h-4 mr-1" /> ประเมินแล้ว
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleSurveyClick(item, surveyLink)}
                                                                className="w-full py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold flex items-center justify-center hover:bg-yellow-100 transition-colors"
                                                            >
                                                                <FileText className="w-3 h-3 mr-1" /> ทำแบบประเมิน
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 4. Lightbox Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img 
                        src={selectedImage} 
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                    />
                </div>
            )}
        </div>
    );
};

export default CheckInHistory;
