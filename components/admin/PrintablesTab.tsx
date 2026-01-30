
import React, { useState, useMemo } from 'react';
import { AppData, CheckInActivity } from '../../types';
import { Printer, FileText, MapPin, QrCode, Download, Loader2, Search, CheckSquare, Square, Filter, Palette, LayoutGrid, Type, Scaling, ArrowUpFromLine, ArrowDownToLine, ArrowLeftFromLine, ArrowRightFromLine } from 'lucide-react';
import { generatePosterHTML } from '../../services/printUtils';

// Declare html2pdf
declare var html2pdf: any;

interface PrintablesTabProps {
    data: AppData;
}

const PrintablesTab: React.FC<PrintablesTabProps> = ({ data }) => {
    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState('All');
    
    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Config Panel
    const [config, setConfig] = useState({
        layout: 'poster', // 'poster' (A4), 'half' (A5x2), 'card' (A6x4)
        theme: 'blue', // 'blue', 'red', 'green', 'orange', 'black'
        note: '',
        // Margins in mm
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        // Font
        fontFamily: 'Kanit',
        // Font Sizes in pt
        fontSizes: { header: 42, name: 32, note: 18 }
    });
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [showConfigPanel, setShowConfigPanel] = useState(false);

    // Derived Data
    const filteredActivities = useMemo(() => {
        return data.checkInActivities.filter(act => {
            const matchesSearch = act.Name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  data.checkInLocations.find(l => l.LocationID === act.LocationID)?.Name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesLoc = locationFilter === 'All' || act.LocationID === locationFilter;
            return matchesSearch && matchesLoc;
        });
    }, [data.checkInActivities, searchQuery, locationFilter]);

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
        return data.checkInActivities.filter(a => selectedIds.has(a.ActivityID));
    };

    const updateMargin = (key: keyof typeof config.margins, val: number) => {
        setConfig(prev => ({
            ...prev,
            margins: { ...prev.margins, [key]: val }
        }));
    };

    const updateFontSize = (key: keyof typeof config.fontSizes, val: number) => {
        setConfig(prev => ({
            ...prev,
            fontSizes: { ...prev.fontSizes, [key]: val }
        }));
    };

    // Print & Download Logic
    const handleAction = async (mode: 'print' | 'pdf') => {
        const activities = getSelectedActivities();
        if (activities.length === 0) return alert('กรุณาเลือกอย่างน้อย 1 กิจกรรม');
        
        setIsGenerating(true);
        try {
            const html = await generatePosterHTML(activities, data.checkInLocations, config);

            if (mode === 'print') {
                const win = window.open('', '_blank');
                if (!win) { alert('Pop-up Blocked'); return; }
                win.document.write(html);
                win.document.close();
            } else {
                const element = document.createElement('div');
                element.innerHTML = html;
                const noPrint = element.querySelector('.no-print');
                if (noPrint) noPrint.remove();
                
                const opt = { 
                    margin: 0, // We handle margins via CSS padding in generatePosterHTML
                    filename: `qr_codes_${config.layout}_${Date.now()}.pdf`, 
                    image: { type: 'jpeg', quality: 0.98 }, 
                    html2canvas: { scale: 2, logging: false }, 
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
                };
                await html2pdf().set(opt).from(element).save();
            }
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-4 pb-20">
            
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
                            {data.checkInLocations.map(l => <option key={l.LocationID} value={l.LocationID}>{l.Name}</option>)}
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

                        {/* Fonts */}
                        <div className="bg-white p-3 rounded-lg border border-indigo-100">
                            <label className="text-xs font-bold text-gray-500 block mb-2 flex items-center"><Type className="w-3 h-3 mr-1"/> ตัวอักษร (Font)</label>
                            <div className="space-y-2">
                                <select className="w-full border rounded px-1 py-1 text-xs" value={config.fontFamily} onChange={(e) => setConfig({...config, fontFamily: e.target.value})}>
                                    <option value="Kanit">Kanit (มาตรฐาน)</option>
                                    <option value="Sarabun">Sarabun (ทางการ)</option>
                                    <option value="Chakra Petch">Chakra Petch (เหลี่ยม)</option>
                                    <option value="Mali">Mali (ลายมือ)</option>
                                </select>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-[10px] text-gray-400 block">หัวเรื่อง (pt)</label><input type="number" className="w-full border rounded px-1 py-1 text-sm" value={config.fontSizes.header} onChange={(e) => updateFontSize('header', Number(e.target.value))} /></div>
                                    <div><label className="text-[10px] text-gray-400 block">ชื่อ (pt)</label><input type="number" className="w-full border rounded px-1 py-1 text-sm" value={config.fontSizes.name} onChange={(e) => updateFontSize('name', Number(e.target.value))} /></div>
                                    <div className="col-span-2"><label className="text-[10px] text-gray-400 block">รายละเอียด (pt)</label><input type="number" className="w-full border rounded px-1 py-1 text-sm" value={config.fontSizes.note} onChange={(e) => updateFontSize('note', Number(e.target.value))} /></div>
                                </div>
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
                                    {data.checkInLocations.find(l => l.LocationID === act.LocationID)?.Name || '-'}
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
