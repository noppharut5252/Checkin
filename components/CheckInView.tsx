
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppData, CheckInActivity, CheckInLocation, CheckInUser } from '../types';
import { 
    MapPin, Camera, Navigation, AlertOctagon, CheckCircle, Loader2, Send, 
    MessageSquare, AlertTriangle, ArrowLeft, RefreshCw, FileCheck, Signal, 
    SignalHigh, SignalLow, X, Zap, Check, Image
} from 'lucide-react';
import { performCheckIn, uploadCheckInImage, getUserCheckInHistory } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';

// Fix Leaflet marker icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CheckInViewProps {
    data: AppData;
    user: CheckInUser;
    activityId?: string;
}

// --- Helper: Circular Progress ---
const CircularDistance: React.FC<{ distance: number, radius: number, maxRange?: number }> = ({ distance, radius, maxRange = 500 }) => {
    const percentage = Math.max(0, Math.min(100, ((maxRange - Math.max(0, distance - radius)) / maxRange) * 100));
    const isInside = distance <= radius;
    
    // Color Logic
    let color = '#ef4444'; // Red
    if (isInside) color = '#22c55e'; // Green
    else if (distance <= radius * 1.5) color = '#f59e0b'; // Orange

    return (
        <div className="relative flex flex-col items-center justify-center">
            <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                <circle 
                    cx="64" cy="64" r="56" 
                    stroke={color} 
                    strokeWidth="12" 
                    fill="transparent" 
                    strokeDasharray={351} 
                    strokeDashoffset={351 - (351 * percentage) / 100} 
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black ${isInside ? 'text-green-600' : 'text-gray-700'}`}>
                    {distance < 1000 ? Math.round(distance) : (distance/1000).toFixed(1)}
                </span>
                <span className="text-xs text-gray-400 font-medium uppercase">{distance < 1000 ? 'เมตร' : 'กม.'}</span>
            </div>
            <div className={`mt-2 text-xs font-bold px-3 py-1 rounded-full ${isInside ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {isInside ? 'อยู่ในพื้นที่' : `เข้าใกล้อีก ${Math.max(0, Math.round(distance - radius))} ม.`}
            </div>
        </div>
    );
};

// --- Custom Camera Component ---
const CustomCamera: React.FC<{ onCapture: (base64: string) => void, onClose: () => void }> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsStreaming(true);
                }
            } catch (err) {
                console.error("Camera Error", err);
                setError('ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบสิทธิ์');
            }
        };
        startCamera();
        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, []);

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                // Compress slightly
                const base64 = canvas.toDataURL('image/jpeg', 0.8); 
                onCapture(base64);
                onClose();
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-[300] flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/60 to-transparent">
                <span className="text-white font-bold flex items-center"><Camera className="w-5 h-5 mr-2" /> ถ่ายรูปยืนยัน</span>
                <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30"><X className="w-6 h-6"/></button>
            </div>
            
            {/* Viewport */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {error ? (
                    <div className="text-white text-center p-6">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <p>{error}</p>
                    </div>
                ) : (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                )}
            </div>

            {/* Controls */}
            <div className="h-32 bg-black flex items-center justify-center pb-safe relative z-20">
                <button 
                    onClick={takePhoto} 
                    disabled={!isStreaming}
                    className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg active:scale-95 transition-transform flex items-center justify-center group"
                >
                    <div className="w-16 h-16 bg-white rounded-full border-2 border-black/10 group-active:bg-gray-200"></div>
                </button>
                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    );
};

