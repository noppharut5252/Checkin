
import React, { useState, useEffect, useRef } from 'react';
import { CheckInActivity, CheckInLocation } from '../../types';
import { Loader2, Upload, X, Camera, Save } from 'lucide-react';
import { saveActivity, uploadImage } from '../../services/api';
import { resizeImage } from '../../services/utils';

interface ActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: Partial<CheckInActivity>;
    locations: CheckInLocation[];
    onSuccess: () => void;
}

const ActivityModal: React.FC<ActivityModalProps> = ({ isOpen, onClose, initialData, locations, onSuccess }) => {
    const [editAct, setEditAct] = useState<Partial<CheckInActivity>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) setEditAct(initialData);
    }, [isOpen, initialData]);

    const getSafeDateValue = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 16);
    };

    const handleSaveActivity = async () => {
        setIsSaving(true);
        const res = await saveActivity(editAct);
        setIsSaving(false);
        if (res.status === 'success') {
            onSuccess();
            onClose();
        } else {
            alert('บันทึกกิจกรรมล้มเหลว: ' + (res.message || 'Unknown error'));
        }
    };

    const handleActivityImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const base64 = await resizeImage(file, 800, 600, 0.8);
            const res = await uploadImage(base64, `activity_${Date.now()}.jpg`);
            if (res.status === 'success') {
                const url = res.fileId ? `https://drive.google.com/thumbnail?id=${res.fileId}&sz=w1000` : res.fileUrl;
                setEditAct(prev => ({ ...prev, Image: url }));
            } else { alert('Upload failed: ' + res.message); }
        } catch (err) { console.error(err); alert('Error uploading image'); }
        finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-lg font-bold text-gray-800">{editAct.ActivityID ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรม'}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="w-6 h-6 text-gray-400"/>
                    </button>
                </div>
                
                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                    {/* Image Upload */}
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
                        {locations.map(l => <option key={l.LocationID} value={l.LocationID}>{l.Name}</option>)}
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
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                    <button 
                        onClick={handleSaveActivity} 
                        disabled={isSaving || isUploading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2"/>} บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActivityModal;
