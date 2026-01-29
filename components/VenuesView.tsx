
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AppData, Venue, VenueSchedule } from '../types';
import { MapPin, Calendar, Plus, Edit2, Trash2, Navigation, Info, ExternalLink, X, Save, CheckCircle, Utensils, Wifi, Car, Wind, Clock, Building, Layers, Map, AlertCircle, Search, LayoutGrid, Camera, Loader2, Upload, ImageIcon, List, ArrowRight, Trophy, Share2, Copy, Printer } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { saveVenue, deleteVenue, uploadImage } from '../services/api';
import { resizeImage } from '../services/utils';
import { shareVenue, shareSchedule } from '../services/liff';

interface VenuesViewProps {
  data: AppData;
  user?: any;
}

// --- Internal Components ---

const VenuesSkeleton = () => (
    <div className="space-y-6 animate-pulse p-4">
        <div className="h-12 w-full bg-gray-200 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-gray-200 rounded-2xl"></div>
            ))}
        </div>
    </div>
);

const VenueCard: React.FC<{ venue: Venue, isAdmin: boolean, onEdit: (v: Venue) => void, onViewSchedule: (v: Venue) => void }> = ({ venue, isAdmin, onEdit, onViewSchedule }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group flex flex-col h-full">
            <div className="h-48 relative overflow-hidden bg-gray-100">
                <img 
                    src={venue.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"} 
                    alt={venue.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=No+Image"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {isAdmin && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(venue); }}
                        className="absolute top-4 right-4 p-2 bg-white/90 rounded-full hover:bg-blue-600 hover:text-white transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{venue.name}</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">{venue.description || 'ไม่มีรายละเอียด'}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                    {(venue.facilities || []).slice(0, 3).map((f, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">{f}</span>
                    ))}
                    {(venue.facilities?.length || 0) > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">+{venue.facilities!.length - 3}</span>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
                    <a 
                        href={venue.locationUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 flex items-center hover:underline"
                    >
                        <Navigation className="w-3 h-3 mr-1" /> นำทาง (Map)
                    </a>
                    <button 
                        onClick={() => onViewSchedule(venue)}
                        className="text-xs font-bold text-gray-500 flex items-center hover:text-gray-900 bg-gray-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                        <Calendar className="w-3 h-3 mr-1" /> ตารางใช้ห้อง
                    </button>
                </div>
            </div>
        </div>
    );
};

const VenueModal: React.FC<{ 
    venue: Venue | null, 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (v: Venue) => Promise<boolean>, 
    onDelete: (id: string) => Promise<void>,
    activities: any[]
}> = ({ venue, isOpen, onClose, onSave, onDelete, activities }) => {
    const [formData, setFormData] = useState<Partial<Venue>>({
        name: '', description: '', locationUrl: '', imageUrl: '', facilities: [], contactInfo: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (venue) setFormData({ ...venue });
        else setFormData({ name: '', description: '', locationUrl: '', imageUrl: '', facilities: [], contactInfo: '' });
    }, [venue, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!formData.name) return alert('กรุณาระบุชื่อสนาม');
        setIsSaving(true);
        const success = await onSave(formData as Venue);
        setIsSaving(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const base64 = await resizeImage(file, 800, 600, 0.8);
            const res = await uploadImage(base64, `venue_${Date.now()}.jpg`);
            if (res.status === 'success' && res.fileUrl) {
                setFormData(prev => ({ ...prev, imageUrl: res.fileUrl })); // Use direct link or thumbnail
            } else {
                alert('Upload failed');
            }
        } catch (e) {
            console.error(e);
            alert('Error uploading');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">{venue ? 'แก้ไขสนาม' : 'เพิ่มสนามใหม่'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-gray-700"/></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    {/* Image Upload */}
                    <div className="relative h-48 bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 group">
                        {formData.imageUrl ? (
                            <img src={formData.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                                <span className="text-xs">คลิกเพื่ออัปโหลดรูปภาพ</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        {isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อสนาม</label>
                        <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="เช่น อาคารเรียน 1" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">รายละเอียด</label>
                        <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="ข้อมูลทั่วไป..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Google Maps Link</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.locationUrl} onChange={e => setFormData({...formData, locationUrl: e.target.value})} placeholder="https://maps.google.com/..." />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">ผู้ดูแล / ติดต่อ</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.contactInfo} onChange={e => setFormData({...formData, contactInfo: e.target.value})} placeholder="ชื่อ-เบอร์โทร" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">สิ่งอำนวยความสะดวก (คั่นด้วย comma)</label>
                        <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.facilities?.join(', ')} onChange={e => setFormData({...formData, facilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} placeholder="แอร์, โปรเจคเตอร์, ที่จอดรถ" />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    {venue ? (
                        <button onClick={() => { if(confirm('ต้องการลบสนามนี้ใช่หรือไม่?')) onDelete(venue.id); }} className="text-red-600 text-sm hover:underline font-medium">ลบสนามนี้</button>
                    ) : <div></div>}
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm">ยกเลิก</button>
                        <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex items-center disabled:opacity-70">
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} บันทึก
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VenueScheduleModal: React.FC<{ venue: Venue, isOpen: boolean, onClose: () => void }> = ({ venue, isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleShareSchedule = async (item: VenueSchedule) => {
        try {
            await shareSchedule(
                item.activityName,
                venue.name,
                item.room,
                item.date,
                item.timeRange,
                venue.locationUrl,
                item.imageUrl || venue.imageUrl
            );
        } catch (e) {
            console.error("Share failed", e);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50">
                    <div>
                        <h3 className="font-bold text-lg text-blue-900 flex items-center">
                            <Calendar className="w-5 h-5 mr-2" /> ตารางการใช้สนาม: {venue.name}
                        </h3>
                        <p className="text-xs text-blue-600 mt-1">{venue.description}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-blue-100 rounded-full text-blue-800"><X className="w-6 h-6"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                    <div className="divide-y divide-gray-100">
                        {venue.scheduledActivities && venue.scheduledActivities.length > 0 ? (
                            venue.scheduledActivities.map((s, idx) => (
                                <div key={idx} className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row gap-4">
                                    <div className="w-full sm:w-24 shrink-0 flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0">
                                        <div className="text-sm font-bold text-gray-900">{s.date}</div>
                                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit">{s.timeRange}</div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800 text-sm">{s.activityName}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                                            <span className="flex items-center"><Building className="w-3 h-3 mr-1"/> {s.building}</span>
                                            <span className="flex items-center"><Layers className="w-3 h-3 mr-1"/> {s.floor}</span>
                                            <span className="flex items-center text-blue-600 font-medium"><MapPin className="w-3 h-3 mr-1"/> {s.room}</span>
                                        </div>
                                        {s.note && <div className="text-xs text-orange-600 mt-2 bg-orange-50 px-2 py-1 rounded border border-orange-100 w-fit flex items-center"><Info className="w-3 h-3 mr-1"/> {s.note}</div>}
                                    </div>
                                    <div className="flex items-center">
                                        <button 
                                            onClick={() => handleShareSchedule(s)}
                                            className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                                            title="แชร์กำหนดการ"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-gray-400">
                                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>ยังไม่มีตารางการใช้ห้อง</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Venues View Component
const VenuesView: React.FC<VenuesViewProps> = ({ data, user }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal States
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    
    // Updated: Include group_admin in admin privileges for Venues and use normalized role
    const role = user?.level?.toLowerCase() || '';
    const isAdmin = ['admin', 'area', 'group_admin'].includes(role);

    // Fake Loading
    useEffect(() => {
        setIsLoading(true);
        const t = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(t);
    }, []);

    const filteredVenues = useMemo(() => {
        return (data.venues || []).filter(v => 
            (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (v.description || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data.venues, searchTerm]);

    const handleEdit = (v: Venue) => {
        setSelectedVenue(v);
        setIsEditModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedVenue(null);
        setIsEditModalOpen(true);
    };

    const handleViewSchedule = (v: Venue) => {
        setSelectedVenue(v);
        setIsScheduleModalOpen(true);
    };

    const handleSaveVenue = async (venue: Venue) => {
        const isNew = !venue.id;
        const venueToSave = { ...venue, id: isNew ? `V${Date.now()}` : venue.id };
        const success = await saveVenue(venueToSave);
        if (success) {
            // Optimistic update handled by parent reloading data usually, 
            // but we can close modal here. Ideally trigger onDataUpdate.
            setIsEditModalOpen(false);
            window.location.reload(); // Simple reload to refresh data for now
            return true;
        } else {
            alert('บันทึกไม่สำเร็จ');
            return false;
        }
    };

    const handleDeleteVenue = async (id: string) => {
        const success = await deleteVenue(id);
        if (success) {
            setIsEditModalOpen(false);
            window.location.reload();
        } else {
            alert('ลบไม่สำเร็จ');
        }
    };

    if (isLoading) return <VenuesSkeleton />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center font-kanit">
                        <MapPin className="w-6 h-6 mr-2 text-red-500" />
                        สนามแข่งขัน (Venues)
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">ข้อมูลสถานที่และตารางการใช้ห้องสอบ</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* View Toggle */}
                    <div className="bg-gray-100 p-1 rounded-lg flex shrink-0">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute inset-y-0 left-3 flex items-center pointer-events-none h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none"
                            placeholder="ค้นหาสนาม..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {isAdmin && (
                        <button 
                            onClick={handleAdd}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4 mr-2" /> เพิ่มสนาม
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVenues.map(venue => (
                        <VenueCard 
                            key={venue.id} 
                            venue={venue} 
                            isAdmin={isAdmin} 
                            onEdit={handleEdit} 
                            onViewSchedule={handleViewSchedule} 
                        />
                    ))}
                    {filteredVenues.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>ไม่พบข้อมูลสนามแข่งขัน</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ชื่อสนาม</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">รายละเอียด</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">สิ่งอำนวยความสะดวก</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredVenues.map((venue) => (
                                    <tr key={venue.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewSchedule(venue)}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden mr-3">
                                                    <img className="h-10 w-10 object-cover" src={venue.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=100&q=80"} alt="" />
                                                </div>
                                                <div className="text-sm font-bold text-gray-900">{venue.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500 line-clamp-2 max-w-xs">{venue.description}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-1">
                                                {(venue.facilities || []).slice(0, 3).map((f, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-gray-100 border border-gray-200 text-gray-600">{f}</span>
                                                ))}
                                                {(venue.facilities?.length || 0) > 3 && <span className="text-xs text-gray-400 self-center">+{venue.facilities!.length - 3}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleViewSchedule(venue); }}
                                                    className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                </button>
                                                {isAdmin && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(venue); }}
                                                        className="text-gray-600 hover:text-gray-900 bg-gray-100 p-1.5 rounded"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            <VenueModal 
                venue={selectedVenue} 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                onSave={handleSaveVenue}
                onDelete={handleDeleteVenue}
                activities={data.activities}
            />

            {selectedVenue && (
                <VenueScheduleModal 
                    venue={selectedVenue} 
                    isOpen={isScheduleModalOpen} 
                    onClose={() => setIsScheduleModalOpen(false)} 
                />
            )}
        </div>
    );
};

export default VenuesView;