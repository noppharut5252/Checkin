
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppData, CheckInActivity } from '../../types';
import { Search, Plus, Activity, MapPin, Clock, Edit2, Trash2, History, Upload, Loader2, Power, AlertTriangle, Share2, CheckCircle, X, Camera, Lock, Users, ShieldAlert, Tag, GraduationCap, LayoutGrid, List, Download, FileSpreadsheet, CheckSquare, Square, Filter, RefreshCw } from 'lucide-react';
import { deleteActivity, saveActivity } from '../../services/api';
import ActivityModal from './ActivityModal';
import ConfirmationModal from '../ConfirmationModal';
import { shareCheckInActivity } from '../../services/liff';

interface ActivitiesTabProps {
    data: AppData;
    onDataUpdate: () => void;
    onViewLogs: (actName: string) => void;
}

// Constants for Filters
const CATEGORY_OPTIONS = [
    'วิทยาศาสตร์', 'คณิตศาสตร์', 'ภาษาไทย', 'ภาษาอังกฤษ', 'สังคมศึกษา',
    'ศิลปะ', 'ดนตรี', 'นาฏศิลป์', 'การงานอาชีพ', 'คอมพิวเตอร์', 'หุ่นยนต์',
    'ปฐมวัย', 'กิจกรรมพัฒนาผู้เรียน'
];

const LEVEL_OPTIONS = [
    'ป.1-3', 'ป.4-6', 'ม.1-3', 'ม.4-6', 'ป.1-6', 'ม.1-6', 'ปฐมวัย'
];

