
import React, { useState, useEffect } from 'react';
import { AppData, PassportConfig, PassportMission, PassportRequirement } from '../../types';
import { Save, Plus, Trash2, Calendar, Target, Award, ListPlus, Loader2, CheckCircle, X, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { savePassportConfig } from '../../services/api';
import SearchableSelect from '../SearchableSelect';

interface PassportSettingsProps {
    data: AppData;
    onDataUpdate: () => void;
}

const PassportSettings: React.FC<PassportSettingsProps> = ({ data, onDataUpdate }) => {
    const [config, setConfig] = useState<PassportConfig>(data.passportConfig || { missions: [] });
    const [isSaving, setIsSaving] = useState(false);
    const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Auto-hide alert after 3 seconds
    useEffect(() => {
        if (alertMessage) {
            const timer = setTimeout(() => setAlertMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [alertMessage]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await savePassportConfig(config);
            setAlertMessage({ type: 'success', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' });
            onDataUpdate();
        } catch (e) {
            setAlertMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก' });
        } finally {
            setIsSaving(false);
        }
    };

    const addMission = () => {
        const newMission: PassportMission = {
            id: `m-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            title: 'ภารกิจใหม่',
            requirements: [],
            rewardColor: 'bg-yellow-500',
            rewardLabel: 'Completed'
        };
        setConfig(prev => ({ missions: [...prev.missions, newMission] }));
        setActiveMissionId(newMission.id);
    };

    const updateMission = (id: string, field: keyof PassportMission, value: any) => {
        setConfig(prev => ({
            missions: prev.missions.map(m => m.id === id ? { ...m, [field]: value } : m)
        }));
    };

    const deleteMission = (id: string) => {
        if(!confirm('ยืนยันการลบภารกิจนี้?')) return;
        setConfig(prev => ({ missions: prev.missions.filter(m => m.id !== id) }));
        if (activeMissionId === id) setActiveMissionId(null);
    };

    const moveMission = (index: number, direction: 'up' | 'down') => {
        const newMissions = [...config.missions];
        if (direction === 'up' && index > 0) {
            [newMissions[index], newMissions[index - 1]] = [newMissions[index - 1], newMissions[index]];
        } else if (direction === 'down' && index < newMissions.length - 1) {
            [newMissions[index], newMissions[index + 1]] = [newMissions[index + 1], newMissions[index]];
        }
        setConfig(prev => ({ ...prev, missions: newMissions }));
    };

    const addRequirement = (missionId: string) => {
        const newReq: PassportRequirement = {
            id: `r-${Date.now()}`,
            type: 'specific_activity',
            label: 'เข้าร่วมกิจกรรม...',
            targetValue: 1
        };
        setConfig(prev => ({
            missions: prev.missions.map(m => m.id === missionId ? { ...m, requirements: [...m.requirements, newReq] } : m)
        }));
    };

    const updateRequirement = (missionId: string, reqId: string, field: keyof PassportRequirement, value: any) => {
        setConfig(prev => ({
            missions: prev.missions.map(m => {
                if (m.id !== missionId) return m;
                return {
                    ...m,
                    requirements: m.requirements.map(r => r.id === reqId ? { ...r, [field]: value } : r)
                };
            })
        }));
    };

    const removeRequirement = (missionId: string, reqId: string) => {
        setConfig(prev => ({
            missions: prev.missions.map(m => {
                if (m.id !== missionId) return m;
                return {
                    ...m,
                    requirements: m.requirements.filter(r => r.id !== reqId)
                };
            })
        }));
    };

    const activityOptions = data.activities.map(a => ({ label: a.name, value: a.id }));
    const categoryOptions = Array.from(new Set(data.activities.map(a => a.category))).map(c => ({ label: c, value: c }));

    const activeMission = config.missions.find(m => m.id === activeMissionId);

    return (
        <div className="space-y-6 relative">
            
            {/* Toast Notification */}
            {alertMessage && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[300] px-6 py-3 rounded-full shadow-xl flex items-center animate-in slide-in-from-top-5 fade-in duration-300 ${alertMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {alertMessage.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertTriangle className="w-5 h-5 mr-2" />}
                    <span className="font-bold text-sm">{alertMessage.text}</span>
                    <button onClick={() => setAlertMessage(null)} className="ml-4 opacity-80 hover:opacity-100"><X className="w-4 h-4"/></button>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Award className="w-6 h-6 mr-2 text-indigo-600"/> ตั้งค่า Passport ภารกิจ
                    </h2>
                    <p className="text-gray-500 text-sm">กำหนดเงื่อนไขการผ่านด่านและการรับตราประทับในแต่ละวัน</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center hover:bg-indigo-700 disabled:opacity-70 shadow-sm transition-all active:scale-95"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                    บันทึกทั้งหมด
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Mission List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">รายการภารกิจ</h3>
                        <button onClick={addMission} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[600px] p-2 space-y-2">
                        {config.missions.map((m, idx) => (
                            <div 
                                key={m.id}
                                onClick={() => setActiveMissionId(m.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex gap-2 ${activeMissionId === m.id ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                            >
                                <div className="flex flex-col gap-1 justify-center">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); moveMission(idx, 'up'); }}
                                        disabled={idx === 0}
                                        className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30 hover:bg-gray-100 rounded"
                                    >
                                        <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); moveMission(idx, 'down'); }}
                                        disabled={idx === config.missions.length - 1}
                                        className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30 hover:bg-gray-100 rounded"
                                    >
                                        <ArrowDown className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div className="truncate">
                                            <div className="font-bold text-sm text-gray-800 truncate">{m.title}</div>
                                            <div className="text-xs text-gray-500 flex items-center mt-1">
                                                <Calendar className="w-3 h-3 mr-1" /> {new Date(m.date).toLocaleDateString('th-TH')}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteMission(m.id); }}
                                            className="text-gray-400 hover:text-red-500 p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2 flex gap-1">
                                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                            {m.requirements.length} เงื่อนไข
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {config.missions.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีภารกิจ</div>}
                    </div>
                </div>

                {/* Mission Editor */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    {activeMission ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อภารกิจ</label>
                                    <input 
                                        className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        value={activeMission.title} 
                                        onChange={e => updateMission(activeMission.id, 'title', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">วันที่ (Date)</label>
                                    <input 
                                        type="date" 
                                        className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        value={activeMission.date} 
                                        onChange={e => updateMission(activeMission.id, 'date', e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">รายละเอียด / คำอธิบาย (รองรับการขึ้นบรรทัดใหม่)</label>
                                <textarea 
                                    className="w-full border rounded p-2 text-sm h-28 resize-none focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed" 
                                    value={activeMission.description || ''} 
                                    onChange={e => updateMission(activeMission.id, 'description', e.target.value)}
                                    placeholder="เช่น ต้องเข้าร่วมกิจกรรมหลัก...&#10;1. กิจกรรม A&#10;2. กิจกรรม B"
                                />
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-gray-800 flex items-center">
                                        <ListPlus className="w-5 h-5 mr-2 text-blue-600" /> เงื่อนไขการผ่าน (Requirements)
                                    </h4>
                                    <button onClick={() => addRequirement(activeMission.id)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100">
                                        + เพิ่มเงื่อนไข
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {activeMission.requirements.map((req, idx) => (
                                        <div key={req.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col md:flex-row gap-3 items-start md:items-center">
                                            <div className="bg-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-500 border shrink-0">
                                                {idx + 1}
                                            </div>
                                            
                                            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-2">
                                                <select 
                                                    className="border rounded p-1.5 text-sm bg-white"
                                                    value={req.type}
                                                    onChange={e => updateRequirement(activeMission.id, req.id, 'type', e.target.value)}
                                                >
                                                    <option value="specific_activity">กิจกรรมบังคับ (Specific Activity)</option>
                                                    <option value="total_count">จำนวนเช็คอินรวม (Total Check-ins)</option>
                                                    <option value="category_count">จำนวนตามหมวด (Category Count)</option>
                                                </select>

                                                {req.type === 'specific_activity' && (
                                                    <SearchableSelect 
                                                        options={activityOptions}
                                                        value={req.targetId || ''}
                                                        onChange={val => updateRequirement(activeMission.id, req.id, 'targetId', val)}
                                                        placeholder="เลือกกิจกรรม..."
                                                        className="md:col-span-2"
                                                    />
                                                )}

                                                {req.type === 'category_count' && (
                                                    <SearchableSelect 
                                                        options={categoryOptions}
                                                        value={req.targetId || ''}
                                                        onChange={val => updateRequirement(activeMission.id, req.id, 'targetId', val)}
                                                        placeholder="เลือกหมวดหมู่..."
                                                    />
                                                )}

                                                {(req.type === 'total_count' || req.type === 'category_count') && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs whitespace-nowrap">จำนวน:</span>
                                                        <input 
                                                            type="number" min="1"
                                                            className="border rounded p-1.5 text-sm w-full"
                                                            value={req.targetValue}
                                                            onChange={e => updateRequirement(activeMission.id, req.id, 'targetValue', parseInt(e.target.value))}
                                                        />
                                                    </div>
                                                )}
                                                
                                                <input 
                                                    className="border rounded p-1.5 text-sm md:col-span-3"
                                                    placeholder="ข้อความที่แสดงให้ผู้ใช้เห็น (เช่น 'เข้าฐานวิทยาศาสตร์')"
                                                    value={req.label}
                                                    onChange={e => updateRequirement(activeMission.id, req.id, 'label', e.target.value)}
                                                />
                                            </div>

                                            <button onClick={() => removeRequirement(activeMission.id, req.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {activeMission.requirements.length === 0 && (
                                        <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                                            ยังไม่มีเงื่อนไข
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="font-bold text-gray-800 mb-2 flex items-center">
                                    <Target className="w-5 h-5 mr-2 text-green-600" /> รางวัลเมื่อทำสำเร็จ (Reward)
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">ข้อความรางวัล</label>
                                        <input 
                                            className="w-full border rounded p-2 text-sm" 
                                            value={activeMission.rewardLabel} 
                                            onChange={e => updateMission(activeMission.id, 'rewardLabel', e.target.value)}
                                            placeholder="e.g. Gold Stamp"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">สีของตราประทับ</label>
                                        <div className="flex gap-2">
                                            {['bg-yellow-500', 'bg-gray-400', 'bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500'].map(color => (
                                                <button 
                                                    key={color}
                                                    className={`w-8 h-8 rounded-full ${color} ${activeMission.rewardColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                                                    onClick={() => updateMission(activeMission.id, 'rewardColor', color)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 min-h-[300px]">
                            <ListPlus className="w-16 h-16 mb-4 opacity-20" />
                            <p>เลือกภารกิจทางซ้ายเพื่อแก้ไข หรือกดปุ่ม + เพื่อสร้างใหม่</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PassportSettings;
