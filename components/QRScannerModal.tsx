
import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (code: string) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScan }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const requestRef = useRef<number>(0);

    useEffect(() => {
        if (!isOpen) return;

        let stream: MediaStream | null = null;

        const startCamera = async () => {
            try {
                setLoading(true);
                setError('');
                
                // Request camera with preference for back camera
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment" } 
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Wait for video to be ready
                    videoRef.current.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
                    await videoRef.current.play();
                    requestRef.current = requestAnimationFrame(tick);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Camera Error:", err);
                setError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้องใน Browser');
                setLoading(false);
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isOpen]);

    const tick = () => {
        if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (ctx) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                // @ts-ignore - jsQR type definition might be missing in some setups
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (code) {
                    // QR Found
                    if (code.data) {
                        onScan(code.data);
                        return; // Stop scanning logic (parent should close or handle)
                    }
                }
            }
        }
        requestRef.current = requestAnimationFrame(tick);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-in fade-in">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent text-white">
                <h3 className="text-lg font-bold flex items-center">
                    <Camera className="w-5 h-5 mr-2" /> สแกน QR Code
                </h3>
                <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Camera Area */}
            <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center text-white z-0">
                        <div className="flex flex-col items-center">
                            <RefreshCw className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                            <p>กำลังเปิดกล้อง...</p>
                        </div>
                    </div>
                )}
                
                {error ? (
                    <div className="text-white text-center p-6 max-w-sm">
                        <div className="bg-red-500/20 p-4 rounded-xl border border-red-500/50 mb-4">
                            <X className="w-10 h-10 mx-auto text-red-500 mb-2" />
                            <p>{error}</p>
                        </div>
                        <button onClick={onClose} className="px-6 py-2 bg-white text-black rounded-full font-bold">
                            ปิด
                        </button>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Overlay Frame */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-64 border-2 border-blue-500 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-400 -mt-1 -ml-1 rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-400 -mt-1 -mr-1 rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-400 -mb-1 -ml-1 rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-400 -mb-1 -mr-1 rounded-br-lg"></div>
                                
                                {/* Scanning Line Animation */}
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-[scan_2s_infinite_linear]"></div>
                                <style>{`
                                    @keyframes scan {
                                        0% { top: 0%; opacity: 0; }
                                        10% { opacity: 1; }
                                        90% { opacity: 1; }
                                        100% { top: 100%; opacity: 0; }
                                    }
                                `}</style>
                            </div>
                        </div>
                        <div className="absolute bottom-20 text-white text-center text-sm bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
                            ส่องไปที่ QR Code ของกิจกรรมเพื่อเช็คอิน
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default QRScannerModal;
