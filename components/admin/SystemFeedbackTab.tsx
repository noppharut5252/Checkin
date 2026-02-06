
import React, { useState, useEffect, useMemo } from 'react';
import { getSystemReports, respondToSystemReport, getLineQuota } from '../../services/api';
import { Search, Filter, MessageSquareWarning, Bug, Lightbulb, CheckCircle, Clock, AlertCircle, Mail, MessageCircle, Send, Loader2, X, RefreshCw, Type, Zap, AlertTriangle, BarChart } from 'lucide-react';
import { User } from '../../types';

interface SystemFeedbackTabProps {
    data: any;
    user: User;
}

const QUICK_REPLIES = [
    "รับเรื่องแล้ว กำลังตรวจสอบครับ",
    "ดำเนินการแก้ไขเรียบร้อยแล้ว กรุณาลองใช้งานใหม่",
    "ขอบคุณสำหรับข้อเสนอแนะ ทางเราจะนำไปปรับปรุง",
    "ขอทราบข้อมูลเพิ่มเติมเกี่ยวกับรุ่นมือถือที่ใช้ครับ"
];

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

    // Filters
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [filterPriority, setFilterPriority] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Quota
    const [quota, setQuota] = useState<{ usage: number, limit: number } | null>(null);

    useEffect(() => {
        fetchReports();
        checkQuota();
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

    const checkQuota = async () => {
        try {
            const res = await getLineQuota();
            if (res.status === 'success') {
                setQuota({ usage: res.totalUsage, limit: typeof res.value === 'number' ? res.value : 0 });
            }
        } catch (e) {}
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

    const handleQuickReply = (text: string) => {
        setReplyText(prev => {
            if (!prev) return text;
            return prev + '\n' + text;
        });
    };

    const handleSubmitResponse = async () => {
        if (!selectedReport) return;
        if (replyText.length > 2000) return alert('ข้อความยาวเกิน 2000 ตัวอักษร');

        setIsSubmitting(true);
        try {
            // Updated: respondToSystemReport now returns an object with lineError
            const res = await respondToSystemReport({
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

            if (res.status === 'success') {
                if (res.lineError) {
                    alert(`บันทึกสำเร็จ แต่ส่ง LINE ไม่ผ่าน: ${res.lineError} (ผู้ใช้อาจบล็อกหรือไม่ได้เป็นเพื่อน)`);
                } else {
                    alert('บันทึกและส่งการแจ้งเตือนเรียบร้อยแล้ว');
                }
                setSelectedReport(null);
                fetchReports();
                checkQuota(); // Update quota after send
            } else {
                alert('เกิดข้อผิดพลาด: ' + res.message);
            }
        } catch (e) {
            alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const matchesStatus = filterStatus === 'All' || r.Status === filterStatus;
            const matchesType = filterType === 'All' || r.Type === filterType;
            const matchesPriority = filterPriority === 'All' || (r.Priority || 'Low') === filterPriority;
            const matchesSearch = 
                (r.Subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.UserName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.UserID || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesType && matchesPriority && matchesSearch;
        }).sort((a, b) => {
            // Sort by Priority (High > Medium > Low) then Date
            const pMap: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
            const pA = pMap[a.Priority || 'Low'] || 1;
            const pB = pMap[b.Priority || 'Low'] || 1;
            if (pA !== pB) return pB - pA;
            return new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime();
        });
    }, [reports, filterStatus, filterType, filterPriority, searchTerm]);

    const getStatusColor = (s: string) => {
        switch(s) {
            case 'Resolved': return 'bg-green-100 text-green-700';
            case 'In Progress': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getPriorityBadge = (p: string) => {
        switch(p) {
            case 'High': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">High</span>;
            case 'Medium': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">Medium</span>;
            default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Low</span>;
        }
    };

    // Quota Warning Logic
    const isQuotaLow = quota && quota.limit > 0 && quota.usage >= quota.limit * 0.9;
    const isQuotaExceeded = quota && quota.limit > 0 && quota.usage >= quota.limit;

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:flex-none min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="ค้นหา..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                        <Filter className="w-3 h-3 text-gray-400" />
                        <select 
                            className="text-xs bg-transparent outline-none py-1 cursor-pointer"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="All">สถานะ: ทั้งหมด</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                        <AlertTriangle className="w-3 h-3 text-gray-400" />
                        <select 
                            className="text-xs bg-transparent outline-none py-1 cursor-pointer"
                            value={filterPriority}
                            onChange={e => setFilterPriority(e.target.value)}
                        >
                            <option value="All">ความสำคัญ: ทั้งหมด</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                        <Lightbulb className="w-3 h-3 text-gray-400" />
                        <select 
                            className="text-xs bg-transparent outline-none py-1 cursor-pointer"
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        >
                            <option value="All">ประเภท: ทั้งหมด</option>
                            <option value="bug">แจ้งปัญหา (Bug)</option>
                            <option value="suggestion">ข้อเสนอแนะ</option>
                        </select>
                    </div>
                </div>
                <button onClick={fetchReports} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หัวข้อ</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้แจ้ง</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ความสำคัญ</th>
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
                                        {report.Type === 'bug' ? <Bug className="w-4 h-4 text-red-500 mr-2 shrink-0"/> : <Lightbulb className="w-4 h-4 text-amber-500 mr-2 shrink-0"/>}
                                        <span className="font-medium text-gray-900 line-clamp-1">{report.Subject}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{report.UserName}</div>
                                    <div className="text-xs text-gray-500">{report.UserID}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {getPriorityBadge(report.Priority)}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.Status)}`}>
                                        {report.Status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-gray-500 whitespace-nowrap">
                                    {new Date(report.Timestamp).toLocaleDateString('th-TH')}
                                </td>
                            </tr>
                        ))}
                        {filteredReports.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">ไม่พบรายการ</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail & Reply Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="font-bold text-gray-800 flex items-center">
                                <MessageSquareWarning className="w-5 h-5 mr-2 text-blue-600"/> รายละเอียดการแจ้งปัญหา
                            </h3>
                            <button onClick={() => setSelectedReport(null)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* User Report */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedReport.Type === 'bug' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {selectedReport.Type.toUpperCase()}
                                        </span>
                                        <span className="text-sm text-gray-500">{new Date(selectedReport.Timestamp).toLocaleString('th-TH')}</span>
                                    </div>
                                    {getPriorityBadge(selectedReport.Priority || 'Low')}
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
                                <h4 className="font-bold text-gray-800 flex items-center justify-between">
                                    <span className="flex items-center"><Send className="w-4 h-4 mr-2"/> ตอบกลับผู้ใช้งาน (Admin Response)</span>
                                    <span className={`text-xs font-medium flex items-center ${replyText.length > 2000 ? 'text-red-500' : 'text-gray-400'}`}>
                                        <Type className="w-3 h-3 mr-1"/> {replyText.length}/2000
                                    </span>
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

                                {/* Quick Replies */}
                                <div className="flex flex-wrap gap-2">
                                    {QUICK_REPLIES.map((text, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleQuickReply(text)}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs rounded-full hover:bg-blue-100 transition-colors border border-blue-100 flex items-center"
                                        >
                                            <Zap className="w-3 h-3 mr-1" /> {text.length > 20 ? text.substring(0, 20) + '...' : text}
                                        </button>
                                    ))}
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

                                <div className="flex flex-col gap-2">
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

                                    {/* Quota & Connection Warning */}
                                    {notifyLine && (
                                        <div className="space-y-1">
                                            {!selectedReport.UserLineId && (
                                                <p className="text-xs text-orange-500 flex items-center">
                                                    <AlertCircle className="w-3 h-3 mr-1"/> ผู้ใช้ยังไม่ได้เชื่อมต่อ LINE ไม่สามารถส่งแจ้งเตือนได้
                                                </p>
                                            )}
                                            {isQuotaLow && (
                                                <p className="text-xs text-orange-600 flex items-center bg-orange-50 p-1.5 rounded border border-orange-200">
                                                    <AlertTriangle className="w-3 h-3 mr-1"/> 
                                                    Warning: LINE Quota ใกล้เต็ม ({quota?.usage}/{quota?.limit})
                                                </p>
                                            )}
                                            {isQuotaExceeded && (
                                                <p className="text-xs text-red-600 flex items-center bg-red-50 p-1.5 rounded border border-red-200">
                                                    <AlertTriangle className="w-3 h-3 mr-1"/> 
                                                    Error: LINE Quota เต็มแล้ว ไม่สามารถส่งข้อความได้
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setSelectedReport(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm">ปิด</button>
                            <button 
                                onClick={handleSubmitResponse}
                                disabled={isSubmitting || (notifyLine && !selectedReport.UserLineId && !notifyEmail)}
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
    
