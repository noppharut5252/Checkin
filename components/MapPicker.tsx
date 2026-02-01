
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Search, Loader2, LocateFixed, Target, Crosshair, AlertCircle } from 'lucide-react';

interface MapPickerProps {
    lat: number;
    lng: number;
    radius?: number; // New: For live preview
    onChange: (lat: number, lng: number) => void;
}

const MapPicker: React.FC<MapPickerProps> = ({ lat, lng, radius = 0, onChange }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapObj = useRef<L.Map | null>(null);
    const markerObj = useRef<L.Marker | null>(null);
    const circleObj = useRef<L.Circle | null>(null); // New: Circle for radius preview
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

    useEffect(() => {
        if (!mapRef.current) return;
        
        if (!mapObj.current) {
            const initialLat = lat || 13.7563;
            const initialLng = lng || 100.5018;
            
            mapObj.current = L.map(mapRef.current, {
                zoomControl: false // Move zoom to bottom right or custom
            }).setView([initialLat, initialLng], 16);
            
            L.control.zoom({ position: 'bottomright' }).addTo(mapObj.current);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(mapObj.current);

            // Init Marker
            markerObj.current = L.marker([initialLat, initialLng], { draggable: true }).addTo(mapObj.current);
            
            // Init Circle
            circleObj.current = L.circle([initialLat, initialLng], {
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                weight: 2,
                radius: radius
            }).addTo(mapObj.current);

            // Events
            markerObj.current.on('dragend', (e) => {
                const { lat, lng } = e.target.getLatLng();
                if (circleObj.current) circleObj.current.setLatLng([lat, lng]);
                onChange(lat, lng);
            });

            mapObj.current.on('click', (e) => {
                const { lat, lng } = e.latlng;
                if (markerObj.current) markerObj.current.setLatLng([lat, lng]);
                if (circleObj.current) circleObj.current.setLatLng([lat, lng]);
                onChange(lat, lng);
            });
            
            setTimeout(() => { mapObj.current?.invalidateSize(); }, 500);
        }
    }, []);

    // Sync Marker & Circle with Prop Changes
    useEffect(() => {
        if (markerObj.current && lat && lng) {
            const cur = markerObj.current.getLatLng();
            if (cur.lat !== lat || cur.lng !== lng) {
                markerObj.current.setLatLng([lat, lng]);
                if (circleObj.current) circleObj.current.setLatLng([lat, lng]);
                // Optional: mapObj.current?.setView([lat, lng], mapObj.current.getZoom());
            }
        }
    }, [lat, lng]);

    // Sync Circle Radius
    useEffect(() => {
        if (circleObj.current) {
            circleObj.current.setRadius(radius || 0);
        }
    }, [radius]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);
                
                if (mapObj.current && markerObj.current) {
                    mapObj.current.setView([newLat, newLng], 17);
                    markerObj.current.setLatLng([newLat, newLng]);
                    if (circleObj.current) circleObj.current.setLatLng([newLat, newLng]);
                    onChange(newLat, newLng);
                }
            } else {
                alert('ไม่พบสถานที่');
            }
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาดในการค้นหา');
        } finally {
            setIsSearching(false);
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) return alert('เบราว์เซอร์ไม่รองรับ GPS');
        
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                setGpsAccuracy(Math.round(accuracy));
                if (mapObj.current && markerObj.current) {
                    mapObj.current.setView([latitude, longitude], 18);
                    markerObj.current.setLatLng([latitude, longitude]);
                    if (circleObj.current) circleObj.current.setLatLng([latitude, longitude]);
                    onChange(latitude, longitude);
                }
                setIsLocating(false);
            },
            (err) => {
                console.error(err);
                alert('ไม่สามารถเข้าถึงตำแหน่งปัจจุบันได้');
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const pinToCenter = () => {
        if (mapObj.current && markerObj.current) {
            const center = mapObj.current.getCenter();
            markerObj.current.setLatLng(center);
            if (circleObj.current) circleObj.current.setLatLng(center);
            onChange(center.lat, center.lng);
        }
    };

    return (
        <div className="relative group">
            {/* Search Overlay */}
            <div className="absolute top-2 left-2 z-[400] bg-white rounded-lg shadow-lg flex p-1 w-64 max-w-[70%] border border-gray-100 transition-all focus-within:ring-2 focus-within:ring-blue-500">
                <input 
                    type="text" 
                    className="flex-1 px-2 py-1 text-xs outline-none"
                    placeholder="ค้นหาชื่อสถานที่..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button 
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Search className="w-3.5 h-3.5"/>}
                </button>
            </div>

            {/* GPS Accuracy Badge */}
            {gpsAccuracy !== null && (
                <div className="absolute top-14 left-2 z-[400] animate-in fade-in slide-in-from-left-2">
                    <div className={`px-2 py-1 rounded-md text-[10px] font-bold border shadow-sm flex items-center gap-1.5 ${gpsAccuracy < 50 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                        <LocateFixed className="w-3 h-3" />
                        ความแม่นยำ: ±{gpsAccuracy} เมตร
                    </div>
                </div>
            )}

            {/* Floating Action Buttons */}
            <div className="absolute top-2 right-2 z-[400] flex flex-col gap-2">
                <button 
                    onClick={getCurrentLocation}
                    disabled={isLocating}
                    title="ใช้ตำแหน่งปัจจุบันของคุณ"
                    className="p-2.5 bg-white text-blue-600 rounded-xl shadow-lg border border-gray-100 hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
                </button>
                <button 
                    onClick={pinToCenter}
                    title="ปักหมุดที่กึ่งกลางแผนที่"
                    className="p-2.5 bg-white text-gray-700 rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
                >
                    <Crosshair className="w-5 h-5" />
                </button>
            </div>

            {/* Hint for Live Preview */}
            <div className="absolute bottom-2 left-2 z-[400] pointer-events-none">
                <div className="bg-black/60 backdrop-blur-sm text-white text-[9px] px-2 py-1 rounded font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Target className="w-2.5 h-2.5 text-blue-400" />
                    Live Radius Preview Active
                </div>
            </div>

            <div ref={mapRef} className="w-full h-72 rounded-xl border border-gray-200 z-0 overflow-hidden shadow-inner" />
        </div>
    );
};

export default MapPicker;
