
import React, { useState, useEffect, useRef } from 'react';
import { CheckInActivity, CheckInLocation } from '../../types';
import { Loader2, Upload, X, Camera, Save, Layers, Users, Tag, Power, Image, Lock, ShieldAlert, Trash2, FileText } from 'lucide-react';
import { saveActivity, uploadImage } from '../../services/api';
import { resizeImage, getThaiDateTimeValue, thaiInputToISO } from '../../services/utils';

interface ActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: Partial<CheckInActivity>;
    locations: CheckInLocation[];
    onSuccess: () => void;
}

const CATEGORY_OPTIONS = [
    'วิทยาศาสตร์', 'คณิตศาสตร์', 'ภาษาไทย', 'ภาษาอังกฤษ', 'สังคมศึกษา',
    'ศิลปะ', 'ดนตรี', 'นาฏศิลป์', 'การงานอาชีพ', 'คอมพิวเตอร์', 'หุ่นยนต์',
    'ปฐมวัย', 'กิจกรรมพัฒนาผู้เรียน'
];

const LEVEL_OPTIONS = [
    'ป.1-3', 'ป.4-6', 'ม.1-3', 'ม.4-6', 'ป.1-6', 'ม.1-6', 'ปฐมวัย'
];

const ActivityModal: React.FC<ActivityModalProps> = ({ isOpen, onClose, initialData, locations, onSuccess }) => {
    const [editAct, setEditAct] = useState<Partial<CheckInActivity>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Helper to handle diverse boolean formats from Google Sheets (Boolean, String 'TRUE', 1, etc.)
            const parseBool = (val: any) => {
                if (typeof val === 'boolean') return val;
                if (typeof val === 'string') return val.toUpperCase() === 'TRUE';
                return !!val;
            };

            setEditAct({
                ...initialData,
                // Ensure empty strings instead of undefined for inputs
                Category: initialData.Category || '',
                Mode: initialData.Mode || '',
                Levels: initialData.Levels || '',
                ReqStudents: initialData.ReqStudents || 0,
                ReqTeachers: initialData.ReqTeachers || 0,
                SurveyLink: initialData.SurveyLink || '',
                // Boolean Flags
                RequirePhoto: parseBool(initialData.RequirePhoto),
                IsLocked: parseBool(initialData.IsLocked),
                IsAreaLocked: parseBool(initialData.IsAreaLocked)
            });
        }
    }, [isOpen, initialData]);

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

    const handleRemoveImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('ต้องการลบรูปภาพปกนี้ใช่หรือไม่?')) {
            setEditAct(prev => ({ ...prev, Image: '' }));
        }
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
                
                <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {/* Image Upload */}
                    <div className="flex justify-center">
                        <div 
                            className="w-full h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors relative overflow-hidden group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {editAct.Image ? (
                                <>
                                    <img src={editAct.Image} className="w-full h-full object-cover" alt="Preview" />
                                    {/* Delete Button Overlay */}
                                    <button 
                                        onClick={handleRemoveImage}
                                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md z-10 transition-transform hover:scale-110"
                                        title="ลบรูปภาพ"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center text-gray-400">
                                    {isUploading ? <Loader2 className="w-8 h-8 animate-spin"/> : <Upload className="w-8 h-8 mb-2"/>}
                                    <span className="text-xs">{isUploading ? 'Uploading...' : 'รูปปกกิจกรรม (Optional)'}</span>
                                </div>
                            )}
                            {!editAct.Image && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleActivityImageUpload} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อกิจกรรม</label>
                        <input className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ระบุชื่อกิจกรรม..." value={editAct.Name || ''} onChange={e => setEditAct({...editAct, Name: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center"><Tag className="w-3 h-3 mr-1"/> หมวดหมู่ (Category)</label>
                            <input 
                                list="category-options"
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                                placeholder="เลือกหรือพิมพ์เอง..." 
                                value={editAct.Category || ''} 
                                onChange={e => setEditAct({...editAct, Category: e.target.value})} 
                            />
                            <datalist id="category-options">
                                {CATEGORY_OPTIONS.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center"><Users className="w-3 h-3 mr-1"/> รูปแบบ (Mode)</label>
                            <select 
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white" 
                                value={editAct.Mode || ''} 
                                onChange={e => setEditAct({...editAct, Mode: e.target.value})}
                            >
                                <option value="">-- เลือก --</option>
                                <option value="Individual">เดี่ยว (Individual)</option>
                                <option value="Team">ทีม (Team)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center"><Layers className="w-3 h-3 mr-1"/> ระดับชั้น (Levels)</label>
                            <input 
                                list="level-options"
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                                placeholder="เลือกหรือพิมพ์เอง..." 
                                value={editAct.Levels || ''} 
                                onChange={e => setEditAct({...editAct, Levels: e.target.value})} 
                            />
                            <datalist id="level-options">
                                {LEVEL_OPTIONS.map(l => <option key={l} value={l} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center"><Power className="w-3 h-3 mr-1"/> สถานะ (Status)</label>
                            <select 
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white" 
                                value={editAct.Status || 'Active'} 
                                onChange={e => setEditAct({...editAct, Status: e.target.value})}
                            >
                                <option value="Active">Active (เปิดใช้งาน)</option>
                                <option value="Inactive">Inactive (ปิดใช้งาน)</option>
                                <option value="Completed">Completed (เสร็จสิ้น)</option>
                            </select>
                        </div>
                    </div>

                    {/* Competition Rules */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <label className="block text-xs font-bold text-gray-700 mb-2">ข้อกำหนดผู้เข้าแข่งขัน (Requirements)</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-gray-500 block mb-1">จำนวนนักเรียน</label>
                                <input 
                                    type="number" 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                                    placeholder="0"
                                    value={editAct.ReqStudents}
                                    onChange={e => setEditAct({...editAct, ReqStudents: parseInt(e.target.value) || 0})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 block mb-1">จำนวนครูผู้ฝึกสอน</label>
                                <input 
                                    type="number" 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                                    placeholder="0"
                                    value={editAct.ReqTeachers}
                                    onChange={e => setEditAct({...editAct, ReqTeachers: parseInt(e.target.value) || 0})}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Flags & Toggles */}
                    <div className="space-y-2">
                        {/* Require Photo Toggle */}
                        <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div className="p-2 bg-white rounded-full border border-blue-200 text-blue-600">
                                <Image className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-800">บังคับถ่ายรูป (Require Photo)</h4>
                                <p className="text-[10px] text-gray-500">ผู้ใช้ต้องถ่ายรูปยืนยันจึงจะเช็คอินได้</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={editAct.RequirePhoto === true}
                                    onChange={(e) => setEditAct({...editAct, RequirePhoto: e.target.checked})}
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* Cluster Lock */}
                        <div className="flex items-center gap-3 bg-orange-50 p-3 rounded-lg border border-orange-100">
                            <div className="p-2 bg-white rounded-full border border-orange-200 text-orange-600">
                                <Lock className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-800">ปิดการแก้ไขระดับกลุ่ม (Cluster Lock)</h4>
                                <p className="text-[10px] text-gray-500">โรงเรียนจะไม่สามารถแก้ไขข้อมูลทีมได้</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={editAct.IsLocked === true}
                                    onChange={(e) => setEditAct({...editAct, IsLocked: e.target.checked})}
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
                        </div>

                        {/* Area Lock */}
                        <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-lg border border-purple-100">
                            <div className="p-2 bg-white rounded-full border border-purple-200 text-purple-600">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-800">ปิดการแก้ไขระดับเขต (Area Lock)</h4>
                                <p className="text-[10px] text-gray-500">ประธานกลุ่มจะไม่สามารถแก้ไขข้อมูลทีมได้</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={editAct.IsAreaLocked === true}
                                    onChange={(e) => setEditAct({...editAct, IsAreaLocked: e.target.checked})}
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Survey Link */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center">
                            <FileText className="w-3 h-3 mr-1" /> ลิงก์แบบประเมิน (Google Form URL)
                        </label>
                        <input 
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="https://forms.gle/..." 
                            value={editAct.SurveyLink || ''} 
                            onChange={e => setEditAct({...editAct, SurveyLink: e.target.value})} 
                        />
                        <p className="text-[10px] text-gray-400 mt-1">ผู้ใช้จะเห็นปุ่มประเมินหลังจากเช็คอินสำเร็จ</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">สถานที่ (Location)</label>
                        <select 
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={editAct.LocationID || ''}
                            onChange={e => setEditAct({...editAct, LocationID: e.target.value})}
                        >
                            <option value="">-- เลือกสถานที่ --</option>
                            {(locations || []).map(l => <option key={l.LocationID} value={l.LocationID}>{l.Name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">รายละเอียด</label>
                        <textarea className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20" placeholder="รายละเอียดเพิ่มเติม..." value={editAct.Description || ''} onChange={e => setEditAct({...editAct, Description: e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">เวลาเริ่ม (Start)</label>
                            <input 
                                type="datetime-local" 
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                                value={getThaiDateTimeValue(editAct.StartDateTime)}
                                onChange={e => setEditAct({...editAct, StartDateTime: thaiInputToISO(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">เวลาสิ้นสุด (End)</label>
                            <input 
                                type="datetime-local" 
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                                value={getThaiDateTimeValue(editAct.EndDateTime)}
                                onChange={e => setEditAct({...editAct, EndDateTime: thaiInputToISO(e.target.value)})}
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
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">ยกเลิก</button>
                    <button 
                        onClick={handleSaveActivity} 
                        disabled={isSaving || isUploading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center shadow-md hover:bg-blue-700 disabled:opacity-70"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} 
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActivityModal;
