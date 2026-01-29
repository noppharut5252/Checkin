
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppData, CheckInLocation, CheckInActivity, CheckInUser } from '../types';
import { MapPin, Plus, Edit2, Trash2, Save, X, Activity, LayoutGrid, Loader2, Calendar, Database, ImageIcon, Upload, Users, Clock, Camera, PlayCircle, Printer, QrCode, FileText, Download, MousePointer2, Search, Filter, AlertTriangle, CheckCircle, Info, Layers, Building, ChevronLeft, ChevronRight, History, User } from 'lucide-react';
import { saveLocation, deleteLocation, saveActivity, deleteActivity, uploadImage, getCheckInLogs, deleteCheckInLog } from '../services/api';
import { resizeImage } from '../services/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import L from 'leaflet';
import ConfirmationModal from './ConfirmationModal';

// Declare html2pdf from CDN
declare var html2pdf: any;

interface AdminProps {
    data: AppData;
    user: CheckInUser;
    onDataUpdate: () => void;
}

// ... (MapPicker component remains unchanged) ...
const MapPicker: React.FC<{ lat: number, lng: number, onChange: (lat: number, lng: number) => void }> = ({ lat, lng, onChange }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!mapRef.current) return;

        // Default to Bangkok if 0,0
        const initialLat = lat || 13.7563;
        const initialLng = lng || 100.5018;

        if (!leafletMap.current) {
            leafletMap.current = L.map(mapRef.current).setView([initialLat, initialLng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(leafletMap.current);

            // Custom Icon
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color:#ef4444;width:1.5rem;height:1.5rem;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            markerRef.current = L.marker([initialLat, initialLng], { draggable: true, icon }).addTo(leafletMap.current);
            
            markerRef.current.on('dragend', (e) => {
                const { lat, lng } = e.target.getLatLng();
                onChange(parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)));
            });

            leafletMap.current.on('click', (e) => {
                markerRef.current?.setLatLng(e.latlng);
                onChange(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
            });
        }
        
        return () => {
            // Cleanup on unmount handled by ref check
        };
    }, []);

    const handleSearchAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const results = await response.json();
            
            if (results && results.length > 0) {
                const { lat, lon } = results[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);
                
                leafletMap.current?.setView([newLat, newLng], 16);
                markerRef.current?.setLatLng([newLat, newLng]);
                onChange(parseFloat(newLat.toFixed(6)), parseFloat(newLng.toFixed(6)));
            } else {
                alert('ไม่พบสถานที่');
            }
        } catch (error) {
            console.error("Map search error", error);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="relative w-full h-72 rounded-xl z-0 border border-gray-300 overflow-hidden">
            <div ref={mapRef} className="w-full h-full" />
            
            {/* Map Search Overlay */}
            <div className="absolute top-2 right-2 z-[1000] bg-white p-1 rounded-lg shadow-md flex">
                <form onSubmit={handleSearchAddress} className="flex">
                    <input 
                        type="text" 
                        placeholder="ค้นหาสถานที่..." 
                        className="px-2 py-1 text-sm outline-none w-40"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" disabled={isSearching} className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
                    </button>
                </form>
            </div>
        </div>
    );
};

