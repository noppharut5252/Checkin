
import React, { useState, useEffect, useRef } from 'react';
import { CheckInLocation } from '../../types';
import { Loader2, Plus, Upload, X, MousePointer2, Save } from 'lucide-react';
import { saveLocation, uploadImage } from '../../services/api';
import { resizeImage } from '../../services/utils';
import MapPicker from '../MapPicker';

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: Partial<CheckInLocation>;
    onSuccess: () => void;
}

const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, initialData, onSuccess }) => {
    const [editLoc, setEditLoc] = useState<Partial<CheckInLocation>>({});
    const [currentLocImages, setCurrentLocImages] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setEditLoc(initialData);
            try {
                if (initialData.Images) {
                    const parsed = JSON.parse(initialData.Images);
                    setCurrentLocImages(Array.isArray(parsed) ? parsed : []);
                } else if (initialData.Image) {
                    setCurrentLocImages([initialData.Image]);
                } else {
                    setCurrentLocImages([]);
                }
            } catch (e) {
                setCurrentLocImages([]);
            }
        }
    }, [isOpen, initialData]);

    const getImageUrl = (idOrUrl: string) => {
        if (!idOrUrl) return '';
        if (idOrUrl.startsWith('http')) return idOrUrl;
        return `https://drive.google.com/thumbnail?id=${idOrUrl}&sz=w1000`;
    };

    const handleSaveLocation = async () => {
        setIsSaving(true);
        const finalLoc = {
            ...editLoc,
            Images: JSON.stringify(currentLocImages),
            Image: currentLocImages.length > 0 ? currentLocImages[0] : ''
        };
        const res = await saveLocation(finalLoc);
        setIsSaving(false);
        if (res.status === 'success') {
            onSuccess();
            onClose();
        } else {
            alert('บันทึกสถานที่ล้มเหลว: ' + (res.message || 'Unknown error'));
        }
    };

    const handleLocationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsUploading(true);
        try {
            const newImageIds: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const base64 = await resizeImage(file, 800, 600, 0.8);
                const res = await uploadImage(base64, `location_${Date.now()}_${i}.jpg`);
                if (res.status === 'success') newImageIds.push(res.fileId || res.fileUrl);
            }
            setCurrentLocImages(prev => [...prev, ...newImageIds]);
        } catch (err) { console.error(err); alert('Error uploading image'); } 
        finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleRemoveLocImage = (indexToRemove: number) => {
        setCurrentLocImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">{editLoc.LocationID ? 'แก้ไขสถานที่' : 'เพิ่มสถานที่'}</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-gray-400"/></button>
                </div>
                
                <div className="space-y-4">
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
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                    <button 
                        onClick={handleSaveLocation} 
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

export default LocationModal;
