
import React, { useState, useEffect } from 'react';
import { AppData, CheckInUser } from '../types';
import { LayoutGrid, Database, Loader2, Activity } from 'lucide-react';
import LocationsTab from './admin/LocationsTab';
import ActivitiesTab from './admin/ActivitiesTab';
import LogsTab from './admin/LogsTab';
import PrintablesTab from './admin/PrintablesTab';
import LiveMonitorTab from './admin/LiveMonitorTab';
import { useSearchParams } from 'react-router-dom';

interface AdminProps {
    data: AppData;
    user: CheckInUser;
    onDataUpdate: () => void;
}

const AdminCheckInManager: React.FC<AdminProps> = ({ data, user, onDataUpdate }) => {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'locations' | 'activities' | 'printables' | 'logs' | 'live'>('locations');
    const [isGenerating, setIsGenerating] = useState(false);
    const [logSearchQuery, setLogSearchQuery] = useState('');

    useEffect(() => {
        if (searchParams.get('editActivity')) {
            setActiveTab('activities');
        }
    }, [searchParams]);

    if (user.Role !== 'admin') return <div>Access Denied</div>;

    const handleCreateSampleData = async () => {
        if(!confirm('คำเตือน: การสร้างข้อมูลตัวอย่างจะลบข้อมูลเดิมทั้งหมดใน Users, Locations, Activities, CheckIns ยืนยันหรือไม่?')) return;
        setIsGenerating(true);
        try {
            const API_URL = "https://script.google.com/macros/s/AKfycbxyS_GG5snXmt2YTcMCMMYgfQZmzTynb-esxe8N2NBAdC1uGdIGGnPh7W0PuId4r4OF/exec"; 
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'createSampleData' }) });
            alert('สร้างข้อมูลตัวอย่างสำเร็จ!');
            onDataUpdate();
        } catch (e) { alert('เกิดข้อผิดพลาด'); } finally { setIsGenerating(false); }
    };

    const handleViewLogs = (activityName: string) => {
        setLogSearchQuery(activityName);
        setActiveTab('logs');
    };

    return (
        <div className="pb-20 space-y-6 animate-in fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <LayoutGrid className="w-6 h-6 mr-2 text-blue-600"/> จัดการระบบเช็คอิน
                    </h2>
                    <p className="text-gray-500 text-sm">สำหรับผู้ดูแลระบบ</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleCreateSampleData} disabled={isGenerating} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200 flex items-center">
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <Database className="w-4 h-4 mr-1"/>}
                        สร้างข้อมูลตัวอย่าง
                    </button>
                    <div className="flex flex-wrap bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setActiveTab('locations')} className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'locations' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>สถานที่</button>
                        <button onClick={() => setActiveTab('activities')} className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'activities' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>กิจกรรม</button>
                        <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'logs' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Logs</button>
                        <button onClick={() => setActiveTab('printables')} className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'printables' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>พิมพ์ป้าย</button>
                        <button onClick={() => setActiveTab('live')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center ${activeTab === 'live' ? 'bg-red-500 text-white shadow' : 'text-gray-500'}`}><Activity className="w-3 h-3 mr-1"/> Live Monitor</button>
                    </div>
                </div>
            </div>

            {activeTab === 'locations' && <LocationsTab data={data} onDataUpdate={onDataUpdate} />}
            {activeTab === 'activities' && <ActivitiesTab data={data} onDataUpdate={onDataUpdate} onViewLogs={handleViewLogs} />}
            {activeTab === 'logs' && <LogsTab initialSearchQuery={logSearchQuery} />}
            {activeTab === 'printables' && <PrintablesTab data={data} />}
            {activeTab === 'live' && <LiveMonitorTab data={data} />}
        </div>
    );
};

export default AdminCheckInManager;
