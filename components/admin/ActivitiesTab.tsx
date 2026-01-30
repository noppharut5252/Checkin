
import React, { useState, useMemo, useRef } from 'react';
import { AppData, CheckInActivity } from '../../types';
import { Search, Plus, Activity, MapPin, Clock, Edit2, Trash2, History, Upload, Loader2, Power, AlertTriangle, Share2, CheckCircle, X } from 'lucide-react';
import { deleteActivity, saveActivity } from '../../services/api';
import ActivityModal from './ActivityModal';
import ConfirmationModal from '../ConfirmationModal';
import { shareCheckInActivity } from '../../services/liff';

interface ActivitiesTabProps {
    data: AppData;
    onDataUpdate: () => void;
    onViewLogs: (actName: string) => void;
}

const ActivitiesTab: React.FC<ActivitiesTabProps> = ({ data, onDataUpdate, onViewLogs }) => {
    const [searchActivityQuery, setSearchActivityQuery] = useState('');
    const [activityStatusFilter, setActivityStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');
    
    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editAct, setEditAct] = useState<Partial<CheckInActivity>>({});
    
    // Notifications State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({ isOpen: false, id: '', title: '' });
    const [statusModal, setStatusModal] = useState<{ isOpen: boolean; act: CheckInActivity | null; nextStatus: 'OPEN' | 'CLOSED' | '' }>({ isOpen: false, act: null, nextStatus: '' });
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Import State
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isDateValid = (d: any) => d && !isNaN(new Date(d).getTime());

    const getActivityStatus = (act: CheckInActivity) => {
        if (act.ManualOverride === 'CLOSED') return { label: 'ปิดชั่วคราว (Manual)', color: 'bg-red-500 text-white', key: 'ended' };
        if (act.ManualOverride === 'OPEN') return { label: 'เปิดพิเศษ (Manual)', color: 'bg-green-500 text-white', key: 'active' };

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

    const filteredActivities = useMemo(() => {
        return data.checkInActivities.filter(act => {
            const matchesSearch = act.Name.toLowerCase().includes(searchActivityQuery.toLowerCase());
            const status = getActivityStatus(act);
            const matchesStatus = activityStatusFilter === 'all' || status.key === activityStatusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            const statusA = getActivityStatus(a).key === 'active' ? 0 : 1;
            const statusB = getActivityStatus(b).key === 'active' ? 0 : 1;
            return statusA - statusB;
        });
    }, [data.checkInActivities, searchActivityQuery, activityStatusFilter]);

    const getImageUrl = (idOrUrl: string) => {
        if (!idOrUrl) return '';
        if (idOrUrl.startsWith('http')) return idOrUrl;
        return `https://drive.google.com/thumbnail?id=${idOrUrl}&sz=w1000`;
    };

    const handleEdit = (act: CheckInActivity) => {
        setEditAct(act);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditAct({});
        setIsModalOpen(true);
    };

    const handleDeleteClick = (act: CheckInActivity) => {
        setDeleteModal({ isOpen: true, id: act.ActivityID, title: `ลบกิจกรรม "${act.Name}"?` });
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await deleteActivity(deleteModal.id);
        setIsDeleting(false);
        setDeleteModal(prev => ({ ...prev, isOpen: false }));
        onDataUpdate();
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            const promises = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',');
                if (cols.length >= 2) {
                    const newAct = {
                        Name: cols[0].trim(),
                        LocationID: cols[1].trim(),
                        Description: cols[2]?.trim() || '',
                        StartDateTime: cols[3]?.trim() || '',
                        EndDateTime: cols[4]?.trim() || '',
                        Capacity: parseInt(cols[5]?.trim()) || 0
                    };
                    promises.push(saveActivity(newAct));
                }
            }
            await Promise.all(promises);
            setIsImporting(false);
            setAlertMessage({ type: 'success', text: `นำเข้าสำเร็จ ${promises.length} รายการ` });
            onDataUpdate();
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleStatusClick = (act: CheckInActivity) => {
        let nextStatus: 'OPEN' | 'CLOSED' | '' = '';
        // Cycle logic: Auto -> OPEN -> CLOSED -> Auto
        if (!act.ManualOverride) nextStatus = 'OPEN';
        else if (act.ManualOverride === 'OPEN') nextStatus = 'CLOSED';
        else nextStatus = '';
        setStatusModal({ isOpen: true, act, nextStatus });
    };

    const handleConfirmStatus = async () => {
        if (!statusModal.act) return;
        const updated = { ...statusModal.act, ManualOverride: statusModal.nextStatus };
        await saveActivity(updated);
        setStatusModal({ ...statusModal, isOpen: false });
        onDataUpdate();
    };

    const handleShare = async (act: CheckInActivity) => {
        const locationName = data.checkInLocations.find(l => l.LocationID === act.LocationID)?.Name || 'ไม่ระบุสถานที่';
        // Use Thai Date Format for display
        const start = act.StartDateTime ? new Date(act.StartDateTime).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'ไม่ระบุเวลา';
        const image = getImageUrl(act.Image || '');
        
        try {
            const res = await shareCheckInActivity(act.Name, locationName, start, act.ActivityID, image);
            if (res.success) {
                if (res.method === 'line') setAlertMessage({ type: 'success', text: 'แชร์ไปยัง LINE แล้ว' });
                else if (res.method === 'copy') setAlertMessage({ type: 'success', text: 'คัดลอกลิงก์แล้ว' });
                else setAlertMessage({ type: 'success', text: 'เปิดหน้าต่างแชร์สำเร็จ' });
            } else {
                setAlertMessage({ type: 'error', text: 'ไม่สามารถแชร์ได้' });
            }
        } catch (e) {
            setAlertMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' });
        }
    };

    return (
        <div className="space-y-4 relative">
            
            {/* Custom Alert Toast */}
            {alertMessage && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[300] px-6 py-3 rounded-full shadow-xl flex items-center animate-in slide-in-from-top-5 fade-in duration-300 ${alertMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {alertMessage.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertTriangle className="w-5 h-5 mr-2" />}
                    <span className="font-bold text-sm">{alertMessage.text}</span>
                    <button onClick={() => setAlertMessage(null)} className="ml-4 opacity-80 hover:opacity-100"><X className="w-4 h-4"/></button>
                </div>
            )}

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
                <div className="flex gap-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 flex items-center justify-center font-bold text-sm"
                        disabled={isImporting}
                    >
                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4 mr-1" />} Import CSV
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
                    
                    <button 
                        onClick={handleAdd}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center font-bold whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5 mr-1" /> เพิ่ม
                    </button>
                </div>
            </div>

            {filteredActivities.map(act => {
                const status = getActivityStatus(act);
                return (
                    <div key={act.ActivityID} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 group hover:border-blue-200 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative">
                                {act.Image ? (
                                    <img src={getImageUrl(act.Image)} className="w-full h-full object-cover" alt={act.Name} />
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
                                <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                                    {(act.StartDateTime || act.EndDateTime) && (
                                        <span className="flex items-center">
                                            <Clock className="w-3 h-3 mr-1"/>
                                            {act.StartDateTime ? new Date(act.StartDateTime).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'Any'}
                                        </span>
                                    )}
                                    {act.Category && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{act.Category}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2 border-t sm:border-0 pt-2 sm:pt-0 mt-2 sm:mt-0">
                            <div className="flex items-center gap-2">
                                {/* Toggle Button - Enhanced UI */}
                                <button 
                                    onClick={() => handleStatusClick(act)}
                                    className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm ${
                                        act.ManualOverride === 'OPEN' ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200' :
                                        act.ManualOverride === 'CLOSED' ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200' :
                                        'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                                    title="เปลี่ยนสถานะ (Manual Override)"
                                >
                                    <Power className="w-3 h-3" />
                                    {act.ManualOverride === 'OPEN' ? 'FORCE OPEN' : act.ManualOverride === 'CLOSED' ? 'FORCE CLOSED' : 'AUTO MODE'}
                                </button>
                                <span className={`text-xs px-2 py-1 rounded font-bold ${act.Capacity ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                    {act.Capacity ? `${act.CurrentCount || 0}/${act.Capacity}` : 'ไม่จำกัด'}
                                </span>
                            </div>
                            <div className="flex gap-2 mt-1">
                                <button 
                                    onClick={() => handleShare(act)}
                                    className="p-2 text-green-600 hover:text-green-800 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                    title="แชร์ Flex Message"
                                >
                                    <Share2 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => onViewLogs(act.Name)}
                                    className="p-2 text-purple-600 hover:text-purple-800 bg-purple-50 rounded-lg hover:bg-purple-100 flex items-center gap-1 text-xs font-bold px-3 transition-colors"
                                    title="ดูประวัติการเช็คอิน"
                                >
                                    <History className="w-4 h-4" /> ({act.CurrentCount || 0})
                                </button>
                                <button onClick={() => handleEdit(act)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                                <button 
                                    onClick={() => handleDeleteClick(act)} 
                                    className="p-2 text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
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

            <ActivityModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                initialData={editAct}
                locations={data.checkInLocations} 
                onSuccess={onDataUpdate}
            />

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                title={deleteModal.title}
                description="คุณต้องการลบกิจกรรมนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้"
                confirmLabel="ยืนยันการลบ"
                confirmColor="red"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                isLoading={isDeleting}
                actionType="delete"
            />

            {/* Status Change Modal */}
            <ConfirmationModal
                isOpen={statusModal.isOpen}
                title="เปลี่ยนสถานะกิจกรรม"
                description={`คุณต้องการเปลี่ยนสถานะเป็น "${statusModal.nextStatus || 'AUTO'}" ใช่หรือไม่? ${statusModal.nextStatus === 'OPEN' ? 'การตั้งค่านี้จะเปิดรับเช็คอินทันทีโดยไม่สนใจเวลา' : statusModal.nextStatus === 'CLOSED' ? 'การตั้งค่านี้จะปิดรับเช็คอินทันที' : 'กลับสู่โหมดอัตโนมัติตามเวลาที่กำหนด'}`}
                confirmLabel="ยืนยัน"
                confirmColor={statusModal.nextStatus === 'OPEN' ? 'green' : statusModal.nextStatus === 'CLOSED' ? 'red' : 'blue'}
                onConfirm={handleConfirmStatus}
                onCancel={() => setStatusModal({ ...statusModal, isOpen: false })}
                actionType="updateStatus"
            />
        </div>
    );
};

export default ActivitiesTab;
