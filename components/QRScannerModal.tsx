
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, RefreshCw, AlertTriangle, Settings } from 'lucide-react';
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
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            
            // Stop previous stream if exists
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            // Request camera with preference for back camera
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Wait for video to be ready
                videoRef.current.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
                await videoRef.current.play();
                requestRef.current = requestAnimationFrame(tick);
                setLoading(false);
            }
        } catch (err: any) {
            console.error("Camera Error:", err);
            setLoading(false);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('กรุณากดปุ่มด้านล่างเพื่ออนุญาตให้เข้าถึงกล้อง');
            } else {
                setError('ไม่สามารถเปิดกล้องได้ กรุณาลองใหม่อีกครั้ง');
            }
        }
    }, []);

    useEffect(() => {
        if (!isOpen) {
            // Cleanup when modal closes
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            return;
        }

        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isOpen, startCamera]);

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
            {/* Header with Safe Area Padding */}
            <div className="absolute top-0 left-0 right-0 pt-safe z-20 pointer-events-none">
                <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent text-white pointer-events-auto">
                    <h3 className="text-lg font-bold flex items-center drop-shadow-md">
                        <Camera className="w-5 h-5 mr-2" /> สแกน QR Code
                    </h3>
                    <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors backdrop-blur-sm">
                        <X className="w-6 h-6" />
                    </button>
                </div>
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
                    <div className="text-white text-center p-6 max-w-sm z-10 px-4 w-full">
                        <div className="bg-red-500/20 p-6 rounded-2xl border border-red-500/50 mb-6 backdrop-blur-sm shadow-xl">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <h4 className="font-bold text-lg mb-2">ไม่สามารถเข้าถึงกล้อง</h4>
                            <p className="text-sm opacity-90 mb-6">{error}</p>
                            
                            {/* Retry / Request Permission Button */}
                            <button 
                                onClick={startCamera}
                                className="w-full py-3 bg-white text-red-600 rounded-xl font-bold flex items-center justify-center active:scale-95 transition-transform hover:bg-gray-100"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                ขออนุญาต / ลองใหม่
                            </button>
                        </div>
                        
                        <button onClick={onClose} className="text-gray-400 hover:text-white underline text-sm">
                            ปิดหน้าต่าง
                        </button>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Overlay Frame */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-64 border-2 border-blue-500 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
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
                        <div className="absolute bottom-20 text-white text-center text-sm bg-black/40 px-4 py-2 rounded-full backdrop-blur-md pb-safe mb-4">
                            ส่องไปที่ QR Code ของกิจกรรมเพื่อเช็คอิน
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default QRScannerModal;
