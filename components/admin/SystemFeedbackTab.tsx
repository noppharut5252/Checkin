
import React, { useState, useEffect, useMemo } from 'react';
import { getSystemReports, respondToSystemReport } from '../../services/api';
import { Search, Filter, MessageSquareWarning, Bug, Lightbulb, CheckCircle, Clock, AlertCircle, Mail, MessageCircle, Send, Loader2, X, RefreshCw } from 'lucide-react';
import { User } from '../../types';

interface SystemFeedbackTabProps {
    data: any;
    user: User;
}

const SystemFeedbackTab: React.FC<SystemFeedbackTabProps> = ({ data, user }) => {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [replyText, setReplyText] = useState('');
    const [status, setStatus] = useState('Open');
    const [priority, setPriority] = useState('Low');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Notification Options
    const [notifyEmail, setNotifyEmail] = useState(false);
    const [notifyLine, setNotifyLine] = useState(true);

    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await getSystemReports();
            setReports(res || []);
        } catch (e) {
            console.error("Failed to fetch reports", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectReport = (report: any) => {
        setSelectedReport(report);
        setReplyText(report.AdminResponse || '');
        setStatus(report.Status || 'Open');
        setPriority(report.Priority || 'Low');
        
        // Auto-check available channels
        setNotifyEmail(!!report.UserEmail);
        setNotifyLine(!!report.UserLineId);
    };

    const handleSubmitResponse = async () => {
        if (!selectedReport) return;
        setIsSubmitting(true);
        try {
            await respondToSystemReport({
                reportId: selectedReport.ReportID,
                response: replyText,
                status: status,
                priority: priority,
                adminName: user.Name || 'Admin',
                notifyEmail,
                notifyLine,
                userEmail: selectedReport.UserEmail,
                userLineId: selectedReport.UserLineId,
                subject: selectedReport.Subject
            });
            alert('บันทึกและส่งการแจ้งเตือนเรียบร้อยแล้ว');
            setSelectedReport(null);
            fetchReports();
        } catch (e) {
            alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const matchesStatus = filterStatus === 'All' || r.Status === filterStatus;
            const matchesSearch = 
                (r.Subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.UserName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.UserID || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesSearch;
        }).sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
    }, [reports, filterStatus, searchTerm]);

    const getStatusColor = (s: string) => {
        switch(s) {
            case 'Resolved': return 'bg-green-100 text-green-700';
            case 'In Progress': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="ค้นหา..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="All">ทุกสถานะ</option>
                        <option value="Open">รอตรวจสอบ (Open)</option>
                        <option value="In Progress">กำลังดำเนินการ</option>
                        <option value="Resolved">แก้ไขแล้ว</option>
                    </select>
                </div>
                <button onClick={fetchReports} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หัวข้อ</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้แจ้ง</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredReports.map((report) => (
                            <tr 
                                key={report.ReportID} 
                                onClick={() => handleSelectReport(report)}
                                className="hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        {report.Type === 'bug' ? <Bug className="w-4 h-4 text-red-500 mr-2"/> : <Lightbulb className="w-4 h-4 text-amber-500 mr-2"/>}
                                        <span className="font-medium text-gray-900 line-clamp-1">{report.Subject}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{report.UserName}</div>
                                    <div className="text-xs text-gray-500">{report.UserID}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.Status)}`}>
                                        {report.Status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-gray-500">
                                    {new Date(report.Timestamp).toLocaleDateString('th-TH')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Detail & Reply Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center">
                                <MessageSquareWarning className="w-5 h-5 mr-2 text-blue-600"/> รายละเอียดการแจ้งปัญหา
                            </h3>
                            <button onClick={() => setSelectedReport(null)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* User Report */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedReport.Type === 'bug' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {selectedReport.Type.toUpperCase()}
                                    </span>
                                    <span className="text-sm text-gray-500">{new Date(selectedReport.Timestamp).toLocaleString('th-TH')}</span>
                                </div>
                                <h4 className="font-bold text-lg text-gray-900 mb-2">{selectedReport.Subject}</h4>
                                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{selectedReport.Detail}</p>
                                
                                {selectedReport.Image && (
                                    <div className="mt-4">
                                        <img src={selectedReport.Image} className="max-h-60 rounded-lg border border-gray-300 cursor-zoom-in" onClick={() => window.open(selectedReport.Image, '_blank')} />
                                    </div>
                                )}
                                
                                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 flex flex-col gap-1">
                                    <span>ผู้แจ้ง: {selectedReport.UserName} ({selectedReport.UserID})</span>
                                    <span>อุปกรณ์: {selectedReport.DeviceInfo}</span>
                                </div>
                            </div>

                            {/* Admin Reply Form */}
                            <div className="space-y-4 border-t pt-4">
                                <h4 className="font-bold text-gray-800 flex items-center">
                                    <Send className="w-4 h-4 mr-2"/> ตอบกลับผู้ใช้งาน (Admin Response)
                                </h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">สถานะ (Status)</label>
                                        <select 
                                            className="w-full border rounded p-2 text-sm bg-white"
                                            value={status}
                                            onChange={e => setStatus(e.target.value)}
                                        >
                                            <option value="Open">รอตรวจสอบ (Open)</option>
                                            <option value="In Progress">กำลังดำเนินการ</option>
                                            <option value="Resolved">แก้ไขแล้ว (Resolved)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">ความสำคัญ (Priority)</label>
                                        <select 
                                            className="w-full border rounded p-2 text-sm bg-white"
                                            value={priority}
                                            onChange={e => setPriority(e.target.value)}
                                        >
                                            <option value="Low">ทั่วไป (Low)</option>
                                            <option value="Medium">ปานกลาง (Medium)</option>
                                            <option value="High">เร่งด่วน (High)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">ข้อความตอบกลับ</label>
                                    <textarea 
                                        className="w-full border rounded-lg p-3 text-sm h-32 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="พิมพ์คำตอบที่ต้องการแจ้งผู้ใช้..."
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <label className={`flex items-center text-sm cursor-pointer ${!selectedReport.UserLineId ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={notifyLine} 
                                            onChange={e => setNotifyLine(e.target.checked)}
                                            disabled={!selectedReport.UserLineId}
                                            className="w-4 h-4 rounded text-blue-600 mr-2"
                                        />
                                        <MessageCircle className="w-4 h-4 mr-1 text-[#06C755]"/> แจ้งเตือนทาง LINE
                                    </label>
                                    <label className={`flex items-center text-sm cursor-pointer ${!selectedReport.UserEmail ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={notifyEmail} 
                                            onChange={e => setNotifyEmail(e.target.checked)}
                                            disabled={!selectedReport.UserEmail}
                                            className="w-4 h-4 rounded text-blue-600 mr-2"
                                        />
                                        <Mail className="w-4 h-4 mr-1 text-gray-600"/> แจ้งเตือนทาง Email
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setSelectedReport(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm">ปิด</button>
                            <button 
                                onClick={handleSubmitResponse}
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex items-center shadow-sm disabled:opacity-70"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2"/>}
                                บันทึกและส่ง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemFeedbackTab;
