
import React, { useEffect, useState } from 'react';
import { CheckInUser } from '../types';
import { History, Calendar, MapPin, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface CheckInHistoryProps {
    user: CheckInUser;
}

const CheckInHistory: React.FC<CheckInHistoryProps> = ({ user }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, you would fetch this from API
        // For now, we'll mock or assume we can fetch via a specific endpoint
        // Simulating data for demonstration based on the backend structure
        const loadHistory = async () => {
             // Mock data if API isn't ready for history
             // Replace this with actual API call: fetch(`${API_URL}?action=getUserHistory&userId=${user.UserID}`)
             setTimeout(() => {
                 setHistory([]); // Placeholder
                 setLoading(false);
             }, 800);
        };
        loadHistory();
    }, [user]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm">กำลังโหลดประวัติ...</p>
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
        <div className="p-4 pb-20 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
                <History className="w-5 h-5 mr-2 text-blue-600" /> ประวัติการเช็คอิน
            </h2>
            <div className="space-y-3">
                {history.map((item, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-sm">{item.activityName || 'กิจกรรม'}</h4>
                            <p className="text-xs text-gray-500 flex items-center mt-1">
                                <MapPin className="w-3 h-3 mr-1" /> {item.locationName}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" /> {new Date(item.timestamp).toLocaleString('th-TH')}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CheckInHistory;
