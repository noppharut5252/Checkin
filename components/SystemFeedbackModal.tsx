
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { X, MessageSquareWarning, Bug, Lightbulb, Upload, Loader2, Image as ImageIcon, Send, CheckCircle, History, Clock } from 'lucide-react';
import { submitSystemReport, uploadImage, getSystemReports } from '../services/api';
import { resizeImage } from '../services/utils';

interface SystemFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: User | null;
}

const SystemFeedbackModal: React.FC<SystemFeedbackModalProps> = ({ isOpen, onClose, user }) => {
    const [viewMode, setViewMode] = useState<'form' | 'history'>('form');
    
    // Form State
    const [type, setType] = useState<'bug' | 'suggestion'>('bug');
    const [subject, setSubject] = useState('');
    const [detail, setDetail] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // History State
    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    useEffect(() => {
        if (isOpen && viewMode === 'history') {
            loadHistory();
        }
    }, [isOpen, viewMode]);

    const loadHistory = async () => {
        if (!user?.userid && !user?.UserID) return;
        setIsLoadingHistory(true);
        try {
            const res = await getSystemReports(user.userid || user.UserID);
            if (res) setHistory(res);
        } catch (e) {
            console.error("Fetch history failed", e);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    if (!isOpen) return null;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            const base64 = await resizeImage(file, 800, 800, 0.8);
            setImage(base64);
        } catch (e) {
            alert('ไม่สามารถอ่านไฟล์รูปภาพได้');
        }
    };

    const handleSubmit = async () => {
        if (!subject || !detail) {
            alert('กรุณากรอกหัวข้อและรายละเอียด');
            return;
        }

        setIsSubmitting(true);
        try {
            let imageUrl = '';
            if (image) {
                const uploadRes = await uploadImage(image, `report_${Date.now()}.jpg`);
                if (uploadRes.status === 'success') imageUrl = uploadRes.fileUrl || '';
            }

            const deviceInfo = `UserAgent: ${navigator.userAgent}, Platform: ${navigator.platform}`;
            
            await submitSystemReport({
                userId: user?.userid || user?.UserID || 'Anonymous',
                type,
                subject,
                detail,
                image: imageUrl,
                deviceInfo
            });

            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                setSubject('');
                setDetail('');
                setImage(null);
                setViewMode('history'); // Switch to history after submit
            }, 1500);

        } catch (e) {
            alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const s = status || 'Open';
        if (s === 'Resolved') return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">แก้ไขแล้ว</span>;
        if (s === 'In Progress') return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">กำลังดำเนินการ</span>;
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">รอตรวจสอบ</span>;
    };

    return (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
                
                {/* Header with Tabs */}
                <div className="bg-white border-b border-gray-100 p-2 flex gap-2">
                    <button 
                        onClick={() => setViewMode('form')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${viewMode === 'form' ? 'bg-amber-50 text-amber-600' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        แจ้งปัญหา
                    </button>
                    <button 
                        onClick={() => setViewMode('history')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${viewMode === 'history' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        ประวัติการแจ้ง
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {viewMode === 'form' ? (
                    isSuccess ? (
                        <div className="p-10 flex flex-col items-center justify-center text-center h-64">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-800">ส่งข้อมูลเรียบร้อย</h4>
                            <p className="text-gray-500 text-sm mt-2">ขอบคุณสำหรับข้อมูล ทีมงานจะรีบตรวจสอบครับ</p>
                        </div>
                    ) : (
                        <div className="p-6 flex-1 overflow-y-auto space-y-4">
                            {/* Type Selector */}
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button 
                                    onClick={() => setType('bug')}
                                    className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center transition-all ${type === 'bug' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    <Bug className="w-4 h-4 mr-1.5" /> แจ้ง Bug
                                </button>
                                <button 
                                    onClick={() => setType('suggestion')}
                                    className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center transition-all ${type === 'suggestion' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    <Lightbulb className="w-4 h-4 mr-1.5" /> ข้อเสนอแนะ
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">หัวข้อ (Subject) *</label>
                                <input 
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder={type === 'bug' ? "เช่น เข้าสู่ระบบไม่ได้, ปุ่มกดไม่ติด" : "เช่น อยากให้เพิ่มฟีเจอร์..."}
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">รายละเอียด (Detail) *</label>
                                <textarea 
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32"
                                    placeholder="อธิบายรายละเอียดเพิ่มเติม..."
                                    value={detail}
                                    onChange={e => setDetail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">รูปภาพประกอบ (Optional)</label>
                                {image ? (
                                    <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 h-40 group">
                                        <img src={image} className="w-full h-full object-contain" />
                                        <button 
                                            onClick={() => setImage(null)}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-90 hover:opacity-100 shadow-sm"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors"
                                    >
                                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-xs">คลิกเพื่อแนบรูปภาพ</span>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </div>

                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting || !subject || !detail}
                                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 ${type === 'bug' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5 mr-2" /> ส่งข้อมูล</>}
                            </button>
                        </div>
                    )
                ) : (
                    // History Tab
                    <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                        {isLoadingHistory ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-sm">
                                <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                ยังไม่มีประวัติการแจ้ง
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                {item.Type === 'bug' ? <Bug className="w-4 h-4 text-red-500"/> : <Lightbulb className="w-4 h-4 text-amber-500"/>}
                                                <span className="font-bold text-gray-800 text-sm">{item.Subject}</span>
                                            </div>
                                            {getStatusBadge(item.Status)}
                                        </div>
                                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-2 line-clamp-3">{item.Detail}</p>
                                        
                                        {/* Admin Response Section */}
                                        {item.AdminResponse && (
                                            <div className="bg-blue-50 border-l-2 border-blue-500 p-2 text-xs text-blue-800 mt-2 rounded-r">
                                                <div className="font-bold mb-1 flex items-center"><MessageSquareWarning className="w-3 h-3 mr-1"/> ตอบกลับจาก Admin:</div>
                                                {item.AdminResponse}
                                            </div>
                                        )}

                                        <div className="text-[10px] text-gray-400 mt-2 flex justify-between items-center">
                                            <span>ID: {item.ReportID}</span>
                                            <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {new Date(item.Timestamp).toLocaleDateString('th-TH')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemFeedbackModal;
