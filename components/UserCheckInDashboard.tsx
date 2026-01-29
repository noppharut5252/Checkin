
import React, { useState, useEffect } from 'react';
import { AppData, CheckInUser } from '../types';
import { MapPin, Navigation, ChevronRight, Search, LocateFixed, Loader2, Clock, Users, AlertCircle, QrCode, ScanLine, History, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QRScannerModal from './QRScannerModal';
import CheckInHistory from './CheckInHistory';

interface UserCheckInDashboardProps {
    data: AppData;
    user: CheckInUser;
}

const UserCheckInDashboard: React.FC<UserCheckInDashboardProps> = ({ data, user }) => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'activities' | 'history'>('activities');
    const [currentPos, setCurrentPos] = useState<{ lat: number, lng: number } | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Ensure we handle the undefined case correctly (default to true)
    const showHistory = data.appConfig ? (data.appConfig.menu_checkin_history !== false) : true;

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => { setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLoadingLocation(false); },
                (err) => { console.error(err); setLoadingLocation(false); },
                { enableHighAccuracy: true }
            );
        } else { setLoadingLocation(false); }
    }, []);

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const activitiesList = React.useMemo(() => {
        const list = data.checkInActivities || [];
        const locs = data.checkInLocations || [];
        const now = new Date();

        return list.map(act => {
            const loc = locs.find(l => l.LocationID === act.LocationID);
            let distance = Infinity;
            let is_nearby = false;

            if (loc && currentPos) {
                distance = getDistance(currentPos.lat, currentPos.lng, parseFloat(loc.Latitude), parseFloat(loc.Longitude));
                const radius = parseFloat(loc.RadiusMeters) || 100;
                if (distance <= radius * 1.5) is_nearby = true;
            }

            // Time & Capacity Logic
            let status = 'Available';
            let statusColor = 'text-green-600 bg-green-50';
            
            if (act.StartDateTime && new Date(act.StartDateTime) > now) {
                status = 'Not Started'; statusColor = 'text-orange-600 bg-orange-50';
            } else if (act.EndDateTime && new Date(act.EndDateTime) < now) {
                status = 'Ended'; statusColor = 'text-gray-500 bg-gray-100';
            } else if (act.Capacity && act.Capacity > 0) {
                if ((act.CurrentCount || 0) >= act.Capacity) {
                    status = 'Full'; statusColor = 'text-red-600 bg-red-50';
                }
            }

            return {
                ...act,
                locationName: loc?.Name || 'Unknown Location',
                distance,
                is_nearby,
                computedStatus: status,
                statusColor
            };
        }).filter(a => 
            (a.Name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (a.locationName || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => {
            // Sort by status priority (Available > Not Started > Full/Ended) then distance
            const scoreA = a.computedStatus === 'Available' ? 0 : 1;
            const scoreB = b.computedStatus === 'Available' ? 0 : 1;
            if (scoreA !== scoreB) return scoreA - scoreB;
            return a.distance - b.distance;
        });
    }, [data.checkInActivities, data.checkInLocations, currentPos, searchTerm]);

    const handleScanResult = (code: string) => {
        // Expected code: URL like .../checkin/<ActivityID> or just <ActivityID>
        setIsScannerOpen(false);
        let activityId = code;
        if (code.includes('/checkin/')) {
            const parts = code.split('/checkin/');
            if (parts.length > 1) activityId = parts[1].split('?')[0]; 
        }
        const exists = data.checkInActivities.find(a => a.ActivityID === activityId);
        if (exists) {
            navigate(`/checkin/${activityId}`);
        } else {
            alert('ไม่พบกิจกรรมจาก QR Code นี้ (' + activityId + ')');
        }
    };

    return (
        <div className="space-y-6 pb-24">
            
            <QRScannerModal 
                isOpen={isScannerOpen} 
                onClose={() => setIsScannerOpen(false)} 
                onScan={handleScanResult} 
            />

            {/* Header Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><MapPin className="w-32 h-32" /></div>
                
                <div className="relative z-10 flex flex-col items-center text-center mt-2">
                    <p className="text-blue-100 text-xs font-medium uppercase tracking-wider mb-1">Welcome, {user.Name}</p>
                    <h1 className="text-2xl font-bold mb-6">ระบบเช็คอินกิจกรรม</h1>
                    
                    <button 
                        onClick={() => setIsScannerOpen(true)}
                        className="bg-white text-blue-600 w-full max-w-xs py-4 rounded-2xl shadow-xl hover:bg-blue-50 transition-all transform active:scale-95 flex items-center justify-center gap-3 group"
                    >
                        <div className="bg-blue-100 p-2 rounded-xl group-hover:bg-blue-200 transition-colors">
                            <QrCode className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-lg">สแกน QR Code</div>
                            <div className="text-xs text-blue-400">เพื่อลงทะเบียนเข้างาน</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            {showHistory && (
                <div className="flex bg-gray-100 p-1 rounded-xl mx-1">
                    <button
                        onClick={() => setViewMode('activities')}
                        className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'activities' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LayoutGrid className="w-4 h-4 mr-2" /> รายการกิจกรรม
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'history' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <History className="w-4 h-4 mr-2" /> ประวัติการเข้าร่วม
                    </button>
                </div>
            )}

            {viewMode === 'history' && showHistory ? (
                <CheckInHistory user={user} />
            ) : (
                <div className="px-1">
                    <div className="relative mt-2 mb-6">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="ค้นหากิจกรรมใกล้ตัว..." 
                            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3 px-1">
                        <span className="font-bold uppercase tracking-wide">กิจกรรม ({activitiesList.length})</span>
                        <div className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded-full shadow-sm">
                            {loadingLocation ? <Loader2 className="w-3 h-3 animate-spin"/> : <LocateFixed className="w-3 h-3 text-blue-600"/>}
                            {loadingLocation ? 'Locating...' : 'GPS Active'}
                        </div>
                    </div>

                    {activitiesList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <MapPin className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">ไม่พบกิจกรรม</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activitiesList.map(act => {
                                const isAvailable = act.computedStatus === 'Available';
                                return (
                                    <div 
                                        key={act.ActivityID}
                                        onClick={() => { if (isAvailable) setIsScannerOpen(true); }}
                                        className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-2 transition-all ${isAvailable ? 'cursor-pointer hover:shadow-md active:scale-95 border-l-4 border-l-blue-500' : 'opacity-60 cursor-not-allowed grayscale border-l-4 border-l-gray-300'}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${act.is_nearby && isAvailable ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {act.is_nearby ? <MapPin className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-gray-900 text-sm truncate pr-2">{act.Name}</h3>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${act.statusColor}`}>
                                                        {act.computedStatus}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 flex items-center mt-1 truncate">
                                                    <Navigation className="w-3 h-3 mr-1 shrink-0" /> {act.locationName}
                                                </p>
                                                
                                                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                                                    {act.StartDateTime && (
                                                        <span className="flex items-center bg-gray-50 px-1.5 py-0.5 rounded">
                                                            <Clock className="w-3 h-3 mr-1"/> 
                                                            {new Date(act.StartDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                    )}
                                                    {act.Capacity && act.Capacity > 0 && (
                                                        <span className={`flex items-center px-1.5 py-0.5 rounded ${act.computedStatus === 'Full' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                            <Users className="w-3 h-3 mr-1"/> {act.CurrentCount}/{act.Capacity}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {isAvailable && (
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-1">
                                                <span className="text-[10px] text-blue-600 font-bold flex items-center">
                                                    <ScanLine className="w-3 h-3 mr-1" /> แตะเพื่อสแกนเช็คอิน
                                                </span>
                                                {act.is_nearby && <span className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded-full">ในพื้นที่</span>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserCheckInDashboard;
