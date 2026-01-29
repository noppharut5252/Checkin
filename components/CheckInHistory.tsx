
import React, { useEffect, useState } from 'react';
import { CheckInUser } from '../types';
import { History, Calendar, MapPin, CheckCircle, Loader2, Navigation, AlertTriangle } from 'lucide-react';
import { getUserCheckInHistory } from '../services/api';

interface CheckInHistoryProps {
    user: CheckInUser;
}

const CheckInHistory: React.FC<CheckInHistoryProps> = ({ user }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadHistory = async () => {
             // Fallback for ID, ensuring we have a string to query
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

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 m-4">
                <History className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">ยังไม่มีประวัติการเช็คอิน</p>
            </div>
        );
    }

    return (
        <div className="p-4 pb-20 space-y-4 animate-in fade-in">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
                <History className="w-5 h-5 mr-2 text-blue-600" /> ประวัติการเช็คอิน ({history.length})
            </h2>
            <div className="space-y-4">
                {history.map((item, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{item.ActivityName || item.ActivityID}</h4>
                                <p className="text-xs text-gray-500 flex items-center mt-1">
                                    <MapPin className="w-3 h-3 mr-1" /> {item.LocationName || item.LocationID}
                                </p>
                                <p className="text-xs text-gray-400 mt-1 flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" /> {new Date(item.Timestamp).toLocaleString('th-TH')}
                                </p>
                            </div>
                        </div>
                        
                        {(item.PhotoURL || item.Comment || item.Distance) && (
                            <div className="bg-gray-50 rounded-lg p-2 text-xs space-y-2">
                                {item.PhotoURL && (
                                    <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={getImageUrl(item.PhotoURL)} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-500 px-1">
                                    {item.Distance && <span className="flex items-center"><Navigation className="w-3 h-3 mr-1"/> ระยะ: {item.Distance} ม.</span>}
                                </div>
                                {item.Comment && <div className="italic text-gray-600 border-l-2 border-gray-300 pl-2">"{item.Comment}"</div>}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CheckInHistory;
