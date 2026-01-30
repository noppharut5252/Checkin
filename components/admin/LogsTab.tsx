
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, User, Trash2, Download } from 'lucide-react';
import { getCheckInLogs, deleteCheckInLog } from '../../services/api';
import ConfirmationModal from '../ConfirmationModal';

interface LogsTabProps {
    initialSearchQuery?: string;
}

const LogsTab: React.FC<LogsTabProps> = ({ initialSearchQuery = '' }) => {
    const [searchLogsQuery, setSearchLogsQuery] = useState(initialSearchQuery);
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({ isOpen: false, id: '', title: '' });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setIsLoadingLogs(true);
        getCheckInLogs().then(data => {
            setLogs(data);
            setIsLoadingLogs(false);
        });
    }, []);

    // Update local state if prop changes (for external filtering from Activities Tab)
    useEffect(() => {
        if(initialSearchQuery) setSearchLogsQuery(initialSearchQuery);
    }, [initialSearchQuery]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => 
            (log.UserName || '').toLowerCase().includes(searchLogsQuery.toLowerCase()) ||
            (log.ActivityName || '').toLowerCase().includes(searchLogsQuery.toLowerCase()) ||
            (log.LocationName || '').toLowerCase().includes(searchLogsQuery.toLowerCase())
        );
    }, [logs, searchLogsQuery]);

    const handleDeleteLogClick = (log: any) => {
        setDeleteModal({ isOpen: true, id: log.CheckInID, title: `ลบประวัติของ "${log.UserName}"?` });
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await deleteCheckInLog(deleteModal.id);
        setLogs(prev => prev.filter(l => l.CheckInID !== deleteModal.id));
        setIsDeleting(false);
        setDeleteModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleExportCSV = () => {
        const headers = ['Timestamp', 'UserName', 'UserID', 'ActivityName', 'LocationName', 'Distance'];
        const csvContent = [
            headers.join(','),
            ...filteredLogs.map(log => [
                `"${new Date(log.Timestamp).toLocaleString()}"`,
                `"${log.UserName}"`,
                `"${log.UserID}"`,
                `"${log.ActivityName}"`,
                `"${log.LocationName}"`,
                log.Distance
            ].join(','))
        ].join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `checkin_logs_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="ค้นหาตามชื่อผู้ใช้, กิจกรรม, หรือสถานที่..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchLogsQuery}
                        onChange={(e) => setSearchLogsQuery(e.target.value)}
                    />
                </div>
                <button 
                    onClick={handleExportCSV}
                    className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 flex items-center font-bold text-sm"
                >
                    <Download className="w-4 h-4 mr-1" /> Export CSV
                </button>
            </div>

            {isLoadingLogs ? (
                <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-gray-400"/></div>
            ) : filteredLogs.length === 0 ? (
                <div className="text-center py-20 text-gray-400">ไม่พบประวัติการเช็คอิน</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้ใช้งาน</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">กิจกรรม/สถานที่</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">เวลา</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredLogs.map((log) => (
                                    <tr key={log.CheckInID} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                    <User className="w-5 h-5"/>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-gray-900">{log.UserName}</div>
                                                    <div className="text-xs text-gray-500">{log.UserID}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 font-medium">{log.ActivityName}</div>
                                            <div className="text-xs text-gray-500">{log.LocationName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(log.Timestamp).toLocaleString('th-TH')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleDeleteLogClick(log)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                title={deleteModal.title}
                description="คุณต้องการลบประวัติการเช็คอินนี้ใช่หรือไม่?"
                confirmLabel="ลบข้อมูล"
                confirmColor="red"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                isLoading={isDeleting}
                actionType="delete"
            />
        </div>
    );
};

export default LogsTab;