const ActivitiesTab: React.FC<ActivitiesTabProps> = ({ data, onDataUpdate, onViewLogs }) => {
    // Search & Filter State
    const [searchActivityQuery, setSearchActivityQuery] = useState('');
    const [activityStatusFilter, setActivityStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [levelFilter, setLevelFilter] = useState('all');
    
    // View Mode State
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    
    // Selection State (Bulk Actions)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);

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

    // Reset selection when filters change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [searchActivityQuery, activityStatusFilter, categoryFilter, levelFilter]);

    const isDateValid = (d: any) => d && !isNaN(new Date(d).getTime());

    const getActivityStatus = (act: CheckInActivity) => {
        if (act.ManualOverride === 'CLOSED') return { label: 'ปิดชั่วคราว (Manual)', color: 'bg-red-500 text-white', text: 'text-red-600', key: 'ended' };
        if (act.ManualOverride === 'OPEN') return { label: 'เปิดพิเศษ (Manual)', color: 'bg-green-500 text-white', text: 'text-green-600', key: 'active' };

        const now = new Date();
        const start = isDateValid(act.StartDateTime) ? new Date(act.StartDateTime!) : null;
        const end = isDateValid(act.EndDateTime) ? new Date(act.EndDateTime!) : null;
        const count = act.CurrentCount || 0;
        const cap = act.Capacity || 0;

        if (start && start > now) return { label: 'ยังไม่เริ่ม', color: 'bg-blue-100 text-blue-700', text: 'text-blue-600', key: 'upcoming' };
        if (end && end < now) return { label: 'จบแล้ว', color: 'bg-gray-100 text-gray-500', text: 'text-gray-500', key: 'ended' };
        if (cap > 0 && count >= cap) return { label: 'เต็ม', color: 'bg-red-100 text-red-700', text: 'text-red-600', key: 'active' };
        return { label: 'กำลังดำเนินอยู่', color: 'bg-green-100 text-green-700', text: 'text-green-600', key: 'active' };
    };

    const filteredActivities = useMemo(() => {
        return data.checkInActivities.filter(act => {
            const matchesSearch = act.Name.toLowerCase().includes(searchActivityQuery.toLowerCase());
            const status = getActivityStatus(act);
            const matchesStatus = activityStatusFilter === 'all' || status.key === activityStatusFilter;
            const matchesCategory = categoryFilter === 'all' || act.Category === categoryFilter;
            const matchesLevel = levelFilter === 'all' || (act.Levels && act.Levels.includes(levelFilter));
            
            return matchesSearch && matchesStatus && matchesCategory && matchesLevel;
        }).sort((a, b) => {
            const statusA = getActivityStatus(a).key === 'active' ? 0 : 1;
            const statusB = getActivityStatus(b).key === 'active' ? 0 : 1;
            return statusA - statusB;
        });
    }, [data.checkInActivities, searchActivityQuery, activityStatusFilter, categoryFilter, levelFilter]);

    const getImageUrl = (idOrUrl: string) => {
        if (!idOrUrl) return '';
        if (idOrUrl.startsWith('http')) return idOrUrl;
        return `https://drive.google.com/thumbnail?id=${idOrUrl}&sz=w1000`;
    };

    // --- Bulk Actions Handlers ---

    const handleSelectAll = () => {
        if (selectedIds.size === filteredActivities.length && filteredActivities.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredActivities.map(a => a.ActivityID)));
        }
    };

    const handleToggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkStatusChange = async (overrideStatus: 'OPEN' | 'CLOSED' | '') => {
        if (!confirm(`ยืนยันการเปลี่ยนสถานะ ${selectedIds.size} รายการ?`)) return;
        setIsProcessingBulk(true);
        try {
            // Process in parallel chunks to be faster, but strictly this should be a backend batch endpoint
            const promises = Array.from(selectedIds).map(id => {
                const act = data.checkInActivities.find(a => a.ActivityID === id);
                if (act) return saveActivity({ ...act, ManualOverride: overrideStatus });
                return Promise.resolve();
            });
            await Promise.all(promises);
            setAlertMessage({ type: 'success', text: 'อัปเดตสถานะกลุ่มสำเร็จ' });
            onDataUpdate();
            setSelectedIds(new Set());
        } catch (e) {
            setAlertMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' });
        } finally {
            setIsProcessingBulk(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`คำเตือน! คุณกำลังจะลบ ${selectedIds.size} กิจกรรม\nการกระทำนี้ไม่สามารถย้อนกลับได้ ยืนยันหรือไม่?`)) return;
        setIsProcessingBulk(true);
        try {
            const promises = Array.from(selectedIds).map(id => deleteActivity(id));
            await Promise.all(promises);
            setAlertMessage({ type: 'success', text: 'ลบข้อมูลกลุ่มสำเร็จ' });
            onDataUpdate();
            setSelectedIds(new Set());
        } catch (e) {
            setAlertMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบ' });
        } finally {
            setIsProcessingBulk(false);
        }
    };

    // --- Export / Import Handlers ---

    const handleExportCSV = () => {
        const headers = ['Name', 'LocationID', 'Description', 'StartDateTime', 'EndDateTime', 'Capacity', 'Category', 'Levels', 'Mode', 'ReqStudents', 'ReqTeachers', 'Status', 'ManualOverride'];
        const csvContent = [
            headers.join(','),
            ...filteredActivities.map(act => [
                `"${act.Name.replace(/"/g, '""')}"`,
                act.LocationID,
                `"${(act.Description || '').replace(/"/g, '""')}"`,
                act.StartDateTime || '',
                act.EndDateTime || '',
                act.Capacity || 0,
                act.Category || '',
                `"${act.Levels || ''}"`,
                act.Mode || '',
                act.ReqStudents || 0,
                act.ReqTeachers || 0,
                act.Status || 'Active',
                act.ManualOverride || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activities_export_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadTemplate = () => {
        const headers = ['Name', 'LocationID', 'Description', 'StartDateTime', 'EndDateTime', 'Capacity', 'Category', 'Levels', 'Mode', 'ReqStudents', 'ReqTeachers'];
        const sample = ['"การแข่งขันหุ่นยนต์"', 'LOC-001', '"รายละเอียดกิจกรรม"', '2024-12-25 09:00', '2024-12-25 12:00', '0', 'หุ่นยนต์', 'ม.1-3', 'Team', '3', '1'];
        const csvContent = "\uFEFF" + [headers.join(','), sample.join(',')].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activity_import_template.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            // Skip header (i=1)
            for (let i = 1; i < lines.length; i++) {
                // Basic CSV split - warning: simple split doesn't handle commas inside quotes perfectly without regex
                // Using regex for better CSV parsing: 
                const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
                const cols = matches.map((c: string) => c.replace(/^"|"$/g, '').trim());

                if (cols.length >= 2) {
                    const newAct = {
                        Name: cols[0],
                        LocationID: cols[1],
                        Description: cols[2] || '',
                        StartDateTime: cols[3] || '',
                        EndDateTime: cols[4] || '',
                        Capacity: parseInt(cols[5]) || 0,
                        Category: cols[6] || '',
                        Levels: cols[7] || '',
                        Mode: cols[8] || '',
                        ReqStudents: parseInt(cols[9]) || 0,
                        ReqTeachers: parseInt(cols[10]) || 0,
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

    // --- Standard Item Handlers ---

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

    const handleStatusClick = (act: CheckInActivity) => {
        let nextStatus: 'OPEN' | 'CLOSED' | '' = '';
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
        const location = data.checkInLocations.find(l => l.LocationID === act.LocationID);
        const locationName = location?.Name || 'ไม่ระบุสถานที่';
        const start = act.StartDateTime ? new Date(act.StartDateTime).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'ไม่ระบุเวลา';
        const image = getImageUrl(act.Image || '');
        
        try {
            const res = await shareCheckInActivity(act.Name, locationName, start, act.ActivityID, image, location?.Floor, location?.Room);
            if (res.success) setAlertMessage({ type: 'success', text: res.method === 'line' ? 'แชร์ไปยัง LINE แล้ว' : res.method === 'copy' ? 'คัดลอกลิงก์แล้ว' : 'แชร์สำเร็จ' });
            else setAlertMessage({ type: 'error', text: 'ไม่สามารถแชร์ได้' });
        } catch (e) {
            setAlertMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' });
        }
    };

    return (
        <div className="space-y-4 relative">
            
            {/* Alert Toast */}
            {alertMessage && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[300] px-6 py-3 rounded-full shadow-xl flex items-center animate-in slide-in-from-top-5 fade-in duration-300 ${alertMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {alertMessage.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertTriangle className="w-5 h-5 mr-2" />}
                    <span className="font-bold text-sm">{alertMessage.text}</span>
                    <button onClick={() => setAlertMessage(null)} className="ml-4 opacity-80 hover:opacity-100"><X className="w-4 h-4"/></button>
                </div>
            )}

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] bg-white border border-blue-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-3 animate-in slide-in-from-bottom-5 max-w-[95vw] overflow-x-auto">
                    <span className="text-sm font-bold text-gray-700 whitespace-nowrap px-2 border-r border-gray-200 mr-2">
                        {selectedIds.size} รายการ
                    </span>
                    <div className="flex gap-2">
                        <button onClick={() => handleBulkStatusChange('OPEN')} className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-bold hover:bg-green-200 whitespace-nowrap">
                            <Power className="w-3 h-3 inline mr-1" /> Force Open
                        </button>
                        <button onClick={() => handleBulkStatusChange('CLOSED')} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 whitespace-nowrap">
                            <Power className="w-3 h-3 inline mr-1" /> Force Close
                        </button>
                        <button onClick={() => handleBulkStatusChange('')} className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200 whitespace-nowrap">
                            <RefreshCw className="w-3 h-3 inline mr-1" /> Auto
                        </button>
                        <button onClick={handleBulkDelete} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold hover:bg-red-50 hover:text-red-600 whitespace-nowrap">
                            <Trash2 className="w-3 h-3 inline mr-1" /> ลบ
                        </button>
                    </div>
                    {isProcessingBulk && <Loader2 className="w-5 h-5 animate-spin text-blue-600 ml-2" />}
                </div>
            )}

            {/* Filters Bar */}
            <div className="flex flex-col gap-3">
                <div className="flex gap-2">
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
                    <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                            <List className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2 py-1">
                        <Filter className="w-3 h-3 text-gray-400" />
                        <select className="text-xs bg-transparent outline-none py-1" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="all">ทุกหมวดหมู่</option>
                            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2 py-1">
                        <Filter className="w-3 h-3 text-gray-400" />
                        <select className="text-xs bg-transparent outline-none py-1" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                            <option value="all">ทุกระดับชั้น</option>
                            {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2 py-1">
                        <Power className="w-3 h-3 text-gray-400" />
                        <select className="text-xs bg-transparent outline-none py-1" value={activityStatusFilter} onChange={(e) => setActivityStatusFilter(e.target.value as any)}>
                            <option value="all">ทุกสถานะ</option>
                            <option value="active">กำลังเปิด</option>
                            <option value="upcoming">ยังไม่เริ่ม</option>
                            <option value="ended">จบแล้ว</option>
                        </select>
                    </div>

                    <div className="ml-auto flex gap-2">
                        <button onClick={handleDownloadTemplate} className="text-gray-500 hover:text-blue-600 p-2" title="โหลดไฟล์ตัวอย่าง CSV"><FileSpreadsheet className="w-5 h-5"/></button>
                        <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="p-2 text-gray-500 hover:text-green-600 disabled:opacity-50" title="นำเข้า CSV">
                            {isImporting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Upload className="w-5 h-5"/>}
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
                        
                        <button onClick={handleExportCSV} className="p-2 text-gray-500 hover:text-purple-600" title="ส่งออก CSV"><Download className="w-5 h-5"/></button>
                        
                        <button onClick={handleAdd} className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold shadow-sm">
                            <Plus className="w-4 h-4 mr-1" /> เพิ่ม
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'grid' ? (
                // --- Grid View ---
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredActivities.map(act => {
                        const status = getActivityStatus(act);
                        const parseBool = (val: any) => val === true || String(val).toUpperCase() === 'TRUE';
                        const isSelected = selectedIds.has(act.ActivityID);

                        return (
                            <div key={act.ActivityID} className={`bg-white p-4 rounded-xl shadow-sm border transition-all relative overflow-hidden group ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/20' : 'border-gray-100 hover:border-blue-200'}`} onClick={() => handleToggleSelect(act.ActivityID)}>
                                
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                            {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${status.color}`}>{status.label}</span>
                                    </div>
                                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleShare(act)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Share2 className="w-4 h-4" /></button>
                                        <button onClick={() => onViewLogs(act.Name)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"><History className="w-4 h-4" /></button>
                                        <button onClick={() => handleEdit(act)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteClick(act)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-14 h-14 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative">
                                        {act.Image ? <img src={getImageUrl(act.Image)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-green-600"><Activity className="w-6 h-6"/></div>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-gray-800 line-clamp-1 text-sm">{act.Name}</h3>
                                        <div className="text-xs text-gray-500 mt-1 space-y-1">
                                            <div className="flex items-center gap-1"><MapPin className="w-3 h-3"/> <span className="truncate">{data.checkInLocations.find(l => l.LocationID === act.LocationID)?.Name || 'Unknown'}</span></div>
                                            <div className="flex items-center gap-1"><Clock className="w-3 h-3"/> <span>{act.StartDateTime ? new Date(act.StartDateTime).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}) : 'ไม่ระบุเวลา'}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-50 mt-2">
                                    {parseBool(act.RequirePhoto) && <span className="badge-flag bg-blue-50 text-blue-600"><Camera className="w-3 h-3 mr-1"/> Photo</span>}
                                    {parseBool(act.IsLocked) && <span className="badge-flag bg-orange-50 text-orange-600"><Lock className="w-3 h-3 mr-1"/> Locked</span>}
                                    {(act.ReqTeachers || act.ReqStudents) && <span className="badge-flag bg-gray-100 text-gray-600"><Users className="w-3 h-3 mr-1"/> {act.ReqTeachers || 0}C / {act.ReqStudents || 0}S</span>}
                                    {act.Category && <span className="badge-flag bg-gray-50 text-gray-500"><Tag className="w-3 h-3 mr-1"/> {act.Category}</span>}
                                </div>
                                <style>{`.badge-flag { display: flex; align-items: center; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 500; }`}</style>
                            </div>
                        );
                    })}
                </div>
            ) : (
                // --- Table View ---
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 w-10 text-center">
                                        <button onClick={handleSelectAll} className="text-gray-400 hover:text-blue-600">
                                            {selectedIds.size === filteredActivities.length && filteredActivities.length > 0 ? <CheckSquare className="w-5 h-5 text-blue-600"/> : <Square className="w-5 h-5"/>}
                                        </button>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">กิจกรรม</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">หมวดหมู่/ระดับ</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">สถานะ</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Stats</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredActivities.map(act => {
                                    const status = getActivityStatus(act);
                                    const locName = data.checkInLocations.find(l => l.LocationID === act.LocationID)?.Name || '-';
                                    const isSelected = selectedIds.has(act.ActivityID);
                                    const parseBool = (val: any) => val === true || String(val).toUpperCase() === 'TRUE';

                                    return (
                                        <tr key={act.ActivityID} className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50/30' : ''}`} onClick={() => handleToggleSelect(act.ActivityID)}>
                                            <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                                                <div onClick={() => handleToggleSelect(act.ActivityID)} className={`cursor-pointer ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>
                                                    {isSelected ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-sm text-gray-900">{act.Name}</div>
                                                <div className="text-xs text-gray-500 flex items-center mt-1"><MapPin className="w-3 h-3 mr-1"/> {locName}</div>
                                                <div className="flex gap-1 mt-1">
                                                    {parseBool(act.RequirePhoto) && <span title="Require Photo"><Camera className="w-3 h-3 text-blue-500" /></span>}
                                                    {parseBool(act.IsLocked) && <span title="Locked"><Lock className="w-3 h-3 text-orange-500" /></span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-gray-700 font-medium">{act.Category || '-'}</div>
                                                <div className="text-xs text-gray-500">{act.Levels || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${status.color}`}>{status.label}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="text-sm font-bold text-gray-800">{act.CurrentCount || 0} / {act.Capacity || '∞'}</div>
                                                <div className="text-[10px] text-gray-400">Checked In</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => handleStatusClick(act)} className="p-1.5 border rounded hover:bg-gray-100" title="Toggle Status"><Power className="w-4 h-4 text-gray-600"/></button>
                                                    <button onClick={() => handleEdit(act)} className="p-1.5 border rounded hover:bg-blue-50" title="Edit"><Edit2 className="w-4 h-4 text-blue-600"/></button>
                                                    <button onClick={() => handleDeleteClick(act)} className="p-1.5 border rounded hover:bg-red-50" title="Delete"><Trash2 className="w-4 h-4 text-red-600"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                description={`คุณต้องการเปลี่ยนสถานะเป็น "${statusModal.nextStatus || 'AUTO'}" ใช่หรือไม่?`}
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