const AdminCheckInManager: React.FC<AdminProps> = ({ data, user, onDataUpdate }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'locations' | 'activities' | 'printables' | 'logs'>('locations');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Search & Filter States
    const [searchLocationQuery, setSearchLocationQuery] = useState('');
    const [searchActivityQuery, setSearchActivityQuery] = useState('');
    const [activityStatusFilter, setActivityStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');
    const [searchLogsQuery, setSearchLogsQuery] = useState('');
    
    // Logs State
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    
    // Custom Poster Note
    const [posterNote, setPosterNote] = useState('');

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ 
        isOpen: boolean; 
        type: 'location' | 'activity' | 'log'; 
        id: string; 
        title: string;
        warning?: string;
    }>({ isOpen: false, type: 'activity', id: '', title: '' });

    // Forms
    const [editLoc, setEditLoc] = useState<Partial<CheckInLocation>>({});
    const [editAct, setEditAct] = useState<Partial<CheckInActivity>>({});
    
    // Helper state for location images array
    const [currentLocImages, setCurrentLocImages] = useState<string[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch Logs when tab active
    useEffect(() => {
        if (activeTab === 'logs') {
            setIsLoadingLogs(true);
            getCheckInLogs().then(data => {
                setLogs(data);
                setIsLoadingLogs(false);
            });
        }
    }, [activeTab]);

    // Auto-open edit modal if query param present
    useEffect(() => {
        const editId = searchParams.get('editActivity');
        if (editId && data.checkInActivities.length > 0) {
            const act = data.checkInActivities.find(a => a.ActivityID === editId);
            if (act) {
                setActiveTab('activities');
                setEditAct(act);
                setIsEditing(true);
            }
        }
    }, [searchParams, data.checkInActivities]);

    // Initialize Images array when editing location
    useEffect(() => {
        if (activeTab === 'locations' && editLoc) {
            try {
                if (editLoc.Images) {
                    const parsed = JSON.parse(editLoc.Images);
                    setCurrentLocImages(Array.isArray(parsed) ? parsed : []);
                } else if (editLoc.Image) {
                    // Fallback to single legacy image
                    setCurrentLocImages([editLoc.Image]);
                } else {
                    setCurrentLocImages([]);
                }
            } catch (e) {
                setCurrentLocImages([]);
            }
        }
    }, [editLoc, activeTab]);

    if (user.Role !== 'admin') return <div>Access Denied</div>;

    // --- Helper Logic ---

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

    // Filtered Data
    const filteredLocations = useMemo(() => {
        return data.checkInLocations.filter(loc => 
            loc.Name.toLowerCase().includes(searchLocationQuery.toLowerCase())
        );
    }, [data.checkInLocations, searchLocationQuery]);

    const filteredActivities = useMemo(() => {
        return data.checkInActivities.filter(act => {
            const matchesSearch = act.Name.toLowerCase().includes(searchActivityQuery.toLowerCase());
            const status = getActivityStatus(act);
            const matchesStatus = activityStatusFilter === 'all' || status.key === activityStatusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            // Sort active first
            const statusA = getActivityStatus(a).key === 'active' ? 0 : 1;
            const statusB = getActivityStatus(b).key === 'active' ? 0 : 1;
            return statusA - statusB;
        });
    }, [data.checkInActivities, searchActivityQuery, activityStatusFilter]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => 
            (log.UserName || '').toLowerCase().includes(searchLogsQuery.toLowerCase()) ||
            (log.ActivityName || '').toLowerCase().includes(searchLogsQuery.toLowerCase()) ||
            (log.LocationName || '').toLowerCase().includes(searchLogsQuery.toLowerCase())
        );
    }, [logs, searchLogsQuery]);

    // Helper for Image URLs
    const getImageUrl = (idOrUrl: string) => {
        if (!idOrUrl) return '';
        if (idOrUrl.startsWith('http')) return idOrUrl;
        return `https://drive.google.com/thumbnail?id=${idOrUrl}&sz=w1000`;
    };

    // --- Handlers ---

    const handleSaveLocation = async () => {
        setIsSaving(true);
        
        // Prepare final object with serialized images
        const finalLoc = {
            ...editLoc,
            Images: JSON.stringify(currentLocImages),
            // Ensure primary Image field is populated for backward compatibility (use first image)
            Image: currentLocImages.length > 0 ? currentLocImages[0] : ''
        };

        const res = await saveLocation(finalLoc);
        setIsSaving(false);
        
        if (res.status === 'success') {
            setIsEditing(false);
            onDataUpdate();
        } else {
            alert('บันทึกสถานที่ล้มเหลว: ' + (res.message || 'Unknown error'));
        }
    };

    const handleDeleteLocationClick = (loc: CheckInLocation) => {
        // Data Integrity Check
        const relatedActivities = data.checkInActivities.filter(a => a.LocationID === loc.LocationID);
        if (relatedActivities.length > 0) {
            alert(`ไม่สามารถลบสถานที่ "${loc.Name}" ได้ เนื่องจากมีการใช้งานใน ${relatedActivities.length} กิจกรรม กรุณาลบหรือย้ายกิจกรรมออกก่อน`);
            return;
        }

        setDeleteModal({
            isOpen: true,
            type: 'location',
            id: loc.LocationID,
            title: `ลบสถานที่ "${loc.Name}"?`
        });
    };

    const handleDeleteActivityClick = (act: CheckInActivity) => {
        setDeleteModal({
            isOpen: true,
            type: 'activity',
            id: act.ActivityID,
            title: `ลบกิจกรรม "${act.Name}"?`
        });
    };

    const handleDeleteLogClick = (log: any) => {
        setDeleteModal({
            isOpen: true,
            type: 'log',
            id: log.CheckInID,
            title: `ลบประวัติของ "${log.UserName}"?`
        });
    };

    const handleConfirmDelete = async () => {
        setIsSaving(true);
        if (deleteModal.type === 'location') {
            await deleteLocation(deleteModal.id);
        } else if (deleteModal.type === 'activity') {
            await deleteActivity(deleteModal.id);
        } else if (deleteModal.type === 'log') {
            await deleteCheckInLog(deleteModal.id);
            setLogs(prev => prev.filter(l => l.CheckInID !== deleteModal.id));
        }
        setIsSaving(false);
        setDeleteModal(prev => ({ ...prev, isOpen: false }));
        onDataUpdate();
    };

    const handleSaveActivity = async () => {
        setIsSaving(true);
        const res = await saveActivity(editAct);
        setIsSaving(false);
        
        if (res.status === 'success') {
            setIsEditing(false);
            if (searchParams.get('editActivity')) {
                navigate('/checkin-dashboard', { replace: true });
            }
            onDataUpdate();
        } else {
            alert('บันทึกกิจกรรมล้มเหลว: ' + (res.message || 'Unknown error'));
        }
    };

    // ... (Image Handlers remain same) ...
    const handleLocationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            // Support multiple files upload
            const newImageIds: string[] = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const base64 = await resizeImage(file, 800, 600, 0.8);
                const res = await uploadImage(base64, `location_${Date.now()}_${i}.jpg`);
                
                if (res.status === 'success') {
                    newImageIds.push(res.fileId || res.fileUrl);
                }
            }
            
            setCurrentLocImages(prev => [...prev, ...newImageIds]);
            
        } catch (err) {
            console.error(err);
            alert('Error uploading image');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveLocImage = (indexToRemove: number) => {
        setCurrentLocImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleActivityImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleCreateSampleData = async () => {
        if(!confirm('คำเตือน: การสร้างข้อมูลตัวอย่างจะลบข้อมูลเดิมทั้งหมดใน Users, Locations, Activities, CheckIns ยืนยันหรือไม่?')) return;
        setIsGenerating(true);
        try {
            const API_URL = "https://script.google.com/macros/s/AKfycbxyS_GG5snXmt2YTcMCMMYgfQZmzTynb-esxe8N2NBAdC1uGdIGGnPh7W0PuId4r4OF/exec"; 
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'createSampleData' })
            });
            alert('สร้างข้อมูลตัวอย่างสำเร็จ!');
            onDataUpdate();
        } catch (e) {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setIsGenerating(false);
        }
    };

    // ... (Poster Generation Logic remains same) ...
    const generatePosterHTML = async (activitiesToPrint: any[], customNote: string) => {
        const qrCodePromises = activitiesToPrint.map(async (act) => {
            const checkInUrl = `${window.location.origin}${window.location.pathname}#/checkin/${act.ActivityID}`;
            const qr = await QRCode.toDataURL(checkInUrl, { width: 400, margin: 1 });
            const loc = data.checkInLocations.find(l => l.LocationID === act.LocationID);
            return { act, loc, qr };
        });

        const pages = await Promise.all(qrCodePromises);

        return `
            <html>
                <head>
                    <title>Print QR Posters</title>
                    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600;800&display=swap" rel="stylesheet">
                    <style>
                        @page { size: A4; margin: 0; }
                        body { margin: 0; padding: 0; font-family: 'Kanit', sans-serif; background: #eee; -webkit-print-color-adjust: exact; }
                        .page { width: 209mm; height: 296mm; background: white; position: relative; overflow: hidden; page-break-after: always; display: flex; flex-direction: column; align-items: center; text-align: center; margin: 0 auto; }
                        .page:last-child { page-break-after: avoid; }
                        .header { background: #2563eb; width: 100%; padding: 40px 20px; color: white; clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%); }
                        .header h1 { margin: 0; font-size: 32pt; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }
                        .header p { margin: 10px 0 0; font-size: 14pt; opacity: 0.9; }
                        .content { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 20px; }
                        .activity-name { font-size: 24pt; font-weight: bold; color: #1e3a8a; margin-bottom: 20px; line-height: 1.2; max-width: 90%; }
                        .qr-container { border: 4px dashed #cbd5e1; border-radius: 20px; padding: 20px; background: white; margin: 20px 0; }
                        .qr-img { width: 100mm; height: 100mm; object-fit: contain; }
                        .loc-badge { background: #f1f5f9; color: #475569; padding: 10px 30px; border-radius: 50px; font-size: 16pt; font-weight: bold; display: flex; align-items: center; margin-top: 20px; }
                        .custom-note { margin-top: 20px; font-size: 18pt; color: #d97706; font-weight: bold; border: 2px solid #fbbf24; padding: 10px 20px; border-radius: 10px; background-color: #fffbeb; }
                        .footer { width: 100%; padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; margin-top: auto; }
                        .footer-text { font-size: 12pt; color: #64748b; }
                        .no-print { position: fixed; top: 10px; right: 10px; z-index: 999; }
                        button { padding: 10px 20px; background: blue; color: white; border: none; border-radius: 5px; cursor: pointer; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="no-print"><button onclick="window.print()">Print Posters</button></div>
                    ${pages.map(p => `
                        <div class="page">
                            <div class="header"><h1>Check-In Point</h1><p>จุดลงทะเบียนเข้าร่วมกิจกรรม</p></div>
                            <div class="content">
                                <div class="activity-name">${p.act.Name}</div>
                                <div class="qr-container"><img src="${p.qr}" class="qr-img" /></div>
                                <p style="font-size: 14pt; color: #ef4444; font-weight: bold;">สแกนเพื่อลงทะเบียน</p>
                                <div class="loc-badge">📍 ${p.loc?.Name || 'ไม่ระบุสถานที่'}</div>
                                ${customNote ? `<div class="custom-note">Note: ${customNote}</div>` : ''}
                            </div>
                            <div class="footer"><div class="footer-text">ระบบเช็คอินกิจกรรม CompManager • ID: ${p.act.ActivityID}</div></div>
                        </div>
                    `).join('')}
                </body>
            </html>
        `;
    };

    const getActivitiesToPrint = (activityId: string | 'all', locationId?: string) => {
        if (activityId === 'all') {
            return locationId 
                ? data.checkInActivities.filter(a => a.LocationID === locationId)
                : data.checkInActivities;
        } else {
            const act = data.checkInActivities.find(a => a.ActivityID === activityId);
            return act ? [act] : [];
        }
    };

    const handlePrintPoster = async (activityId: string | 'all', locationId?: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert('Pop-up Blocked'); return; }
        const activities = getActivitiesToPrint(activityId, locationId);
        if (activities.length === 0) { printWindow.close(); alert('ไม่มีกิจกรรมที่จะพิมพ์'); return; }
        const html = await generatePosterHTML(activities, posterNote);
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleDownloadPDF = async (activityId: string | 'all', locationId?: string) => {
        const activities = getActivitiesToPrint(activityId, locationId);
        if (activities.length === 0) { alert('ไม่มีกิจกรรมที่จะดาวน์โหลด'); return; }
        setIsGenerating(true);
        try {
            const html = await generatePosterHTML(activities, posterNote);
            const element = document.createElement('div');
            element.innerHTML = html;
            const noPrint = element.querySelector('.no-print');
            if (noPrint) noPrint.remove();
            const opt = { margin: 0, filename: `checkin_posters_${Date.now()}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            await html2pdf().set(opt).from(element).save();
        } catch (e) { console.error(e); alert('เกิดข้อผิดพลาดในการสร้าง PDF'); } finally { setIsGenerating(false); }
    };

    const getSafeDateValue = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 16);
    };

    return (
        <div className="pb-20 space-y-6">
            
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                title={deleteModal.title}
                description={deleteModal.type === 'location' 
                    ? "การลบสถานที่อาจส่งผลกระทบต่อกิจกรรมที่ผูกกับสถานที่นี้ คุณแน่ใจหรือไม่?" 
                    : deleteModal.type === 'log' 
                    ? "คุณต้องการลบประวัติการเช็คอินนี้ใช่หรือไม่?"
                    : "คุณต้องการลบกิจกรรมนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้"}
                confirmLabel="ยืนยันการลบ"
                confirmColor="red"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                isLoading={isSaving}
                actionType="delete"
            />

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <LayoutGrid className="w-6 h-6 mr-2 text-blue-600"/> จัดการระบบเช็คอิน
                    </h2>
                    <p className="text-gray-500 text-sm">สำหรับผู้ดูแลระบบ</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleCreateSampleData} disabled={isGenerating} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200 flex items-center">
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <Database className="w-4 h-4 mr-1"/>}
                        สร้างข้อมูลตัวอย่าง
                    </button>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setActiveTab('locations')} className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'locations' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>สถานที่</button>
                        <button onClick={() => setActiveTab('activities')} className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'activities' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>กิจกรรม</button>
                        <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'logs' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Logs</button>
                        <button onClick={() => setActiveTab('printables')} className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'printables' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>พิมพ์ป้าย</button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'locations' ? (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="ค้นหาสถานที่..."
                                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchLocationQuery}
                                onChange={(e) => setSearchLocationQuery(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => { setEditLoc({}); setIsEditing(true); }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center font-bold"
                        >
                            <Plus className="w-5 h-5 mr-1" /> เพิ่ม
                        </button>
                    </div>

                    {filteredLocations.map(loc => (
                        <div key={loc.LocationID} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="w-16 h-16 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                {loc.Image ? (
                                    <img src={getImageUrl(loc.Image)} className="w-full h-full object-cover" alt={loc.Name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon className="w-6 h-6"/></div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800">{loc.Name}</h3>
                                <div className="text-xs text-gray-500 flex flex-col gap-1 mt-1">
                                    <span className="flex items-center"><MapPin className="w-3 h-3 mr-1"/> {loc.Latitude}, {loc.Longitude}</span>
                                    {loc.Floor && <span>ชั้น: {loc.Floor} {loc.Room && `| ห้อง: ${loc.Room}`}</span>}
                                    <span>รัศมี: {loc.RadiusMeters} เมตร</span>
                                </div>
                            </div>
                            <div className="flex gap-2 self-end sm:self-center">
                                <button onClick={() => { setEditLoc(loc); setIsEditing(true); }} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                                <button onClick={() => handleDeleteLocationClick(loc)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                    {filteredLocations.length === 0 && <div className="text-center py-10 text-gray-400">ไม่พบสถานที่</div>}
                </div>
            ) : activeTab === 'activities' ? (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="ค้นหากิจกรรม..."
                                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchActivityQuery}
                                onChange={(e) => setSearchActivityQuery(e.target.value)}
                            />
                        </div>
                        <div className="relative w-full sm:w-48">
                            <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <select
                                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                                value={activityStatusFilter}
                                onChange={(e) => setActivityStatusFilter(e.target.value as any)}
                            >
                                <option value="all">ทุกสถานะ</option>
                                <option value="active">กำลังดำเนินอยู่</option>
                                <option value="upcoming">ยังไม่เริ่ม</option>
                                <option value="ended">จบแล้ว</option>
                            </select>
                        </div>
                        <button 
                            onClick={() => { setEditAct({}); setIsEditing(true); }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center font-bold whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5 mr-1" /> เพิ่มกิจกรรม
                        </button>
                    </div>

                    {filteredActivities.map(act => {
                        const status = getActivityStatus(act);
                        return (
                            <div key={act.ActivityID} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                <div className="flex items-center gap-3">
                                    {/* Activity Image Preview */}
                                    <div className="w-12 h-12 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                        {act.Image ? (
                                            <img src={act.Image} className="w-full h-full object-cover" alt={act.Name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-green-600"><Activity className="w-6 h-6"/></div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-800 line-clamp-1">{act.Name}</h3>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 flex items-center gap-2">
                                            <MapPin className="w-3 h-3"/> 
                                            {data.checkInLocations.find(l => l.LocationID === act.LocationID)?.Name || 'Unknown Loc'}
                                        </p>
                                        {(act.StartDateTime || act.EndDateTime) && (
                                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3"/>
                                                {act.StartDateTime ? new Date(act.StartDateTime).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'Any'} - 
                                                {act.EndDateTime ? new Date(act.EndDateTime).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'Any'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col sm:items-end gap-1 border-t sm:border-0 pt-2 sm:pt-0 mt-2 sm:mt-0">
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold self-start sm:self-end ${act.Capacity ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                        {act.Capacity ? `${act.CurrentCount || 0}/${act.Capacity}` : 'ไม่จำกัด'}
                                    </span>
                                    <div className="flex gap-2 mt-1">
                                        <button 
                                            onClick={() => navigate(`/checkin/${act.ActivityID}`)}
                                            className="p-2 text-green-600 hover:text-green-800 bg-green-50 rounded-lg hover:bg-green-100"
                                            title="เช็คอิน (Test)"
                                        >
                                            <PlayCircle className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { setEditAct(act); setIsEditing(true); }} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                                        <button 
                                            onClick={() => handleDeleteActivityClick(act)} 
                                            className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-colors"
                                            title="ลบกิจกรรม"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredActivities.length === 0 && <div className="text-center py-10 text-gray-400">ไม่พบกิจกรรม</div>}
                </div>
            ) : activeTab === 'logs' ? (
                <div className="space-y-4">
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="ค้นหาตามชื่อผู้ใช้, กิจกรรม, หรือสถานที่..."
                                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchLogsQuery}
                                onChange={(e) => setSearchLogsQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {isLoadingLogs ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-gray-400"/></div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">ไม่พบประวัติการเช็คอิน</div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้ใช้งาน</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">กิจกรรม/สถานที่</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">เวลา</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredLogs.map((log) => (
                                            <tr key={log.CheckInID} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                            <User className="w-5 h-5"/>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-bold text-gray-900">{log.UserName}</div>
                                                            <div className="text-xs text-gray-500">{log.UserID}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 font-medium">{log.ActivityName}</div>
                                                    <div className="text-xs text-gray-500">{log.LocationName}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(log.Timestamp).toLocaleString('th-TH')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button onClick={() => handleDeleteLogClick(log)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg">
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800">
                        <div className="flex items-center mb-3">
                            <Printer className="w-6 h-6 mr-3" />
                            <div>
                                <h3 className="font-bold">พิมพ์ป้าย QR Code (Print Posters)</h3>
                                <p className="text-xs mt-1">เลือกพิมพ์ป้ายเพื่อนำไปติดที่จุดเช็คอิน หรือดาวน์โหลดเป็น PDF</p>
                            </div>
                        </div>
                        {/* Custom Poster Note Input */}
                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                            <label className="text-xs font-bold text-gray-500 mb-1 flex items-center">
                                <FileText className="w-3 h-3 mr-1" /> ข้อความเพิ่มเติมในป้าย (Optional)
                            </label>
                            <input 
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                placeholder="เช่น รหัส Wi-Fi, ชั้น 2, ห้อง 301"
                                value={posterNote}
                                onChange={(e) => setPosterNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {data.checkInLocations.map(loc => {
                            const acts = data.checkInActivities.filter(a => a.LocationID === loc.LocationID);
                            if (acts.length === 0) return null;

                            return (
                                <div key={loc.LocationID} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2 justify-between items-center">
                                        <h3 className="font-bold text-gray-700 flex items-center">
                                            <MapPin className="w-4 h-4 mr-2" /> {loc.Name}
                                        </h3>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleDownloadPDF('all', loc.LocationID)}
                                                className="text-xs bg-white border border-green-600 text-green-600 px-3 py-1.5 rounded-lg flex items-center hover:bg-green-50"
                                            >
                                                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Download className="w-3 h-3 mr-1" />} PDF
                                            </button>
                                            <button 
                                                onClick={() => handlePrintPoster('all', loc.LocationID)}
                                                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center hover:bg-blue-700"
                                            >
                                                <Printer className="w-3 h-3 mr-1" /> พิมพ์ทั้งหมด
                                            </button>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {acts.map(act => (
                                            <div key={act.ActivityID} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50">
                                                <div className="flex items-center">
                                                    <QrCode className="w-5 h-5 text-gray-400 mr-3" />
                                                    <span className="text-sm font-medium text-gray-700">{act.Name}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleDownloadPDF(act.ActivityID)}
                                                        className="text-gray-400 hover:text-green-600 p-2"
                                                        title="ดาวน์โหลด PDF"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePrintPoster(act.ActivityID)}
                                                        className="text-gray-400 hover:text-blue-600 p-2"
                                                        title="พิมพ์เฉพาะรายการนี้"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">{activeTab === 'locations' ? 'จัดการสถานที่' : 'จัดการกิจกรรม'}</h3>
                            <button onClick={() => { setIsEditing(false); navigate('/checkin-dashboard', { replace: true }); }}><X className="w-6 h-6 text-gray-400"/></button>
                        </div>
                        
                        <div className="space-y-4">
                            {activeTab === 'locations' ? (
                                <>
                                    {/* Multi-Image Gallery Manager */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-gray-500">รูปภาพสถานที่ (Gallery)</label>
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded flex items-center font-bold hover:bg-blue-100"
                                            >
                                                <Plus className="w-3 h-3 mr-1" /> เพิ่มรูป
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-2">
                                            {currentLocImages.map((imgId, idx) => (
                                                <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border bg-gray-100 group">
                                                    <img src={getImageUrl(imgId)} className="w-full h-full object-cover" />
                                                    <button 
                                                        onClick={() => handleRemoveLocImage(idx)}
                                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-video rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-400"
                                            >
                                                {isUploading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Upload className="w-5 h-5 mb-1"/>}
                                                <span className="text-[10px]">Add Image</span>
                                            </div>
                                        </div>
                                        <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLocationImageUpload} />
                                    </div>

                                    <input className="w-full border rounded-lg p-3" placeholder="ชื่อสถานที่" value={editLoc.Name || ''} onChange={e => setEditLoc({...editLoc, Name: e.target.value})} />
                                    
                                    {/* Floor & Room Inputs */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">ชั้น (Floor)</label>
                                            <input className="w-full border rounded-lg p-2 text-sm" placeholder="เช่น ชั้น 1, 18" value={editLoc.Floor || ''} onChange={e => setEditLoc({...editLoc, Floor: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">ห้อง (Room)</label>
                                            <input className="w-full border rounded-lg p-2 text-sm" placeholder="เช่น ห้องประชุม 1" value={editLoc.Room || ''} onChange={e => setEditLoc({...editLoc, Room: e.target.value})} />
                                        </div>
                                    </div>

                                    {/* Map Picker for Location */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center"><MousePointer2 className="w-3 h-3 mr-1"/> ปักหมุดตำแหน่ง (ค้นหาหรือลากหมุด)</label>
                                        <MapPicker 
                                            lat={parseFloat(editLoc.Latitude || '0')} 
                                            lng={parseFloat(editLoc.Longitude || '0')} 
                                            onChange={(lat, lng) => setEditLoc({ ...editLoc, Latitude: lat.toString(), Longitude: lng.toString() })} 
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <input className="border rounded-lg p-3" placeholder="Latitude" value={editLoc.Latitude || ''} onChange={e => setEditLoc({...editLoc, Latitude: e.target.value})} />
                                        <input className="border rounded-lg p-3" placeholder="Longitude" value={editLoc.Longitude || ''} onChange={e => setEditLoc({...editLoc, Longitude: e.target.value})} />
                                    </div>
                                    <input className="w-full border rounded-lg p-3" placeholder="รัศมี (เมตร) เช่น 100" value={editLoc.RadiusMeters || ''} onChange={e => setEditLoc({...editLoc, RadiusMeters: e.target.value})} />
                                    <textarea className="w-full border rounded-lg p-3" placeholder="รายละเอียดเพิ่มเติม" value={editLoc.Description || ''} onChange={e => setEditLoc({...editLoc, Description: e.target.value})} />
                                </>
                            ) : (
                                <>
                                    {/* Activity Image Upload */}
                                    <div className="flex justify-center">
                                        <div 
                                            className="w-full h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors relative overflow-hidden group"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {editAct.Image ? (
                                                <img src={editAct.Image} className="w-full h-full object-cover" alt="Preview" />
                                            ) : (
                                                <div className="flex flex-col items-center text-gray-400">
                                                    {isUploading ? <Loader2 className="w-8 h-8 animate-spin"/> : <Upload className="w-8 h-8 mb-2"/>}
                                                    <span className="text-xs">{isUploading ? 'Uploading...' : 'รูปปกกิจกรรม (Optional)'}</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleActivityImageUpload} />
                                    </div>

                                    <input className="w-full border rounded-lg p-3" placeholder="ชื่อกิจกรรม" value={editAct.Name || ''} onChange={e => setEditAct({...editAct, Name: e.target.value})} />
                                    <select 
                                        className="w-full border rounded-lg p-3"
                                        value={editAct.LocationID || ''}
                                        onChange={e => setEditAct({...editAct, LocationID: e.target.value})}
                                    >
                                        <option value="">-- เลือกสถานที่ --</option>
                                        {data.checkInLocations.map(l => <option key={l.LocationID} value={l.LocationID}>{l.Name}</option>)}
                                    </select>
                                    <textarea className="w-full border rounded-lg p-3" placeholder="รายละเอียด" value={editAct.Description || ''} onChange={e => setEditAct({...editAct, Description: e.target.value})} />
                                    
                                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 mb-1 block">เวลาเริ่ม (Start)</label>
                                            <input 
                                                type="datetime-local" 
                                                className="w-full border rounded-lg p-2 text-sm" 
                                                value={getSafeDateValue(editAct.StartDateTime)}
                                                onChange={e => setEditAct({...editAct, StartDateTime: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 mb-1 block">เวลาสิ้นสุด (End)</label>
                                            <input 
                                                type="datetime-local" 
                                                className="w-full border rounded-lg p-2 text-sm" 
                                                value={getSafeDateValue(editAct.EndDateTime)}
                                                onChange={e => setEditAct({...editAct, EndDateTime: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t pt-2">
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">จำนวนรับ (Capacity)</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                className="flex-1 border rounded-lg p-2 text-sm" 
                                                placeholder="0 = ไม่จำกัด"
                                                value={editAct.Capacity || ''}
                                                onChange={e => setEditAct({...editAct, Capacity: parseInt(e.target.value) || 0})}
                                            />
                                            <span className="text-sm text-gray-500">คน (0 = Unlimited)</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => { setIsEditing(false); navigate('/checkin-dashboard', { replace: true }); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                            <button 
                                onClick={activeTab === 'locations' ? handleSaveLocation : handleSaveActivity} 
                                disabled={isSaving || isUploading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center"
                            >
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2"/>} บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCheckInManager;