// --- Notification Modal ---
const NotificationModal: React.FC<{ 
    isOpen: boolean, 
    type: 'success' | 'error' | 'loading', 
    title: string, 
    message: string, 
    onClose?: () => void 
}> = ({ isOpen, type, title, message, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${type === 'success' ? 'bg-green-100 text-green-600' : type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {type === 'success' && <Check className="w-8 h-8" />}
                    {type === 'error' && <AlertTriangle className="w-8 h-8" />}
                    {type === 'loading' && <Loader2 className="w-8 h-8 animate-spin" />}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm mb-6">{message}</p>
                {type !== 'loading' && (
                    <button 
                        onClick={onClose}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
                    >
                        {type === 'success' ? 'ตกลง' : 'ปิด'}
                    </button>
                )}
            </div>
        </div>
    );
};

const CheckInView: React.FC<CheckInViewProps> = ({ data, user, activityId: propActivityId }) => {
    const navigate = useNavigate();
    const params = useParams<{ activityId: string }>();
    const activityId = propActivityId || params.activityId;

    // --- State ---
    const [status, setStatus] = useState<'verifying' | 'locating' | 'ready' | 'blocked' | 'submitting' | 'success' | 'already_checked'>('verifying');
    const [gpsStatus, setGpsStatus] = useState<{ accuracy: number, ready: boolean }>({ accuracy: 0, ready: false });
    const [distance, setDistance] = useState<number>(Infinity);
    const [avgPos, setAvgPos] = useState<{ lat: number, lng: number } | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [comment, setComment] = useState('');
    const [checkedInDetail, setCheckedInDetail] = useState<any>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    
    // Notification State
    const [notification, setNotification] = useState<{ isOpen: boolean, type: 'success' | 'error' | 'loading', title: string, message: string }>({ isOpen: false, type: 'loading', title: '', message: '' });

    // Refs
    const posHistory = useRef<{lat: number, lng: number}[]>([]);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const userMarker = useRef<L.Marker | null>(null);
    const targetCircle = useRef<L.Circle | null>(null);

    // Data
    const activity = useMemo(() => data.checkInActivities.find(a => a.ActivityID === activityId), [data, activityId]);
    const location = useMemo(() => activity ? data.checkInLocations.find(l => l.LocationID === activity.LocationID) : null, [data, activity]);

    const isPhotoRequired = activity?.RequirePhoto === true;

    // 1. Init History Check
    useEffect(() => {
        let isMounted = true;
        const checkHistory = async () => {
            if (!user.userid || !activityId) return;
            try {
                const logs = await getUserCheckInHistory(user.userid);
                if (!isMounted) return;
                const existing = logs.find((l: any) => l.ActivityID === activityId);
                if (existing) {
                    setCheckedInDetail(existing);
                    setStatus('already_checked');
                } else {
                    setStatus('locating');
                }
            } catch (e) {
                if (isMounted) setStatus('locating');
            }
        };
        checkHistory();
        return () => { isMounted = false; };
    }, [user, activityId]);

    // 2. GPS Engine (Smart Averaging)
    useEffect(() => {
        if (status === 'verifying' || status === 'already_checked' || status === 'success' || !location) return;

        const targetLat = parseFloat(location.Latitude);
        const targetLng = parseFloat(location.Longitude);
        const targetRadius = parseFloat(location.RadiusMeters) || 100;

        const geoId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                
                // --- Averaging Logic ---
                const history = posHistory.current;
                history.push({ lat: latitude, lng: longitude });
                if (history.length > 5) history.shift(); // Keep last 5

                const sum = history.reduce((acc, curr) => ({ lat: acc.lat + curr.lat, lng: acc.lng + curr.lng }), { lat: 0, lng: 0 });
                const avgLat = sum.lat / history.length;
                const avgLng = sum.lng / history.length;
                
                setAvgPos({ lat: avgLat, lng: avgLng });
                setGpsStatus({ accuracy: Math.round(accuracy), ready: true });

                // --- Distance Calculation (Haversine) ---
                const R = 6371e3;
                const φ1 = avgLat * Math.PI/180;
                const φ2 = targetLat * Math.PI/180;
                const Δφ = (targetLat-avgLat) * Math.PI/180;
                const Δλ = (targetLng-avgLng) * Math.PI/180;
                const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                const d = R * c;
                setDistance(d);

                // --- Status Update ---
                // Only allow 'ready' if accuracy is acceptable (< 100m ideally, allowing 60m for tolerance)
                // And distance is within radius
                if (d <= targetRadius) {
                    setStatus('ready');
                } else {
                    setStatus('blocked');
                }
            },
            (err) => {
                console.error("GPS Error", err);
                setStatus('blocked');
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );

        return () => navigator.geolocation.clearWatch(geoId);
    }, [location, status]);

    // 3. Map Engine (Leaflet)
    useEffect(() => {
        if (!mapContainerRef.current || !location) return;

        // Init Map
        if (!mapInstance.current) {
            const lat = parseFloat(location.Latitude);
            const lng = parseFloat(location.Longitude);
            
            const map = L.map(mapContainerRef.current, {
                zoomControl: false,
                attributionControl: false,
                dragging: false, // Make it mini-map like initially? No, let user drag to orient.
                scrollWheelZoom: false
            }).setView([lat, lng], 17);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            mapInstance.current = map;

            // Target Circle
            const radius = parseFloat(location.RadiusMeters) || 100;
            targetCircle.current = L.circle([lat, lng], {
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                radius: radius
            }).addTo(map);

            // Target Marker
            L.marker([lat, lng]).addTo(map).bindPopup(location.Name);
        }

        // Update User Marker
        if (avgPos && mapInstance.current) {
            if (!userMarker.current) {
                // Custom Pulsing Icon for User
                const pulsingIcon = L.divIcon({
                    className: 'css-icon',
                    html: '<div class="gps_ring"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                userMarker.current = L.marker([avgPos.lat, avgPos.lng], { icon: pulsingIcon }).addTo(mapInstance.current);
                
                // Initial Fit Bounds
                const group = new L.FeatureGroup([userMarker.current, targetCircle.current!]);
                mapInstance.current.fitBounds(group.getBounds(), { padding: [50, 50] });
            } else {
                userMarker.current.setLatLng([avgPos.lat, avgPos.lng]);
            }
        }

    }, [location, avgPos]);

    const handleSubmit = async () => {
        if (!location || !avgPos || !activity) return;
        
        // GPS Accuracy Check
        if (gpsStatus.accuracy > 100) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'สัญญาณ GPS ไม่เสถียร',
                message: `ความคลาดเคลื่อน ${gpsStatus.accuracy} เมตร กรุณายืนในที่โล่งแจ้งแล้วลองใหม่`
            });
            return;
        }

        // Require Photo Validation
        if (isPhotoRequired && !photo) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'กรุณาถ่ายรูปยืนยัน',
                message: 'กิจกรรมนี้กำหนดให้ต้องถ่ายภาพบรรยากาศหรือ Selfie เพื่อยืนยันการเข้าร่วม'
            });
            return;
        }

        const uid = user.UserID || user.userid;
        setStatus('submitting');
        setNotification({
            isOpen: true,
            type: 'loading',
            title: 'กำลังบันทึกข้อมูล',
            message: 'กรุณารอสักครู่ ระบบกำลังส่งข้อมูลการเช็คอิน...'
        });
        
        let photoUrl = '';
        if (photo) {
            const upRes = await uploadCheckInImage(photo);
            if (upRes.status === 'success') photoUrl = upRes.fileUrl;
        }

        const res = await performCheckIn({
            userId: uid,
            activityId: activity.ActivityID,
            locationId: location.LocationID,
            userLat: avgPos.lat,
            userLng: avgPos.lng,
            photoUrl,
            comment
        });

        if (res.status === 'success') {
            setStatus('success');
            setNotification({ isOpen: false, type: 'success', title: '', message: '' }); // Close loading modal
        } else {
            setStatus('ready');
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'บันทึกไม่สำเร็จ',
                message: res.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
            });
        }
    };

    // --- RENDER ---

    if (!activity || !location) return <div className="p-10 text-center"><Loader2 className="animate-spin inline"/> Loading data...</div>;

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-6 text-center font-kanit animate-in fade-in">
                <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-green-100 animate-in zoom-in w-full max-w-sm">
                    <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">เช็คอินสำเร็จ!</h2>
                    <p className="text-gray-500 mt-2">ขอบคุณที่เข้าร่วมกิจกรรม<br/>"{activity.Name}"</p>
                    <div className="mt-6 p-4 bg-green-50 rounded-xl text-green-800 text-sm font-mono border border-green-200">
                        {new Date().toLocaleString('th-TH')}
                    </div>
                    {/* Redirect to History Page */}
                    <button 
                        onClick={() => navigate('/checkin-dashboard', { state: { viewMode: 'history' } })} 
                        className="mt-8 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200 transition-transform active:scale-95"
                    >
                        เสร็จสิ้น
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'already_checked' && checkedInDetail) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center font-kanit">
                <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-md text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 mx-auto">
                        <FileCheck className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">ลงทะเบียนแล้ว</h2>
                    <p className="text-gray-500 text-sm mt-1 mb-6">คุณได้ทำการเช็คอินกิจกรรมนี้ไปแล้ว</p>
                    
                    <div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-2 mb-6 border border-gray-200">
                        <div className="flex justify-between"><span className="text-gray-500">กิจกรรม</span><span className="font-bold">{activity.Name}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">เวลา</span><span>{new Date(checkedInDetail.Timestamp).toLocaleString('th-TH')}</span></div>
                    </div>
                    
                    <button onClick={() => navigate(-1)} className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">ย้อนกลับ</button>
                </div>
            </div>
        );
    }

    const radius = parseFloat(location.RadiusMeters) || 100;
    const isNearby = distance <= radius;
    const gpsGood = gpsStatus.accuracy < 50;

    return (
        <div className="min-h-screen bg-white flex flex-col font-kanit relative">
            <style>{`
                .gps_ring {
                    border: 3px solid #2563eb;
                    -webkit-border-radius: 30px;
                    height: 18px;
                    width: 18px;
                    -webkit-animation: pulsate 1s ease-out;
                    -webkit-animation-iteration-count: infinite; 
                    opacity: 0.0;
                    background-color: #3b82f6;
                    border-radius: 30px;
                }
                @keyframes pulsate {
                    0% {-webkit-transform: scale(0.1, 0.1); opacity: 0.0;}
                    50% {opacity: 1.0;}
                    100% {-webkit-transform: scale(1.2, 1.2); opacity: 0.0;}
                }
            `}</style>

            <NotificationModal 
                isOpen={notification.isOpen} 
                type={notification.type} 
                title={notification.title} 
                message={notification.message}
                onClose={() => setNotification({ ...notification, isOpen: false })}
            />

            {isCameraOpen && <CustomCamera onCapture={(img) => { setPhoto(img); setIsCameraOpen(false); }} onClose={() => setIsCameraOpen(false)} />}

            {/* --- 1. Interactive Map --- */}
            <div className="relative h-[35vh] w-full bg-gray-200 shrink-0">
                <div ref={mapContainerRef} className="absolute inset-0 z-0" />
                <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-10 p-2 bg-white/90 backdrop-blur rounded-full shadow-md text-gray-700">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                
                {/* GPS Status Badge */}
                <div className={`absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border flex items-center gap-2 text-xs font-bold ${gpsGood ? 'bg-green-500/90 text-white border-green-400' : 'bg-orange-500/90 text-white border-orange-400'}`}>
                    {gpsGood ? <SignalHigh className="w-4 h-4" /> : <SignalLow className="w-4 h-4" />}
                    <span>GPS: ±{gpsStatus.accuracy}m</span>
                </div>
            </div>

            {/* --- 2. Main Content --- */}
            <div className="flex-1 bg-white relative -mt-6 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-10 p-6 flex flex-col overflow-y-auto">
                
                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-4"></div>
                    <h1 className="text-xl font-bold text-gray-900 text-center leading-tight">{activity.Name}</h1>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {location.Name}
                    </p>
                </div>

                {/* Distance Gauge */}
                <div className="flex justify-center mb-8">
                    <CircularDistance distance={distance} radius={radius} />
                </div>

                {/* Status Messages */}
                {(!gpsStatus.ready) ? (
                    <div className="text-center py-4 text-blue-600 animate-pulse flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        กำลังจับสัญญาณดาวเทียม...
                    </div>
                ) : !isNearby ? (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 mb-4">
                        <AlertOctagon className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-red-700 text-sm">ยังไม่ถึงจุดเช็คอิน</h3>
                            <p className="text-xs text-red-600 mt-1">กรุณาเดินเข้าสู่พื้นที่กิจกรรมให้ระยะห่างน้อยกว่า {radius} เมตร</p>
                            <button 
                                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.Latitude},${location.Longitude}`)}
                                className="mt-3 text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg font-bold flex items-center shadow-sm w-fit"
                            >
                                <Navigation className="w-3 h-3 mr-1" /> นำทาง
                            </button>
                        </div>
                    </div>
                ) : !gpsGood ? (
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3 mb-4">
                        <Signal className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-orange-700 text-sm">สัญญาณ GPS ไม่เสถียร</h3>
                            <p className="text-xs text-orange-600 mt-1">ความคลาดเคลื่อน {gpsStatus.accuracy} เมตร (เกณฑ์ {50} เมตร) กรุณายืนในที่โล่งแจ้ง</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* 1. Camera Input */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                1. ถ่ายรูปยืนยัน 
                                {isPhotoRequired && <span className="text-red-500 ml-1">* (บังคับ)</span>}
                            </label>
                            {photo ? (
                                <div className="relative w-full h-48 rounded-2xl overflow-hidden shadow-md group cursor-pointer" onClick={() => setIsCameraOpen(true)}>
                                    <img src={photo} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <RefreshCw className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md flex items-center">
                                        <CheckCircle className="w-3 h-3 mr-1 text-green-400" /> บันทึกแล้ว
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsCameraOpen(true)}
                                    className={`w-full h-48 bg-gray-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all group ${isPhotoRequired ? 'border-red-300 hover:border-red-500 hover:bg-red-50' : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'}`}
                                >
                                    <div className={`bg-white p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform ${isPhotoRequired ? 'text-red-500' : 'text-blue-600'}`}>
                                        <Camera className="w-8 h-8" />
                                    </div>
                                    <span className={`text-sm font-bold ${isPhotoRequired ? 'text-red-600' : 'text-gray-600'}`}>
                                        {isPhotoRequired ? 'แตะเพื่อถ่ายรูป (บังคับ)' : 'แตะเพื่อถ่ายรูป'}
                                    </span>
                                    <span className="text-xs mt-1 opacity-70 text-gray-500">ต้องถ่ายใหม่ ณ จุดเช็คอิน</span>
                                </button>
                            )}
                        </div>

                        {/* 2. Comment */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">2. ความคิดเห็น (Optional)</label>
                            <div className="relative">
                                <MessageSquare className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="พิมพ์ข้อความ..."
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button 
                            onClick={handleSubmit}
                            disabled={status === 'submitting' || (isPhotoRequired && !photo)}
                            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center text-lg disabled:opacity-70 disabled:scale-100 disabled:bg-gray-300 disabled:text-gray-500"
                        >
                            {status === 'submitting' ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Zap className="w-5 h-5 mr-2 fill-current" /> ยืนยันเช็คอิน</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckInView;
