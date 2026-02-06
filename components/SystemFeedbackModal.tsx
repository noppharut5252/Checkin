
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { X, MessageSquareWarning, Bug, Lightbulb, Upload, Loader2, Image as ImageIcon, Send, CheckCircle } from 'lucide-react';
import { submitSystemReport, uploadImage } from '../services/api';
import { resizeImage } from '../services/utils';

interface SystemFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: User | null;
}

const SystemFeedbackModal: React.FC<SystemFeedbackModalProps> = ({ isOpen, onClose, user }) => {
    const [type, setType] = useState<'bug' | 'suggestion'>('bug');
    const [subject, setSubject] = useState('');
    const [detail, setDetail] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                onClose();
                setIsSuccess(false);
                // Reset form
                setSubject('');
                setDetail('');
                setImage(null);
            }, 2000);

        } catch (e) {
            alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className={`p-4 flex items-center justify-between text-white ${type === 'bug' ? 'bg-red-600' : 'bg-amber-500'}`}>
                    <h3 className="font-bold flex items-center text-lg">
                        {type === 'bug' ? <Bug className="w-5 h-5 mr-2" /> : <Lightbulb className="w-5 h-5 mr-2" />}
                        {type === 'bug' ? 'แจ้งปัญหาการใช้งาน' : 'เสนอแนะ/ติชม'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>

                {isSuccess ? (
                    <div className="p-10 flex flex-col items-center justify-center text-center h-64">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-800">ส่งข้อมูลเรียบร้อย</h4>
                        <p className="text-gray-500 text-sm mt-2">ขอบคุณสำหรับข้อมูล ทีมงานจะนำไปปรับปรุงระบบต่อไป</p>
                    </div>
                ) : (
                    <div className="p-6 flex-1 overflow-y-auto space-y-4">
                        
                        {/* Type Selector */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setType('bug')}
                                className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center transition-all ${type === 'bug' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
                            >
                                <Bug className="w-4 h-4 mr-1.5" /> แจ้ง Bug / Error
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
                            <label className="block text-xs font-bold text-gray-700 mb-2">รูปภาพประกอบ (Screenshot) - Optional</label>
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
                )}
            </div>
        </div>
    );
};

export default SystemFeedbackModal;
