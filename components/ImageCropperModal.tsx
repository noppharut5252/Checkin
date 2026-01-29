
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../services/utils';
import { X, Check, Lock, Unlock, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperModalProps {
    imageSrc: string;
    onCropComplete: (base64: string) => void;
    onClose: () => void;
    aspectRatio?: number; // Optional initial aspect ratio
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ imageSrc, onCropComplete, onClose, aspectRatio: initialRatio }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [aspect, setAspect] = useState<number | undefined>(initialRatio);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isLocked, setIsLocked] = useState(!!initialRatio);

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedImage);
        } catch (e) {
            console.error(e);
            alert('Error cropping image');
        }
    };

    const toggleAspectLock = () => {
        if (isLocked) {
            setAspect(undefined);
            setIsLocked(false);
        } else {
            setAspect(1); // Default to square if re-locking
            setIsLocked(true);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-4 bg-gray-900 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold">Crop Image</h3>
                    <button onClick={onClose}><X className="w-5 h-5"/></button>
                </div>
                
                <div className="flex-1 relative bg-gray-100">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspect}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteCallback}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        objectFit="contain"
                    />
                </div>

                <div className="p-4 bg-white border-t border-gray-200 shrink-0 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 font-bold mb-1 block">Zoom</label>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 font-bold mb-1 block">Rotation</label>
                            <input
                                type="range"
                                value={rotation}
                                min={0}
                                max={360}
                                step={1}
                                aria-labelledby="Rotation"
                                onChange={(e) => setRotation(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            <button 
                                onClick={toggleAspectLock} 
                                className={`p-2 rounded-lg border ${isLocked ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                                title={isLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio (Square)"}
                            >
                                {isLocked ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>}
                            </button>
                            {isLocked && (
                                <div className="flex gap-1">
                                    <button onClick={() => setAspect(1)} className={`px-3 py-1 text-xs rounded border ${aspect===1?'bg-blue-600 text-white':'bg-white text-gray-600'}`}>1:1</button>
                                    <button onClick={() => setAspect(16/9)} className={`px-3 py-1 text-xs rounded border ${aspect===16/9?'bg-blue-600 text-white':'bg-white text-gray-600'}`}>16:9</button>
                                    <button onClick={() => setAspect(4/3)} className={`px-3 py-1 text-xs rounded border ${aspect===4/3?'bg-blue-600 text-white':'bg-white text-gray-600'}`}>4:3</button>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-bold">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex items-center">
                                <Check className="w-4 h-4 mr-2"/> Done
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropperModal;
