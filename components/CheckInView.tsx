
import React, { useState, useEffect, useRef } from 'react';
import { AppData, CheckInActivity, CheckInLocation, CheckInUser } from '../types';
import { MapPin, Camera, Navigation, AlertOctagon, CheckCircle, Loader2, Send, MessageSquare, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { performCheckIn, uploadCheckInImage } from '../services/api';
import { resizeImage, fileToBase64 } from '../services/utils';
import { useParams, useNavigate } from 'react-router-dom';

interface CheckInViewProps {
    data: AppData;
    user: CheckInUser;
    activityId?: string; // Optional prop for backward compatibility or direct usage
}

const CheckInView: React.FC<CheckInViewProps> = ({ data, user, activityId: propActivityId }) => {
    const navigate = useNavigate();
    const params = useParams<{ activityId: string }>();
    const activityId = propActivityId || params.activityId;

    const [status, setStatus] = useState<'locating' | 'ready' | 'blocked' | 'submitting' | 'success'>('locating');
    const [locationError, setLocationError] = useState('');
    const [currentPos, setCurrentPos] = useState<{ lat: number, lng: number } | null>(null);
    const [distance, setDistance] = useState<number>(0);
    const [photo, setPhoto] = useState<string | null>(null);
    const [comment, setComment] = useState('');
    
    // Find Activity & Location Data
    const activity = data.checkInActivities.find(a => a.ActivityID === activityId);
    const location = activity ? data.checkInLocations.find(l => l.LocationID === activity.LocationID) : null;
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. Continuous GPS Tracking
    useEffect(() => {
        if (!activityId) return; 
        
        if (!location) {
            // Only set blocked if we are sure data is loaded but location is missing
            if (data.checkInLocations.length > 0) {
                setStatus('blocked');
                setLocationError('ไม่พบข้อมูลกิจกรรมหรือสถานที่');
            }
            return;
        }

        const geoId = navigator.geolocation.watchPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setCurrentPos({ lat, lng });

                // Calculate Distance (Haversine)
                const targetLat = parseFloat(location.Latitude);
                const targetLng = parseFloat(location.Longitude);
                const R = 6371e3; 
                const φ1 = lat * Math.PI/180;
                const φ2 = targetLat * Math.PI/180;
                const Δφ = (targetLat-lat) * Math.PI/180;
                const Δλ = (targetLng-lng) * Math.PI/180;
                const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                          Math.cos(φ1) * Math.cos(φ2) *
                          Math.sin(Δλ/2) * Math.sin(Δλ/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                const dist = R * c;

                setDistance(Math.round(dist));

                // Check Distance Logic
                const radius = parseFloat(location.RadiusMeters) || 100;
                // Allow a small buffer (e.g., +10% or just strictly radius) - here strictly radius for UI feedback
                if (dist <= radius) {
                    if (status !== 'submitting' && status !== 'success') setStatus('ready');
                } else {
                    if (status !== 'submitting' && status !== 'success') setStatus('blocked');
                }
            },
            (err) => {
                console.error(err);
                setLocationError('ไม่สามารถระบุพิกัดได้ กรุณาเปิด GPS');
                setStatus('blocked');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        return () => navigator.geolocation.clearWatch(geoId);
    }, [location, status, data.checkInLocations.length, activityId]);

    const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await resizeImage(e.target.files[0], 800, 800, 0.8);
            setPhoto(base64);
        }
    };

    const handleSubmit = async () => {
        if (!location || !currentPos || !activity) return;
        
        setStatus('submitting');
        
        let photoUrl = '';
        if (photo) {
            const upRes = await uploadCheckInImage(photo);
            if (upRes.status === 'success') photoUrl = upRes.fileUrl;
        }

        const res = await performCheckIn({
            userId: user.UserID,
            activityId: activity.ActivityID,
            locationId: location.LocationID,
            userLat: currentPos.lat,
            userLng: currentPos.lng,
            photoUrl,
            comment
        });

        if (res.status === 'success') {
            setStatus('success');
        } else {
            alert('บันทึกไม่สำเร็จ: ' + res.message);
            // Re-eval GPS status based on current distance
            const radius = parseFloat(location.RadiusMeters) || 100;
            setStatus(distance > radius ? 'blocked' : 'ready');
        }
    };

    if (!activityId) return <div className="p-10 text-center">Invalid Activity ID</div>;

    if (!activity || !location) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
                <AlertTriangle className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-800">ไม่พบกิจกรรม</h3>
                <p className="text-gray-500 mt-2">อาจเป็นเพราะรหัสกิจกรรมไม่ถูกต้อง หรือข้อมูลยังไม่ถูกโหลด</p>
                <div className="mt-4 text-xs text-gray-400">Activity ID: {activityId}</div>
                <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2 bg-white border rounded-lg shadow-sm font-bold text-gray-600">
                    ย้อนกลับ
                </button>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-6 text-center font-kanit">
                <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-green-100 animate-in zoom-in">
                    <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">เช็คอินสำเร็จ!</h2>
                    <p className="text-gray-500 mt-2">ขอบคุณที่เข้าร่วมกิจกรรม<br/>"{activity.Name}"</p>
                    <div className="mt-6 p-4 bg-green-50 rounded-xl text-green-800 text-sm">
                        บันทึกเวลา: {new Date().toLocaleTimeString()}
                    </div>
                    <button onClick={() => navigate(-1)} className="mt-8 text-green-600 font-bold hover:underline">ปิดหน้าต่าง</button>
                </div>
            </div>
        );
    }

    const radius = parseFloat(location.RadiusMeters) || 100;
    const excessDistance = Math.max(0, distance - radius);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-kanit">
            {/* Header / Map Preview */}
            <div className={`relative h-72 w-full overflow-hidden transition-colors duration-500 ${status === 'blocked' ? 'bg-red-600' : 'bg-blue-600'}`}>
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                
                {/* Back Button */}
                <div className="absolute top-4 left-4 z-20">
                    <button onClick={() => navigate(-1)} className="p-2 bg-black/20 text-white rounded-full hover:bg-black/30 backdrop-blur-sm transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 p-6 text-center">
                     {status === 'locating' ? (
                         <div className="flex flex-col items-center">
                            <Loader2 className="w-16 h-16 animate-spin mb-4" />
                            <p className="animate-pulse">กำลังค้นหาตำแหน่ง GPS...</p>
                         </div>
                     ) : status === 'blocked' ? (
                         <>
                            <div className="bg-white/20 p-4 rounded-full mb-2 animate-pulse">
                                <AlertOctagon className="w-16 h-16" />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-wider">อยู่นอกพื้นที่</h2>
                            
                            <div className="mt-4 bg-black/20 backdrop-blur-sm rounded-xl p-4 w-full max-w-xs border border-white/10">
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="opacity-80">ระยะห่างปัจจุบัน:</span>
                                    <span className="font-bold text-xl">{distance} ม.</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mb-2 border-b border-white/20 pb-2">
                                    <span className="opacity-80">รัศมีที่กำหนด:</span>
                                    <span className="font-bold">{radius} ม.</span>
                                </div>
                                <div className="flex justify-between items-center text-red-200 font-bold">
                                    <span>ต้องเข้าใกล้อีก:</span>
                                    <span>{excessDistance} ม.</span>
                                </div>
                            </div>
                         </>
                     ) : (
                         <>
                            <div className="bg-white/20 p-4 rounded-full mb-4">
                                <MapPin className="w-16 h-16" />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-wider">พร้อมเช็คอิน</h2>
                            <p className="text-blue-100 mt-1 font-medium">คุณอยู่ในพื้นที่กิจกรรมแล้ว ({distance} ม.)</p>
                         </>
                     )}
                </div>
            </div>

            {/* Content Card */}
            <div className="flex-1 -mt-10 px-4 pb-10">
                <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 relative z-20">
                    <div className="text-center mb-6">
                        <h1 className="text-xl font-bold text-gray-900">{activity.Name}</h1>
                        <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> {location.Name}
                        </p>
                    </div>

                    {status === 'blocked' ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">
                                <p className="font-bold mb-1">⚠️ ยังไม่สามารถเช็คอินได้</p>
                                <p>กรุณาเดินเข้าสู่พื้นที่กิจกรรมให้ระยะห่างน้อยกว่า <b>{radius} เมตร</b></p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.Latitude},${location.Longitude}`)} className="flex items-center justify-center w-full py-3 bg-gray-800 text-white rounded-xl font-bold shadow-lg hover:bg-gray-900 text-sm">
                                    <Navigation className="w-4 h-4 mr-2" /> นำทาง
                                </button>
                                <button onClick={() => window.location.reload()} className="flex items-center justify-center w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 text-sm">
                                    <RefreshCw className="w-4 h-4 mr-2" /> รีโหลด GPS
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Photo Input */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">1. ถ่ายรูปยืนยัน (Photo Proof)</label>
                                <div className="flex justify-center">
                                    <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handlePhoto} />
                                    {photo ? (
                                        <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-md cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <img src={photo} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                <Camera className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => fileInputRef.current?.click()} className="w-full h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-blue-400 hover:text-blue-500 transition-all">
                                            <Camera className="w-10 h-10 mb-2" />
                                            <span className="text-sm font-medium">กดเพื่อถ่ายรูป</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Comment Input */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">2. ความคิดเห็น (Optional)</label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <textarea 
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        rows={3}
                                        placeholder="แสดงความคิดเห็น หรือสิ่งที่ได้เรียนรู้..."
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleSubmit}
                                disabled={status === 'submitting' || status === 'locating'}
                                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center disabled:opacity-70 disabled:scale-100"
                            >
                                {status === 'submitting' ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-5 h-5 mr-2" /> ยืนยันการเช็คอิน</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckInView;
