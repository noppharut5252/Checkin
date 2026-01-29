
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppData, User, CheckInActivity } from '../types';
import { ArrowLeft, Calendar, MapPin, Users, Clock, PlayCircle, AlertCircle, Info, Activity, Edit2, X, Save, Upload, Loader2, Camera, Navigation, RefreshCw, Timer } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { saveActivity, uploadImage } from '../services/api';
import { resizeImage } from '../services/utils';

interface ActivityDetailViewProps {
  data: AppData;
  user?: User | null;
  onDataUpdate?: () => void;
}

const ActivityDetailView: React.FC<ActivityDetailViewProps> = ({ data, user, onDataUpdate }) => {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  
  // State for Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAct, setEditAct] = useState<Partial<CheckInActivity>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Geolocation
  const [distance, setDistance] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // State for Countdown
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number} | null>(null);

  // Helper for safe date parsing
  const isValidDate = (d: any) => {
      return d && !isNaN(new Date(d).getTime());
  };

  const getSafeDateValue = (dateStr?: string) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const activity = useMemo(() => 
    data.checkInActivities.find(a => a.ActivityID === activityId), 
  [data.checkInActivities, activityId]);

  const location = useMemo(() => 
    data.checkInLocations.find(l => l.LocationID === activity?.LocationID), 
  [data.checkInLocations, activity]);

  const isAdmin = user?.Role === 'admin';

  // Calculate Dates
  const start = useMemo(() => isValidDate(activity?.StartDateTime) ? new Date(activity!.StartDateTime!) : null, [activity]);
  const end = useMemo(() => isValidDate(activity?.EndDateTime) ? new Date(activity!.EndDateTime!) : null, [activity]);

  // --- Countdown Logic ---
  useEffect(() => {
      if (start) {
          const calculateTimeLeft = () => {
              const now = new Date();
              const diff = start.getTime() - now.getTime();
              if (diff > 0) {
                  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  setTimeLeft({ days, hours, minutes });
              } else {
                  setTimeLeft(null);
              }
          };

          calculateTimeLeft(); // Initial call
          const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

          return () => clearInterval(timer);
      } else {
          setTimeLeft(null);
      }
  }, [start]);

  // --- Geolocation Logic ---
  useEffect(() => {
      if (location && location.Latitude && location.Longitude) {
          setIsLocating(true);
          setLocationError(null);
          
          const geoId = navigator.geolocation.watchPosition(
              (pos) => {
                  const lat1 = pos.coords.latitude;
                  const lon1 = pos.coords.longitude;
                  const lat2 = parseFloat(location.Latitude);
                  const lon2 = parseFloat(location.Longitude);
                  
                  // Haversine
                  const R = 6371e3; // metres
                  const φ1 = lat1 * Math.PI/180;
                  const φ2 = lat2 * Math.PI/180;
                  const Δφ = (lat2-lat1) * Math.PI/180;
                  const Δλ = (lon2-lon1) * Math.PI/180;
                  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                            Math.cos(φ1) * Math.cos(φ2) *
                            Math.sin(Δλ/2) * Math.sin(Δλ/2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                  const d = R * c; // in metres
                  
                  setDistance(Math.round(d));
                  setIsLocating(false);
              },
              (err) => {
                  console.warn("GPS Error", err);
                  setIsLocating(false);
                  setLocationError("ไม่สามารถระบุพิกัด GPS ได้");
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
          return () => navigator.geolocation.clearWatch(geoId);
      } else {
          setDistance(null);
          setIsLocating(false);
      }
  }, [location]);

  // --- Edit Logic ---
  const handleEditClick = () => {
      if (activity) {
          setEditAct({ ...activity });
          setIsEditModalOpen(true);
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
          const base64 = await resizeImage(file, 800, 600, 0.8);
          const res = await uploadImage(base64, `activity_${Date.now()}.jpg`);
          if (res.status === 'success') {
              const url = res.fileId 
                  ? `https://drive.google.com/thumbnail?id=${res.fileId}&sz=w1000` 
                  : res.fileUrl;
              setEditAct(prev => ({ ...prev, Image: url }));
          } else {
              alert('Upload failed: ' + res.message);
          }
      } catch (err) {
          console.error(err);
          alert('Error uploading image');
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleSaveActivity = async () => {
      setIsSaving(true);
      try {
          const res = await saveActivity(editAct);
          if (res.status === 'success') {
              // Trigger reload in parent
              if (onDataUpdate) onDataUpdate();
              setIsEditModalOpen(false);
          } else {
              alert('บันทึกไม่สำเร็จ: ' + res.message);
          }
      } catch (e) {
          alert('เกิดข้อผิดพลาดในการบันทึก');
      } finally {
          setIsSaving(false);
      }
  };

  if (!activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
        <AlertCircle className="w-12 h-12 mb-2 text-gray-300" />
        <p>ไม่พบข้อมูลกิจกรรม</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">กลับ</button>
      </div>
    );
  }

  // Calculate Status
  const now = new Date();
  const count = activity.CurrentCount || 0;
  const cap = activity.Capacity || 0;
  
  let status = 'Active';
  let statusColor = 'bg-green-100 text-green-700';
  let canCheckIn = true;

  if (start && start > now) {
      status = 'Upcoming'; 
      statusColor = 'bg-blue-100 text-blue-700';
      canCheckIn = false;
  }
  
  if (end && end < now) {
      status = 'Ended'; 
      statusColor = 'bg-gray-100 text-gray-500';
      canCheckIn = false;
  }

  if (cap > 0 && count >= cap) {
      status = 'Full'; 
      statusColor = 'bg-red-100 text-red-700';
      canCheckIn = false;
  }

  // Chart Data
  const chartData = [
    { name: 'Checked In', value: count, color: '#4F46E5' },
    { name: 'Remaining', value: Math.max(0, (cap || count + 100) - count), color: '#E5E7EB' }
  ];

  // Helper for Date Range Display
  const getDateRangeDisplay = () => {
      if (!start) return 'ไม่ระบุเวลา';
      const sDate = start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
      const sTime = start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      
      if (!end) return `${sDate} เวลา ${sTime}`;

      const eDate = end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
      const eTime = end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

      if (start.toDateString() === end.toDateString()) {
          return `${sDate} | ${sTime} - ${eTime}`;
      } else {
          return `${sDate} ${sTime} ถึง ${eDate} ${eTime}`;
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20 max-w-5xl mx-auto relative">
        
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center">
            <button 
                onClick={() => navigate(-1)} 
                className="flex items-center text-gray-500 hover:text-gray-800 transition-colors font-medium text-sm"
            >
                <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปหน้า Dashboard
            </button>

            {isAdmin && (
                <button 
                    onClick={handleEditClick}
                    className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-bold shadow-sm"
                >
                    <Edit2 className="w-4 h-4 mr-2" /> แก้ไขกิจกรรม
                </button>
            )}
        </div>

        {/* --- Content Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Info Column */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Hero Image */}
                <div className="relative w-full h-64 md:h-80 bg-gray-100 rounded-3xl overflow-hidden shadow-sm">
                    {activity.Image ? (
                        <img src={activity.Image} alt={activity.Name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 text-indigo-300">
                            <Activity className="w-20 h-20" />
                            <span className="text-sm font-medium mt-2">ไม่มีรูปภาพกิจกรรม</span>
                        </div>
                    )}
                    <div className="absolute top-4 right-4">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-md ${statusColor}`}>
                            {status}
                        </span>
                    </div>
                </div>

                {/* Title & Description */}
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-4">
                        {activity.Name}
                    </h1>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
                        <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                            {location?.Name || 'ไม่ระบุสถานที่'}
                        </div>
                        <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            {getDateRangeDisplay()}
                        </div>
                        
                        {/* Countdown Display */}
                        {timeLeft && (
                            <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold border border-blue-100">
                                <Timer className="w-4 h-4 mr-2" />
                                อีก {timeLeft.days > 0 ? `${timeLeft.days} วัน ` : ''}{timeLeft.hours} ชม. {timeLeft.minutes} นาที จะเริ่ม
                            </div>
                        )}
                    </div>

                    {/* Geolocation Status Bar */}
                    <div className="mb-6">
                        {location?.Latitude && location?.Longitude ? (
                            <div className={`flex items-center justify-between p-3 rounded-xl border ${distance !== null && distance <= (parseInt(location?.RadiusMeters || '100')) ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center text-sm font-medium">
                                    <Navigation className={`w-5 h-5 mr-3 ${distance !== null && distance <= (parseInt(location?.RadiusMeters || '100')) ? 'text-green-600' : 'text-blue-500'}`} />
                                    <div>
                                        <div className="text-gray-700 font-bold">ระยะห่างจากจุดเช็คอิน</div>
                                        <div className="text-xs text-gray-500">รัศมีที่กำหนด: {location.RadiusMeters || 100} เมตร</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {isLocating ? (
                                        <div className="flex items-center text-gray-500 text-sm">
                                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> กำลังระบุ...
                                        </div>
                                    ) : locationError ? (
                                        <div className="text-red-500 text-xs font-bold">{locationError}</div>
                                    ) : distance !== null ? (
                                        <div className={`text-lg font-black ${distance <= (parseInt(location?.RadiusMeters || '100')) ? 'text-green-600' : 'text-orange-500'}`}>
                                            {distance} <span className="text-xs font-medium text-gray-500">ม.</span>
                                        </div>
                                    ) : (
                                        <div className="text-gray-400 text-sm">-</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center text-yellow-800 text-sm">
                                <AlertCircle className="w-5 h-5 mr-2" /> กิจกรรมนี้ยังไม่ได้ระบุพิกัดสถานที่
                            </div>
                        )}
                    </div>

                    <div className="prose prose-sm max-w-none text-gray-600">
                        <h3 className="text-gray-900 font-bold text-lg mb-2 flex items-center">
                            <Info className="w-5 h-5 mr-2 text-blue-600"/> รายละเอียดกิจกรรม
                        </h3>
                        <p className="whitespace-pre-line leading-relaxed">
                            {activity.Description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Sidebar / Stats Column */}
            <div className="space-y-6">
                
                {/* Stats Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <h3 className="font-bold text-gray-800 mb-4 w-full text-left">สถานะการลงทะเบียน</h3>
                    
                    <div className="w-48 h-48 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-indigo-600">{count}</span>
                            <span className="text-xs text-gray-400 uppercase font-medium">Checked In</span>
                        </div>
                    </div>

                    <div className="w-full mt-6 space-y-3">
                        <div className="flex justify-between text-sm p-3 bg-gray-50 rounded-xl">
                            <span className="text-gray-500">จำนวนรับ (Capacity)</span>
                            <span className="font-bold text-gray-800">{cap > 0 ? cap.toLocaleString() : 'ไม่จำกัด'}</span>
                        </div>
                        <div className="flex justify-between text-sm p-3 bg-gray-50 rounded-xl">
                            <span className="text-gray-500">ว่าง (Remaining)</span>
                            <span className="font-bold text-gray-800">{cap > 0 ? (cap - count).toLocaleString() : '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Action Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">ดำเนินการ</h3>
                    
                    {/* Distance in Action Card for better visibility */}
                    {distance !== null && (
                        <div className="mb-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">ระยะห่างปัจจุบัน</p>
                            <span className={`text-xl font-bold ${distance <= (parseInt(location?.RadiusMeters || '100')) ? 'text-green-600' : 'text-red-500'}`}>
                                {distance} เมตร
                            </span>
                            {distance > (parseInt(location?.RadiusMeters || '100')) && (
                                <p className="text-[10px] text-red-400 mt-1">ต้องเข้าใกล้พื้นที่ในรัศมี {location?.RadiusMeters || 100} ม.</p>
                            )}
                        </div>
                    )}

                    {canCheckIn ? (
                        <button 
                            onClick={() => navigate(`/checkin/${activity.ActivityID}`)}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center group active:scale-95"
                        >
                            <PlayCircle className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
                            เริ่มเช็คอิน (Check-in Now)
                        </button>
                    ) : (
                        <div className="w-full py-4 bg-gray-100 text-gray-400 rounded-xl font-bold text-center border-2 border-dashed border-gray-200 cursor-not-allowed flex flex-col items-center justify-center">
                            <span>ไม่สามารถเช็คอินได้</span>
                            <span className="text-xs font-normal mt-1">({status === 'Full' ? 'กิจกรรมเต็ม' : 'ไม่อยู่ในช่วงเวลา'})</span>
                        </div>
                    )}

                    <div className="mt-4 text-xs text-gray-400 text-center">
                        * การเช็คอินต้องอยู่ในพื้นที่จัดงานเท่านั้น
                    </div>
                </div>

            </div>
        </div>

        {/* --- Edit Modal (Inline) --- */}
        {isEditModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <Edit2 className="w-5 h-5 mr-2 text-blue-600"/> แก้ไขกิจกรรม
                        </h3>
                        <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                            <X className="w-6 h-6 text-gray-400"/>
                        </button>
                    </div>
                    
                    <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                        {/* Image Upload */}
                        <div className="flex justify-center">
                            <div 
                                className="w-full h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors relative overflow-hidden group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {editAct.Image ? (
                                    <img src={editAct.Image} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        {isUploading ? <Loader2 className="w-8 h-8 animate-spin"/> : <Upload className="w-8 h-8 mb-2"/>}
                                        <span className="text-xs">{isUploading ? 'Uploading...' : 'เปลี่ยนรูปปกกิจกรรม'}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อกิจกรรม</label>
                            <input 
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={editAct.Name || ''} 
                                onChange={e => setEditAct({...editAct, Name: e.target.value})} 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">สถานที่ (Location)</label>
                            <select 
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                value={editAct.LocationID || ''}
                                onChange={e => setEditAct({...editAct, LocationID: e.target.value})}
                            >
                                <option value="">-- เลือกสถานที่ --</option>
                                {data.checkInLocations.map(l => <option key={l.LocationID} value={l.LocationID}>{l.Name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">รายละเอียด</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24" 
                                value={editAct.Description || ''} 
                                onChange={e => setEditAct({...editAct, Description: e.target.value})} 
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">เวลาเริ่ม (Start)</label>
                                <input 
                                    type="datetime-local" 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                                    value={getSafeDateValue(editAct.StartDateTime)}
                                    onChange={e => setEditAct({...editAct, StartDateTime: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">เวลาสิ้นสุด (End)</label>
                                <input 
                                    type="datetime-local" 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                                    value={getSafeDateValue(editAct.EndDateTime)}
                                    onChange={e => setEditAct({...editAct, EndDateTime: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-2">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">จำนวนรับ (Capacity)</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    className="flex-1 border border-gray-300 rounded-lg p-2 text-sm" 
                                    placeholder="0 = ไม่จำกัด"
                                    value={editAct.Capacity || ''}
                                    onChange={e => setEditAct({...editAct, Capacity: parseInt(e.target.value) || 0})}
                                />
                                <span className="text-sm text-gray-500">คน (0 = Unlimited)</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
                        <button 
                            onClick={() => setIsEditModalOpen(false)} 
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                        >
                            ยกเลิก
                        </button>
                        <button 
                            onClick={handleSaveActivity} 
                            disabled={isSaving || isUploading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center shadow-md hover:bg-blue-700 disabled:opacity-70"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} 
                            บันทึกการแก้ไข
                        </button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default ActivityDetailView;
