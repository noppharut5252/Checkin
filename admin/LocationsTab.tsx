
import React, { useState, useMemo, useRef } from 'react';
import { AppData, CheckInLocation } from '../../types';
import { Search, Plus, MapPin, Edit2, Trash2, ImageIcon, Upload, Loader2 } from 'lucide-react';
import { deleteLocation, saveLocation } from '../../services/api';
import LocationModal from './LocationModal';
import ConfirmationModal from '../ConfirmationModal';

interface LocationsTabProps {
    data: AppData;
    onDataUpdate: () => void;
}

const LocationsTab: React.FC<LocationsTabProps> = ({ data, onDataUpdate }) => {
    const [searchLocationQuery, setSearchLocationQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editLoc, setEditLoc] = useState<Partial<CheckInLocation>>({});
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({ isOpen: false, id: '', title: '' });
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Import State
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredLocations = useMemo(() => {
        return (data.checkInLocations || []).filter(loc => 
            loc.Name.toLowerCase().includes(searchLocationQuery.toLowerCase())
        );
    }, [data.checkInLocations, searchLocationQuery]);

    const getImageUrl = (idOrUrl: string) => {
        if (!idOrUrl) return '';
        if (idOrUrl.startsWith('http')) return idOrUrl;
        return `https://drive.google.com/thumbnail?id=${idOrUrl}&sz=w1000`;
    };

    const handleEdit = (loc: CheckInLocation) => {
        setEditLoc(loc);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditLoc({});
        setIsModalOpen(true);
    };

    const handleDeleteClick = (loc: CheckInLocation) => {
        const relatedActivities = (data.checkInActivities || []).filter(a => a.LocationID === loc.LocationID);
        if (relatedActivities.length > 0) {
            alert(`ไม่สามารถลบสถานที่ "${loc.Name}" ได้ เนื่องจากมีการใช้งานใน ${relatedActivities.length} กิจกรรม กรุณาลบหรือย้ายกิจกรรมออกก่อน`);
            return;
        }
        setDeleteModal({ isOpen: true, id: loc.LocationID, title: `ลบสถานที่ "${loc.Name}"?` });
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await deleteLocation(deleteModal.id);
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
            // Skip Header
            const promises = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',');
                // Format: Name, Lat, Lng, Radius, Desc
                if (cols.length >= 3) {
                    const newLoc = {
                        Name: cols[0].trim(),
                        Latitude: cols[1].trim(),
                        Longitude: cols[2].trim(),
                        RadiusMeters: cols[3]?.trim() || '100',
                        Description: cols[4]?.trim() || ''
                    };
                    promises.push(saveLocation(newLoc));
                }
            }
            await Promise.all(promises);
            setIsImporting(false);
            alert(`นำเข้าสำเร็จ ${promises.length} รายการ`);
            onDataUpdate();
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
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
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 flex items-center justify-center font-bold text-sm"
                    disabled={isImporting}
                >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4 mr-1" />} Import CSV
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
                
                <button 
                    onClick={handleAdd}
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
                        <button onClick={() => handleEdit(loc)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleDeleteClick(loc)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                    </div>
                </div>
            ))}
            {filteredLocations.length === 0 && <div className="text-center py-10 text-gray-400">ไม่พบสถานที่</div>}

            <LocationModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                initialData={editLoc} 
                onSuccess={onDataUpdate}
            />

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                title={deleteModal.title}
                description="การลบสถานที่อาจส่งผลกระทบต่อกิจกรรมที่ผูกกับสถานที่นี้ คุณแน่ใจหรือไม่?"
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

export default LocationsTab;
