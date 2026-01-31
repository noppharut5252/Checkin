
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, CheckInActivity } from '../../types';
import { Printer, FileText, MapPin, QrCode, Download, Loader2, Search, CheckSquare, Square, Filter, Palette, LayoutGrid, Type, Scaling, ArrowUpFromLine, ArrowDownToLine, ArrowLeftFromLine, ArrowRightFromLine, Sliders, Save, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { generatePosterHTML } from '../../services/printUtils';
import { getPrintConfig, savePrintConfig } from '../../services/api';

// Declare html2pdf
declare var html2pdf: any;

interface PrintablesTabProps {
    data: AppData;
}

const FONT_OPTIONS = [
    { label: 'Kanit (มาตรฐาน)', value: 'Kanit' },
    { label: 'Sarabun (ทางการ)', value: 'Sarabun' },
    { label: 'Chakra Petch (ทันสมัย)', value: 'Chakra Petch' },
    { label: 'Mali (ลายมือ)', value: 'Mali' },
    { label: 'Thasadith (หัวข้อ)', value: 'Thasadith' },
    { label: 'Bai Jamjuree (กึ่งทางการ)', value: 'Bai Jamjuree' },
];

const NotificationModal: React.FC<{ isOpen: boolean, type: 'success' | 'error' | 'warning', title: string, message: string, onClose: () => void }> = ({ isOpen, type, title, message, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${type === 'success' ? 'bg-green-100 text-green-600' : type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                    {type === 'success' && <CheckCircle className="w-8 h-8" />}
                    {(type === 'error' || type === 'warning') && <AlertTriangle className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm mb-6">{message}</p>
                <button 
                    onClick={onClose}
                    className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : type === 'warning' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
                >
                    {type === 'success' ? 'ตกลง' : 'ปิด'}
                </button>
            </div>
        </div>
    );
};

const PrintablesTab: React.FC<PrintablesTabProps> = ({ data }) => {
    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState('All');
    
    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Config Panel
    const [config, setConfig] = useState({
        layout: 'poster', 
        theme: 'blue', 
        note: '',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        fonts: {
            header: 'Kanit',
            subheader: 'Kanit',
            name: 'Kanit',
            note: 'Kanit'
        },
        fontSizes: {
            header: 42,
            subheader: 18,
            name: 32,
            note: 18
        }
    });
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [showConfigPanel, setShowConfigPanel] = useState(false);
    
    // Notification State
    const [notification, setNotification] = useState<{isOpen: boolean, type: 'success'|'error'|'warning', title: string, message: string}>({
        isOpen: false, type: 'success', title: '', message: ''
    });

    // Load Config on Mount
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const savedConfigs = await getPrintConfig();
                if (savedConfigs && savedConfigs.posterConfig) {
                    setConfig(prev => ({
                        ...prev,
                        ...savedConfigs.posterConfig,
                        margins: { ...prev.margins, ...(savedConfigs.posterConfig.margins || {}) },
                        fonts: { ...prev.fonts, ...(savedConfigs.posterConfig.fonts || {}) },
                        fontSizes: { ...prev.fontSizes, ...(savedConfigs.posterConfig.fontSizes || {}) }
                    }));
                }
            } catch (e) {
                console.error("Failed to load print config", e);
            }
        };
        loadConfig();
    }, []);

    // Derived Data
    const filteredActivities = useMemo(() => {
        return (data.checkInActivities || []).filter(act => {
            const matchesSearch = act.Name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (data.checkInLocations || []).find(l => l.LocationID === act.LocationID)?.Name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesLoc = locationFilter === 'All' || act.LocationID === locationFilter;
            return matchesSearch && matchesLoc;
        });
    }, [data.checkInActivities, data.checkInLocations, searchQuery, locationFilter]);

    // Handlers
    const handleSelectAll = () => {
        if (selectedIds.size === filteredActivities.length) {
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

    const getSelectedActivities = () => {
        return (data.checkInActivities || []).filter(a => selectedIds.has(a.ActivityID));
    };

    const updateMargin = (key: keyof typeof config.margins, val: number) => {
        setConfig(prev => ({
            ...prev,
            margins: { ...prev.margins, [key]: val }
        }));
    };

    const updateFontFamily = (key: keyof typeof config.fonts, val: string) => {
        setConfig(prev => ({
            ...prev,
            fonts: { ...prev.fonts, [key]: val }
        }));
    };

    const updateFontSize = (key: keyof typeof config.fontSizes, val: number) => {
        setConfig(prev => ({
            ...prev,
            fontSizes: { ...prev.fontSizes, [key]: val }
        }));
    };

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        try {
            await savePrintConfig(config);
            setNotification({
                isOpen: true,
                type: 'success',
                title: 'บันทึกสำเร็จ',
                message: 'บันทึกการตั้งค่ารูปแบบป้ายเรียบร้อยแล้ว'
            });
        } catch (e) {
            console.error(e);
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'เกิดข้อผิดพลาด',
                message: 'ไม่สามารถบันทึกการตั้งค่าได้ กรุณาลองใหม่อีกครั้ง'
            });
        } finally {
            setIsSavingConfig(false);
        }
    };

    // Helper Component for Font Section
    const FontSection = ({ label, fieldKey }: { label: string, fieldKey: keyof typeof config.fonts }) => (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500">{label}</label>
            <div className="flex gap-2">
                <select 
                    className="flex-1 border rounded px-1.5 py-1 text-xs outline-none bg-white"
                    value={config.fonts[fieldKey]}
                    onChange={(e) => updateFontFamily(fieldKey, e.target.value)}
                >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <input 
                    type="number" 
                    className="w-12 border rounded px-1 py-1 text-xs text-center"
                    value={config.fontSizes[fieldKey]} 
                    onChange={(e) => updateFontSize(fieldKey, Number(e.target.value))} 
                    title="Font Size (pt)"
                />
            </div>
        </div>
    );

    // Print & Download Logic
    const handleAction = async (mode: 'print' | 'pdf') => {
        const activities = getSelectedActivities();
        if (activities.length === 0) return setNotification({
            isOpen: true, type: 'warning', title: 'ยังไม่ได้เลือกรายการ', message: 'กรุณาเลือกกิจกรรมอย่างน้อย 1 รายการเพื่อพิมพ์'
        });
        
        setIsGenerating(true);
        try {
            const html = await generatePosterHTML(activities, data.checkInLocations, config);

            if (mode === 'print') {
                const win = window.open('', '_blank');
                if (!win) { 
                    setNotification({
                        isOpen: true,
                        type: 'warning',
                        title: 'หน้าต่างถูกบล็อก (Pop-up Blocked)',
                        message: 'กรุณาอนุญาตให้เว็บไซต์เปิดหน้าต่างใหม่ (Pop-up) เพื่อพิมพ์เอกสาร'
                    });
                    return; 
                }
                win.document.write(html);
                win.document.close();
            } else {
                const element = document.createElement('div');
                element.innerHTML = html;
                const noPrint = element.querySelector('.no-print');
                if (noPrint) noPrint.remove();
                
                const opt = { 
                    margin: 0, 
                    filename: `qr_codes_${config.layout}_${Date.now()}.pdf`, 
                    image: { type: 'jpeg', quality: 0.98 }, 
                    html2canvas: { scale: 2, logging: false }, 
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
                };
                await html2pdf().set(opt).from(element).save();
            }
        } catch (e) {
            console.error(e);
            setNotification({
                isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถสร้างเอกสารได้ในขณะนี้'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-4 pb-20 relative">
            
            <NotificationModal 
                isOpen={notification.isOpen} 
                type={notification.type} 
                title={notification.title} 
                message={notification.message} 
                onClose={() => setNotification(prev => ({...prev, isOpen: false}))} 
            />

            {/* 1. Header & Controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="ค้นหากิจกรรม, สถานที่..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="w-48 relative hidden md:block">
                        <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <select 
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 outline-none bg-white cursor-pointer"
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                        >
                            <option value="All">ทุกสถานที่</option>
                            {(data.checkInLocations || []).map(l => <option key={l.LocationID} value={l.LocationID}>{l.Name}</option>)}
                        </select>
                    </div>
                </div>
                
                <button 
                    onClick={() => setShowConfigPanel(!showConfigPanel)}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold border transition-all ${showConfigPanel ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                    <Palette className="w-4 h-4 mr-2" /> ตั้งค่าป้าย
                </button>
            </div>

            {/* 2. Config Panel (Collapsible) */}
            {showConfigPanel && (
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 animate-in slide-in-from-top-2 space-y-4">
                    <div className="flex justify-between items-center border-b border-indigo-200 pb-2">
                        <h4 className="text-indigo-800 font-bold text-sm flex items-center">
                            <LayoutGrid className="w-4 h-4 mr-2" /> ตั้งค่ารูปแบบการพิมพ์ (Print Configuration)
                        </h4>
                        <button 
                            onClick={handleSaveConfig}
                            disabled={isSavingConfig}
                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 flex items-center disabled:opacity-50 shadow-sm"
                        >
                            {isSavingConfig ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Save className="w-3 h-3 mr-1"/>}
                            บันทึกค่า (Save)
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Layout & Theme */}
                        <div className="bg-white p-3 rounded-lg border border-indigo-100 md:col-span-2 space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">ขนาด (Layout)</label>
                                <div className="flex gap-2">
                                    {[{ id: 'poster', label: '1/หน้า' }, { id: 'half', label: '2/หน้า' }, { id: 'card', label: '4/หน้า' }].map(opt => (
                                        <button key={opt.id} onClick={() => setConfig({ ...config, layout: opt.id })} className={`flex-1 py-1.5 text-xs rounded border ${config.layout === opt.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}>{opt.label}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">ธีมสี (Theme)</label>
                                <div className="flex gap-2">
                                    {['blue', 'red', 'green', 'orange', 'black'].map(color => (
                                        <button key={color} onClick={() => setConfig({ ...config, theme: color })} className={`w-6 h-6 rounded-full border-2 ${config.theme === color ? 'border-gray-600 scale-110' : 'border-transparent'}`} style={{ backgroundColor: color === 'black' ? '#333' : `var(--color-${color}-500, ${color})` }} />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">ข้อความเพิ่มเติม (Note)</label>
                                <input type="text" className="w-full border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-indigo-500" placeholder="เช่น รหัส WiFi" value={config.note} onChange={(e) => setConfig({ ...config, note: e.target.value })} />
                            </div>
                        </div>

                        {/* Margins */}
                        <div className="bg-white p-3 rounded-lg border border-indigo-100">
                            <label className="text-xs font-bold text-gray-500 block mb-2 flex items-center"><Scaling className="w-3 h-3 mr-1"/> ระยะขอบ (mm)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] text-gray-400 block flex items-center"><ArrowUpFromLine className="w-2.5 h-2.5 mr-1"/> บน</label><input type="number" className="w-full border rounded px-1 py-1 text-sm" value={config.margins.top} onChange={(e) => updateMargin('top', Number(e.target.value))} /></div>
                                <div><label className="text-[10px] text-gray-400 block flex items-center"><ArrowDownToLine className="w-2.5 h-2.5 mr-1"/> ล่าง</label><input type="number" className="w-full border rounded px-1 py-1 text-sm" value={config.margins.bottom} onChange={(e) => updateMargin('bottom', Number(e.target.value))} /></div>
                                <div><label className="text-[10px] text-gray-400 block flex items-center"><ArrowLeftFromLine className="w-2.5 h-2.5 mr-1"/> ซ้าย</label><input type="number" className="w-full border rounded px-1 py-1 text-sm" value={config.margins.left} onChange={(e) => updateMargin('left', Number(e.target.value))} /></div>
                                <div><label className="text-[10px] text-gray-400 block flex items-center"><ArrowRightFromLine className="w-2.5 h-2.5 mr-1"/> ขวา</label><input type="number" className="w-full border rounded px-1 py-1 text-sm" value={config.margins.right} onChange={(e) => updateMargin('right', Number(e.target.value))} /></div>
                            </div>
                        </div>

                        {/* Typography (New & Detailed) */}
                        <div className="bg-white p-3 rounded-lg border border-indigo-100">
                            <label className="text-xs font-bold text-gray-500 block mb-2 flex items-center"><Type className="w-3 h-3 mr-1"/> รูปแบบตัวอักษร (Typography)</label>
                            <div className="space-y-3">
                                <FontSection label="หัวข้อ (Header)" fieldKey="header" />
                                <FontSection label="คำอธิบาย (Subheader)" fieldKey="subheader" />
                                <FontSection label="ชื่อกิจกรรม (Activity Name)" fieldKey="name" />
                                <FontSection label="รายละเอียด/Note" fieldKey="note" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. List & Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 pl-2">
                        <button onClick={handleSelectAll} className="text-gray-500 hover:text-blue-600">
                            {selectedIds.size === filteredActivities.length && filteredActivities.length > 0 ? <CheckSquare className="w-5 h-5 text-blue-600"/> : <Square className="w-5 h-5"/>}
                        </button>
                        <span className="text-sm font-bold text-gray-700">เลือกทั้งหมด ({filteredActivities.length})</span>
                    </div>
                    {selectedIds.size > 0 && (
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            เลือกแล้ว {selectedIds.size} รายการ
                        </span>
                    )}
                </div>
                
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {filteredActivities.map(act => (
                        <div 
                            key={act.ActivityID} 
                            onClick={() => handleToggleSelect(act.ActivityID)}
                            className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedIds.has(act.ActivityID) ? 'bg-blue-50/50' : ''}`}
                        >
                            <div className={selectedIds.has(act.ActivityID) ? 'text-blue-600' : 'text-gray-300'}>
                                {selectedIds.has(act.ActivityID) ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-gray-800 truncate">{act.Name}</div>
                                <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {(data.checkInLocations || []).find(l => l.LocationID === act.LocationID)?.Name || '-'}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                    {act.ActivityID}
                                </span>
                            </div>
                        </div>
                    ))}
                    {filteredActivities.length === 0 && (
                        <div className="p-8 text-center text-gray-400">ไม่พบกิจกรรม</div>
                    )}
                </div>
            </div>

            {/* 4. Bottom Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-gray-200 shadow-xl rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5 w-max max-w-[90vw]">
                    <div className="flex flex-col items-start mr-2">
                        <span className="text-xs text-gray-500 font-bold uppercase">Ready to Print</span>
                        <span className="text-sm font-black text-gray-800">{selectedIds.size} รายการ ({config.layout})</span>
                    </div>
                    
                    <div className="h-8 w-px bg-gray-200 mx-1"></div>

                    <button 
                        onClick={() => handleAction('print')}
                        disabled={isGenerating}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-full font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Printer className="w-4 h-4 mr-2"/>}
                        พิมพ์
                    </button>
                    
                    <button 
                        onClick={() => handleAction('pdf')}
                        disabled={isGenerating}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-full font-bold shadow-md hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <Download className="w-4 h-4 mr-2" /> PDF
                    </button>
                </div>
            )}
        </div>
    );
};

export default PrintablesTab;
