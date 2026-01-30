
import React, { useState, useMemo } from 'react';
import { AppData, CheckInActivity } from '../../types';
import { Search, Filter, Plus, Activity, MapPin, Clock, Edit2, Trash2, History } from 'lucide-react';
import { deleteActivity } from '../../services/api';
import ActivityModal from './ActivityModal';
import ConfirmationModal from '../ConfirmationModal';

interface ActivitiesTabProps {
    data: AppData;
    onDataUpdate: () => void;
    onViewLogs: (actName: string) => void;
}

const ActivitiesTab: React.FC<ActivitiesTabProps> = ({ data, onDataUpdate, onViewLogs }) => {
    const [searchActivityQuery, setSearchActivityQuery] = useState('');
    const [activityStatusFilter, setActivityStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editAct, setEditAct] = useState<Partial<CheckInActivity>>({});
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({ isOpen: false, id: '', title: '' });
    const [isDeleting, setIsDeleting] = useState(false);

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

    return (
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
                    onClick={handleAdd}
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
                            <div className="w-12 h-12 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
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
                                    onClick={() => onViewLogs(act.Name)}
                                    className="p-2 text-purple-600 hover:text-purple-800 bg-purple-50 rounded-lg hover:bg-purple-100 flex items-center gap-1 text-xs font-bold px-3"
                                    title="ดูประวัติการเช็คอิน"
                                >
                                    <History className="w-4 h-4" /> ดูประวัติ ({act.CurrentCount || 0})
                                </button>
                                <button onClick={() => handleEdit(act)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                                <button 
                                    onClick={() => handleDeleteClick(act)} 
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
        </div>
    );
};

export default ActivitiesTab;
