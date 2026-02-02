
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppData, CheckInActivity } from '../../types';
import { Search, Plus, Activity, MapPin, Clock, Edit2, Trash2, History, Upload, Loader2, Power, AlertTriangle, Share2, CheckCircle, X, Camera, Lock, Users, Tag, LayoutGrid, List, Download, FileSpreadsheet, CheckSquare, Square, Filter, RefreshCw, AlertOctagon, ChevronLeft, ChevronRight, ArrowUpDown, QrCode } from 'lucide-react';
import { deleteActivity, saveActivity } from '../../services/api';
import ActivityModal from './ActivityModal';
import ConfirmationModal from '../ConfirmationModal';
import { shareCheckInActivity } from '../../services/liff';
import QRCode from 'qrcode';

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
    
    // View Mode & Pagination State
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); // Default to table for better management
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'Status', direction: 'asc' });
    
    // Selection State (Bulk Actions)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editAct, setEditAct] = useState<Partial<CheckInActivity>>({});
    
    // Notifications State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({ isOpen: false, id: '', title: '' });
    const [statusModal, setStatusModal] = useState<{ isOpen: boolean; act: CheckInActivity | null; nextStatus: 'OPEN' | 'CLOSED' | '' }>({ isOpen: false, act: null, nextStatus: '' });
    
    // Quick QR Modal State
    const [qrModal, setQrModal] = useState<{ isOpen: boolean; act: CheckInActivity | null; qrUrl: string }>({ isOpen: false, act: null, qrUrl: '' });

    // Bulk Action Modals State
    const [bulkStatusModal, setBulkStatusModal] = useState<{ isOpen: boolean; status: 'OPEN' | 'CLOSED' | '' }>({ isOpen: false, status: '' });
    const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'loading', text: string } | null>(null);
    
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Import State
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset pagination and selection when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [searchActivityQuery, activityStatusFilter, categoryFilter, levelFilter]);

    // Auto-dismiss alert (only for success/error, not loading)
    useEffect(() => {
        if (alertMessage && alertMessage.type !== 'loading') {
            const timer = setTimeout(() => setAlertMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [alertMessage]);

    const isDateValid = (d: any) => d && !isNaN(new Date(d).getTime());

    const getActivityStatus = (act: CheckInActivity) => {
        if (act.ManualOverride === 'CLOSED') return { label: 'ปิดชั่วคราว (Manual)', color: 'bg-red-500 text-white', text: 'text-red-600', key: 'ended', priority: 4 };
        if (act.ManualOverride === 'OPEN') return { label: 'เปิดพิเศษ (Manual)', color: 'bg-green-500 text-white', text: 'text-green-600', key: 'active', priority: 1 };

        const now = new Date();
        const start = isDateValid(act.StartDateTime) ? new Date(act.StartDateTime!) : null;
        const end = isDateValid(act.EndDateTime) ? new Date(act.EndDateTime!) : null;
        const count = act.CurrentCount || 0;
        const cap = act.Capacity || 0;

        if (start && start > now) return { label: 'ยังไม่เริ่ม', color: 'bg-blue-100 text-blue-700', text: 'text-blue-600', key: 'upcoming', priority: 2 };
        if (end && end < now) return { label: 'จบแล้ว', color: 'bg-gray-100 text-gray-500', text: 'text-gray-500', key: 'ended', priority: 5 };
        if (cap > 0 && count >= cap) return { label: 'เต็ม', color: 'bg-red-100 text-red-700', text: 'text-red-600', key: 'active', priority: 3 };
        return { label: 'กำลังดำเนินอยู่', color: 'bg-green-100 text-green-700', text: 'text-green-600', key: 'active', priority: 0 };
    };

    // --- Sorting Logic ---
    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredActivities = useMemo(() => {
        let result = (data.checkInActivities || []).filter(act => {
            const matchesSearch = act.Name.toLowerCase().includes(searchActivityQuery.toLowerCase());
            const status = getActivityStatus(act);
            const matchesStatus = activityStatusFilter === 'all' || status.key === activityStatusFilter;
            const matchesCategory = categoryFilter === 'all' || act.Category === categoryFilter;
            const matchesLevel = levelFilter === 'all' || (act.Levels && act.Levels.includes(levelFilter));
            
            return matchesSearch && matchesStatus && matchesCategory && matchesLevel;
        });

        // Apply Sort
        result.sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            switch (sortConfig.key) {
                case 'Name': valA = a.Name; valB = b.Name; break;
                case 'StartDateTime': valA = a.StartDateTime ? new Date(a.StartDateTime).getTime() : 0; valB = b.StartDateTime ? new Date(b.StartDateTime).getTime() : 0; break;
                case 'CurrentCount': valA = a.CurrentCount || 0; valB = b.CurrentCount || 0; break;
                case 'Status': valA = getActivityStatus(a).priority; valB = getActivityStatus(b).priority; break;
                default: valA = a.Name; valB = b.Name;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [data.checkInActivities, searchActivityQuery, activityStatusFilter, categoryFilter, levelFilter, sortConfig]);

    // --- Pagination Logic ---
    const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
    const paginatedActivities = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredActivities.slice(start, start + itemsPerPage);
    }, [filteredActivities, currentPage, itemsPerPage]);

    // --- Quick QR Preview ---
    const handleQrPreview = async (act: CheckInActivity) => {
        const url = `${window.location.origin}${window.location.pathname}#/checkin/${act.ActivityID}`;
        try {
            const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 300 });
            setQrModal({ isOpen: true, act, qrUrl: qrDataUrl });
        } catch (e) {
            console.error("QR Generation Failed", e);
        }
    };

    const getImageUrl = (idOrUrl: string) => {
        if (!idOrUrl) return '';
        if (idOrUrl.startsWith('http')) return idOrUrl;
        return `https://drive.google.com/thumbnail?id=${idOrUrl}&sz=w1000`;
    };

    // --- Bulk Actions Handlers ---

    const handleSelectAll = () => {
        if (selectedIds.size === paginatedActivities.length && paginatedActivities.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedActivities.map(a => a.ActivityID)));
        }
    };

    const handleToggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkStatusChange = (overrideStatus: 'OPEN' | 'CLOSED' | '') => {
        if (selectedIds.size === 0) return;
        setBulkStatusModal({ isOpen: true, status: overrideStatus });
    };

    const confirmBulkStatusChange = async () => {
        const overrideStatus = bulkStatusModal.status;
        setIsProcessingBulk(true);
        try {
            // Batch processing
            const ids = Array.from(selectedIds);
            const BATCH_SIZE = 5;
            for (let i = 0; i < ids.length; i += BATCH_SIZE) {
                const batch = ids.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(id => {
                    const act = data.checkInActivities.find(a => a.ActivityID === id);
                    if (act) return saveActivity({ ...act, ManualOverride: overrideStatus });
                    return Promise.resolve();
                }));
                await new Promise(r => setTimeout(r, 200));
            }
            setAlertMessage({ type: 'success', text: 'อัปเดตสถานะกลุ่มสำเร็จ' });
            onDataUpdate();
            setSelectedIds(new Set());
        } catch (e) {
            setAlertMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' });
        } finally {
            setIsProcessingBulk(false);
            setBulkStatusModal({ isOpen: false, status: '' });
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        setBulkDeleteModal(true);
    };

    const confirmBulkDelete = async () => {
        setIsProcessingBulk(true);
        try {
            const ids = Array.from(selectedIds);
            const BATCH_SIZE = 5;
            for (let i = 0; i < ids.length; i += BATCH_SIZE) {
                const batch = ids.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(id => deleteActivity(id)));
                await new Promise(r => setTimeout(r, 300));
            }
            setAlertMessage({ type: 'success', text: 'ลบข้อมูลกลุ่มสำเร็จ' });
            onDataUpdate();
            setSelectedIds(new Set());
        } catch (e) {
            setAlertMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบ' });
        } finally {
            setIsProcessingBulk(false);
            setBulkDeleteModal(false);
        }
    };

    // --- Export / Import Handlers ---

    const handleExportCSV = () => {
        const headers = ['Name', 'LocationID', 'Description', 'StartDateTime', 'EndDateTime', 'Capacity', 'Category', 'Levels', 'Mode', 'ReqStudents', 'ReqTeachers', 'Status', 'ManualOverride'];
        const csvContent = [
            headers.join(','),
            ...filteredActivities.map(act => [
                `"${(act.Name || '').replace(/"/g, '""')}"`,
                act.LocationID,
                `"${(act.Description || '').replace(/"/g, '""')}"`,
                act.StartDateTime || '',
                act.EndDateTime || '',
                act.Capacity || 0,
                act.Category || '',
                `"${(act.Levels || '').replace(/"/g, '""')}"`,
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
        const headers = ['Name', 'LocationID', 'Description', 'StartDateTime', 'EndDateTime', 'Capacity', 'Category', 'Levels', 'Mode', 'ReqStudents', 'ReqTeachers', 'RequirePhoto', 'IsLocked'];
        const sample1 = ['"การแข่งขันหุ่นยนต์"', 'LOC-001', '"รายละเอียดกิจกรรม\nสามารถขึ้นบรรทัดใหม่ได้"', '2026-01-31T09:00:00+07:00', '2026-01-31T12:00:00+07:00', '0', 'หุ่นยนต์', 'ม.1-3', 'Team', '3', '1', 'FALSE', 'FALSE'];
        const sample2 = ['"การประกวดโครงงาน"', 'LOC-002', '"จัดที่ห้องประชุม"', '2026-01-31T13:00:00+07:00', '2026-01-31T16:00:00+07:00', '20', 'วิทยาศาสตร์', 'ป.4-6', 'Team', '3', '1', 'TRUE', 'FALSE'];
        
        const csvContent = "\uFEFF" + [headers.join(','), sample1.join(','), sample2.join(',')].join('\n');
        
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
        setAlertMessage({ type: 'loading', text: 'กำลังตรวจสอบข้อมูล...' });

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                let text = reader.result as string;
                if (!text) return;
                
                if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);

                // Simple Parser (Can reuse the robust one from previous iteration if preferred)
                // Using Robust Parser Logic for Safety
                const rows: string[][] = [];
                let currentRow: string[] = [];
                let currentField = '';
                let inQuotes = false;

                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    const nextChar = text[i + 1];
                    if (inQuotes) {
                        if (char === '"') {
                            if (nextChar === '"') { currentField += '"'; i++; } else { inQuotes = false; }
                        } else { currentField += char; }
                    } else {
                        if (char === '"') { inQuotes = true; } 
                        else if (char === ',') { currentRow.push(currentField.trim()); currentField = ''; } 
                        else if (char === '\r' || char === '\n') {
                            if (char === '\r' && nextChar === '\n') i++;
                            currentRow.push(currentField.trim());
                            rows.push(currentRow);
                            currentRow = [];
                            currentField = '';
                        } else { currentField += char; }
                    }
                }
                if (currentField || currentRow.length > 0) { currentRow.push(currentField.trim()); rows.push(currentRow); }

                const validRows = rows.filter(r => r.length > 0 && r.some(c => c !== ''));
                const actsToSave: Partial<CheckInActivity>[] = [];
                let updateCount = 0;
                let createCount = 0;

                // Existing Map for quick lookup - Explicitly typed to fix inference issues
                const existingMap = new Map<string, CheckInActivity>(
                    data.checkInActivities.map(a => [a.Name.toLowerCase().trim(), a] as [string, CheckInActivity])
                );

                // Skip header (i=1)
                for (let i = 1; i < validRows.length; i++) {
                    const cols = validRows[i];
                    if (cols.length >= 1 && cols[0]) {
                        const actName = cols[0];
                        const parseDate = (d: string) => {
                            if (!d) return '';
                            const cleanDate = d.trim();
                            const parsed = new Date(cleanDate);
                            if (!isNaN(parsed.getTime())) return parsed.toISOString();
                            return '';
                        };

                        // Check duplicate
                        const existingAct = existingMap.get(actName.toLowerCase().trim());
                        
                        const newAct: Partial<CheckInActivity> = {
                            ActivityID: existingAct ? existingAct.ActivityID : undefined, // Keep ID if updating
                            Name: actName,
                            LocationID: cols[1] || existingAct?.LocationID || '',
                            Description: cols[2] || existingAct?.Description || '',
                            StartDateTime: parseDate(cols[3]) || existingAct?.StartDateTime,
                            EndDateTime: parseDate(cols[4]) || existingAct?.EndDateTime,
                            Capacity: parseInt(cols[5]) || existingAct?.Capacity || 0,
                            Category: cols[6] || existingAct?.Category || '',
                            Levels: cols[7] || existingAct?.Levels || '',
                            Mode: cols[8] || existingAct?.Mode || '',
                            ReqStudents: parseInt(cols[9]) || existingAct?.ReqStudents || 0,
                            ReqTeachers: parseInt(cols[10]) || existingAct?.ReqTeachers || 0,
                            RequirePhoto: (cols[11] || '').toUpperCase() === 'TRUE',
                            IsLocked: (cols[12] || '').toUpperCase() === 'TRUE',
                            Status: 'Active',
                            ManualOverride: ''
                        };
                        
                        if (existingAct) updateCount++; else createCount++;
                        actsToSave.push(newAct);
                    }
                }

                if (actsToSave.length > 0) {
                    setAlertMessage({ type: 'loading', text: `กำลังบันทึก (ใหม่: ${createCount}, อัปเดต: ${updateCount})...` });
                    
                    const BATCH_SIZE = 3;
                    for (let i = 0; i < actsToSave.length; i += BATCH_SIZE) {
                        const batch = actsToSave.slice(i, i + BATCH_SIZE);
                        await Promise.all(batch.map(act => saveActivity(act)));
                        if (i + BATCH_SIZE < actsToSave.length) await new Promise(r => setTimeout(r, 500));
                    }

                    setAlertMessage({ type: 'success', text: `บันทึกสำเร็จ (ใหม่: ${createCount}, อัปเดต: ${updateCount})` });
                    onDataUpdate();
                } else {
                    setAlertMessage({ type: 'error', text: 'ไม่พบข้อมูลในไฟล์ CSV' });
                }

            } catch (err) {
                console.error(err);
                setAlertMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการอ่านไฟล์ CSV' });
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
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
        setAlertMessage({ type: 'success', text: 'ลบกิจกรรมสำเร็จ' });
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
        setAlertMessage({ type: 'success', text: 'อัปเดตสถานะสำเร็จ' });
    };

    const handleShare = async (act: CheckInActivity) => {
        const location = (data.checkInLocations || []).find(l => l.LocationID === act.LocationID);
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

    const getStatusModalContent = (nextStatus: string) => {
        if (nextStatus === 'OPEN') {
            return (
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center mt-2">
                    <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                    <h4 className="font-bold text-green-800">เปิดระบบเช็คอิน (Force Open)</h4>
                    <p className="text-xs text-green-600 mt-1 text-center">
                        ระบบจะเปิดให้เช็คอินได้ทันทีโดยไม่สนใจเวลาเริ่มต้น-สิ้นสุด 
                    </p>
                </div>
            );
        } else if (nextStatus === 'CLOSED') {
            return (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col items-center mt-2">
                    <AlertOctagon className="w-10 h-10 text-red-500 mb-2" />
                    <h4 className="font-bold text-red-800">ปิดระบบเช็คอิน (Force Close)</h4>
                    <p className="text-xs text-red-600 mt-1 text-center">
                        ระบบจะปิดรับการเช็คอินทันที ผู้ใช้งานจะไม่สามารถเช็คอินได้
                    </p>
                </div>
            );
        } else {
            return (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center mt-2">
                    <RefreshCw className="w-10 h-10 text-blue-500 mb-2" />
                    <h4 className="font-bold text-blue-800">โหมดอัตโนมัติ (Auto / Default)</h4>
                    <p className="text-xs text-blue-600 mt-1 text-center">
                        ระบบจะเปิด-ปิดตามเวลา Start/End DateTime และจำนวน Capacity
                    </p>
                </div>
            );
        }
    };

    return (
        <div className="space-y-4 relative">
            
            {/* Global Alert Toast */}
            {alertMessage && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[300] px-6 py-3 rounded-full shadow-xl flex items-center animate-in slide-in-from-top-5 fade-in duration-300 ${
                    alertMessage.type === 'success' ? 'bg-green-600 text-white' : 
                    alertMessage.type === 'error' ? 'bg-red-600 text-white' : 
                    'bg-blue-600 text-white'
                }`}>
                    {alertMessage.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : 
                     alertMessage.type === 'error' ? <AlertTriangle className="w-5 h-5 mr-2" /> :
                     <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                    <span className="font-bold text-sm">{alertMessage.text}</span>
                    {alertMessage.type !== 'loading' && (
                        <button onClick={() => setAlertMessage(null)} className="ml-4 opacity-80 hover:opacity-100"><X className="w-4 h-4"/></button>
                    )}
                </div>
            )}

            {/* Quick QR Modal */}
            {qrModal.isOpen && (
                <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl animate-in zoom-in-95">
                        <button onClick={() => setQrModal({ isOpen: false, act: null, qrUrl: '' })} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-500"/></button>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{qrModal.act?.Name}</h3>
                        <p className="text-sm text-gray-500 mb-6">Scan to Check-in</p>
                        <div className="bg-white p-2 rounded-xl border-4 border-dashed border-gray-200 inline-block mb-4">
                            <img src={qrModal.qrUrl} alt="QR Code" className="w-48 h-48 object-contain" />
                        </div>
                        <div className="flex justify-center">
                            <a href={qrModal.qrUrl} download={`qr_${qrModal.act?.ActivityID}.png`} className="text-blue-600 text-sm font-bold hover:underline flex items-center"><Download className="w-4 h-4 mr-1"/> Download Image</a>
                        </div>
                    </div>
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

                    {/* Pagination Selector */}
                    <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2 py-1 ml-auto">
                        <span className="text-[10px] text-gray-500">แสดง:</span>
                        <select className="text-xs bg-transparent outline-none py-1" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>

                    <div className="flex gap-2 ml-2">
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
                    {paginatedActivities.map(act => {
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
                                        <button onClick={() => handleQrPreview(act)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="QR Code"><QrCode className="w-4 h-4" /></button>
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
                                            <div className="flex items-center gap-1"><MapPin className="w-3 h-3"/> <span className="truncate">{(data.checkInLocations || []).find(l => l.LocationID === act.LocationID)?.Name || 'Unknown'}</span></div>
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
                                            {selectedIds.size === paginatedActivities.length && paginatedActivities.length > 0 ? <CheckSquare className="w-5 h-5 text-blue-600"/> : <Square className="w-5 h-5"/>}
                                        </button>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Name')}>
                                        กิจกรรม <ArrowUpDown className="w-3 h-3 inline ml-1"/>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">หมวดหมู่/ระดับ</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Status')}>
                                        สถานะ <ArrowUpDown className="w-3 h-3 inline ml-1"/>
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('CurrentCount')}>
                                        Stats <ArrowUpDown className="w-3 h-3 inline ml-1"/>
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedActivities.map(act => {
                                    const status = getActivityStatus(act);
                                    const locName = (data.checkInLocations || []).find(l => l.LocationID === act.LocationID)?.Name || '-';
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
                                                    <button onClick={() => handleQrPreview(act)} className="p-1.5 border rounded hover:bg-gray-100" title="Show QR"><QrCode className="w-4 h-4 text-gray-500"/></button>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 px-4 py-2 bg-white rounded-xl border border-gray-100">
                    <div className="text-xs text-gray-500">
                        แสดงหน้า {currentPage} จาก {totalPages} (ทั้งหมด {filteredActivities.length} รายการ)
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded border hover:bg-gray-50 disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let p = currentPage;
                                if (totalPages <= 5) p = i + 1;
                                else if (currentPage <= 3) p = i + 1;
                                else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                                else p = currentPage - 2 + i;

                                return (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-6 h-6 text-xs rounded ${currentPage === p ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded border hover:bg-gray-50 disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {filteredActivities.length === 0 && <div className="text-center py-10 text-gray-400">ไม่พบกิจกรรม</div>}

            <ActivityModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                initialData={editAct}
                locations={data.checkInLocations || []} 
                onSuccess={onDataUpdate}
            />

            {/* Individual Delete Modal */}
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

            {/* Single Status Change Modal */}
            <ConfirmationModal
                isOpen={statusModal.isOpen}
                title="ยืนยันการเปลี่ยนสถานะ"
                description="" 
                confirmLabel="ยืนยันการเปลี่ยนสถานะ"
                confirmColor={statusModal.nextStatus === 'OPEN' ? 'green' : statusModal.nextStatus === 'CLOSED' ? 'red' : 'blue'}
                onConfirm={handleConfirmStatus}
                onCancel={() => setStatusModal({ ...statusModal, isOpen: false })}
                actionType="updateStatus"
            >
                {getStatusModalContent(statusModal.nextStatus)}
            </ConfirmationModal>

            {/* Bulk Status Change Modal */}
            <ConfirmationModal
                isOpen={bulkStatusModal.isOpen}
                title={`ยืนยันการเปลี่ยนสถานะ ${selectedIds.size} รายการ`}
                description="คุณต้องการเปลี่ยนสถานะกิจกรรมที่เลือกทั้งหมดใช่หรือไม่?"
                confirmLabel="ยืนยัน"
                confirmColor={bulkStatusModal.status === 'OPEN' ? 'green' : bulkStatusModal.status === 'CLOSED' ? 'red' : 'blue'}
                onConfirm={confirmBulkStatusChange}
                onCancel={() => setBulkStatusModal({ isOpen: false, status: '' })}
                isLoading={isProcessingBulk}
                actionType="updateStatus"
            >
                {getStatusModalContent(bulkStatusModal.status)}
            </ConfirmationModal>

            {/* Bulk Delete Modal */}
            <ConfirmationModal
                isOpen={bulkDeleteModal}
                title={`ยืนยันการลบ ${selectedIds.size} รายการ`}
                description="คุณต้องการลบกิจกรรมที่เลือกทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้"
                confirmLabel="ลบข้อมูล"
                confirmColor="red"
                onConfirm={confirmBulkDelete}
                onCancel={() => setBulkDeleteModal(false)}
                isLoading={isProcessingBulk}
                actionType="delete"
            />
        </div>
    );
};

export default ActivitiesTab;
