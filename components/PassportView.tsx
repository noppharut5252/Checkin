
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, User, PassportMission, CheckInLog } from '../types';
import { Award, Target, ShieldCheck, Lock, Calendar, RefreshCw, X, QrCode, Gift, MapPin, Check, Clock, User as UserIcon, Split } from 'lucide-react';
import { getUserCheckInHistory } from '../services/api';
// @ts-ignore
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';

interface PassportViewProps {
    data: AppData;
    user: User;
}

// --- Styles for Passport Theme ---
const PASSPORT_STYLES = `
  .bg-paper {
    background-color: #fdfbf7;
    background-image: url("https://www.transparenttextures.com/patterns/cream-paper.png");
  }
  .passport-card {
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.1), 
      0 2px 4px -1px rgba(0, 0, 0, 0.06),
      inset 0 0 20px rgba(0,0,0,0.05);
    border: 2px solid #e5e5e5;
  }
  .ink-stamp {
    mask-image: url('https://www.transparenttextures.com/patterns/rough-paper.png'); 
    mix-blend-mode: multiply;
    transform: rotate(-12deg);
    animation: stamp-thud 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    opacity: 0.9;
  }
  .ink-stamp-container {
    perspective: 1000px;
  }
  @keyframes stamp-thud {
    0% { transform: scale(3) rotate(0deg); opacity: 0; }
    100% { transform: scale(1) rotate(-12deg); opacity: 0.9; }
  }
  .stamp-border {
    border: 3px solid currentColor;
    border-radius: 50%;
    padding: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 90px;
    height: 90px;
    box-shadow: inset 0 0 10px currentColor;
  }
`;

// --- Redemption Modal (Enhanced for Staff Verification) ---
const RedemptionModal = ({ isOpen, onClose, mission, user }: { isOpen: boolean, onClose: () => void, mission: PassportMission, user: User }) => {
    const [qrSrc, setQrSrc] = useState('');
    const themeColor = mission.rewardColor || '#F59E0B';

    useEffect(() => {
        if (isOpen && mission) {
            // Generate QR Data: REDEEM|UserID|MissionID|Timestamp
            const redeemPayload = `REDEEM|${user.userid}|${mission.id}|${Date.now()}`;
            // QR Color matches the theme (dark version)
            QRCode.toDataURL(redeemPayload, { margin: 1, width: 300, color: { dark: '#000000', light: '#ffffff' } })
                .then(setQrSrc);
        }
    }, [isOpen, mission, user]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in zoom-in-95 flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-full text-white transition-colors z-10">
                    <X className="w-5 h-5" />
                </button>
                
                {/* Header Ticket Style */}
                <div 
                    className="p-8 text-center text-white relative overflow-hidden"
                    style={{ backgroundColor: themeColor }}
                >
                    {/* Pattern Overlay */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    
                    <div className="relative z-10">
                        <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm shadow-inner">
                            <Gift className="w-8 h-8 text-white animate-bounce" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-widest opacity-90 mb-1">Redemption Ticket</h3>
                        <h2 className="text-2xl font-black leading-tight drop-shadow-md">{mission.rewardLabel}</h2>
                        <p className="text-white/80 text-xs mt-2 font-medium bg-black/10 inline-block px-3 py-1 rounded-full">
                            {mission.title}
                        </p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col items-center text-center bg-white relative">
                    {/* Cutout Effect */}
                    <div className="absolute -top-3 left-0 w-6 h-6 bg-black/80 rounded-full"></div>
                    <div className="absolute -top-3 right-0 w-6 h-6 bg-black/80 rounded-full"></div>
                    <div className="absolute top-0 left-3 right-3 border-t-2 border-dashed border-gray-300"></div>

                    <div className="mb-4">
                        <div className="text-xs text-gray-400 font-bold uppercase mb-2">Scan to Redeem</div>
                        <div className="p-2 rounded-xl border-4 border-dashed" style={{ borderColor: themeColor }}>
                            {qrSrc ? <img src={qrSrc} className="w-48 h-48 object-contain mix-blend-multiply" /> : <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-lg" />}
                        </div>
                    </div>

                    {/* User Identity for Staff */}
                    <div className="w-full bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-300">
                            <img src={user.PictureUrl || `https://ui-avatars.com/api/?name=${user.Name}`} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-gray-400 font-bold uppercase">Owner</p>
                            <p className="text-sm font-bold text-gray-900 truncate">{user.Name}</p>
                            <p className="text-xs text-gray-500 truncate">ID: {user.userid}</p>
                        </div>
                    </div>

                    <div className="mt-4 text-[10px] text-gray-400 font-mono">
                        REF: {mission.id.split('-')[1] || mission.id} • {new Date().toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PassportView: React.FC<PassportViewProps> = ({ data, user }) => {
    const [userLogs, setUserLogs] = useState<CheckInLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // UI State
    const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
    const [showRedeem, setShowRedeem] = useState<PassportMission | null>(null);
    
    // Refs for scrolling
    const missionRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const missions = useMemo(() => {
        return (data.passportConfig?.missions || [])
            .filter(m => m.isVisible !== false) // Filter Hidden Missions
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data.passportConfig]);

    const fetchLogs = async () => {
        try {
            const logs = await getUserCheckInHistory(user.userid);
            setUserLogs(logs);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchLogs();
            setLoading(false);
        };
        init();
    }, [user.userid]);

    // Auto-scroll to today's mission or first incomplete
    useEffect(() => {
        if (!loading && missions.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const todayMission = missions.find(m => m.date === today);
            
            if (todayMission && missionRefs.current[todayMission.id]) {
                setActiveMissionId(todayMission.id);
                setTimeout(() => {
                    missionRefs.current[todayMission.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500);
            } else if (missions.length > 0) {
                // Default to first
                setActiveMissionId(missions[0].id);
            }
        }
    }, [loading, missions]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchLogs();
        setTimeout(() => setRefreshing(false), 800);
    };

    // --- Core Logic: Calculate Progress ---
    const getMissionStatus = (mission: PassportMission) => {
        if (!mission) return { progress: 0, total: 0, isComplete: false, reqStatus: [], completionTime: null };

        // Determine relevant logs based on scope
        let targetLogs = userLogs;
        
        if (mission.dateScope !== 'all_time') {
            // Default behavior: Check specific date
            const missionDate = mission.date;
            targetLogs = userLogs.filter(log => {
                if (!log.Timestamp) return false;
                return log.Timestamp.startsWith(missionDate); 
            });
        }

        // 2. Requirements Logic
        let completedReqs = 0;
        let lastCompleteTimestamp = 0;

        const reqStatus = mission.requirements.map(req => {
            let achieved = false;
            let currentVal = 0;
            let latestLogTime = 0;

            if (req.type === 'specific_activity') {
                // Check if Activity ID exists in target logs
                const found = targetLogs.find(l => String(l.ActivityID).trim() === String(req.targetId).trim());
                if (found) { 
                    achieved = true; 
                    currentVal = 1; 
                    latestLogTime = new Date(found.Timestamp).getTime();
                }
            } else if (req.type === 'total_count') {
                currentVal = targetLogs.length;
                if (currentVal >= req.targetValue) {
                    achieved = true;
                    // Find timestamp
                    if (targetLogs.length > 0) {
                        const sorted = [...targetLogs].sort((a,b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
                        const targetLog = sorted[Math.min(sorted.length - 1, req.targetValue - 1)]; 
                        latestLogTime = new Date(targetLog.Timestamp).getTime();
                    }
                }
            } else if (req.type === 'category_count') {
                const catLogs = targetLogs.filter(l => {
                    const act = data.activities.find(a => String(a.id) === String(l.ActivityID));
                    return act?.category === req.targetId;
                });
                currentVal = catLogs.length;
                if (currentVal >= req.targetValue) {
                    achieved = true;
                    if (catLogs.length > 0) {
                        const sorted = catLogs.sort((a,b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
                        const targetLog = sorted[Math.min(sorted.length - 1, req.targetValue - 1)];
                        latestLogTime = new Date(targetLog.Timestamp).getTime();
                    }
                }
            }

            if (achieved) {
                completedReqs++;
                if (latestLogTime > lastCompleteTimestamp) lastCompleteTimestamp = latestLogTime;
            }
            
            return { ...req, achieved, currentVal };
        });

        // 3. Logic: AND vs OR
        const logic = mission.conditionLogic || 'AND';
        let isComplete = false;
        
        if (logic === 'OR') {
            // Match ANY requirement
            isComplete = completedReqs > 0;
        } else {
            // Match ALL (Default)
            isComplete = completedReqs === mission.requirements.length && mission.requirements.length > 0;
        }
        
        return {
            progress: completedReqs,
            total: mission.requirements.length,
            isComplete,
            reqStatus,
            completionTime: isComplete && lastCompleteTimestamp > 0 ? new Date(lastCompleteTimestamp) : null
        };
    };

    // Confetti Effect when completing a mission
    useEffect(() => {
        if (loading) return;
        missions.forEach(m => {
            const status = getMissionStatus(m);
            if (status.isComplete && activeMissionId === m.id) {
                // Can trigger sound here if desired
            }
        });
    }, [userLogs, activeMissionId]);

    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#EF4444', '#10B981', '#F59E0B', '#3B82F6']
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
                <style>{PASSPORT_STYLES}</style>
                <RefreshCw className="w-12 h-12 animate-spin mb-4 text-indigo-300" />
                <p>Loading Passport...</p>
            </div>
        );
    }

    if (missions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 m-4 animate-in fade-in bg-paper rounded-3xl border-2 border-dashed border-gray-300">
                <style>{PASSPORT_STYLES}</style>
                <div className="bg-gray-100 p-8 rounded-full mb-6 shadow-inner">
                    <ShieldCheck className="w-20 h-20 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-600">ยังไม่มีภารกิจ</h3>
                <p className="text-sm text-gray-400 mt-2">โปรดรอติดตามกิจกรรมสนุกๆ เร็วๆ นี้</p>
            </div>
        );
    }

    return (
        <div className="pb-24 space-y-6 font-kanit min-h-screen bg-[#f3f4f6]">
            <style>{PASSPORT_STYLES}</style>
            
            {showRedeem && (
                <RedemptionModal 
                    isOpen={!!showRedeem} 
                    onClose={() => setShowRedeem(null)} 
                    mission={showRedeem} 
                    user={user} 
                />
            )}

            {/* 1. Passport Header */}
            <div className="bg-[#1a237e] text-white p-6 pb-12 rounded-b-[40px] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <QrCode className="w-64 h-64 transform rotate-12" />
                </div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] opacity-30 mix-blend-overlay"></div>
                
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold tracking-wider text-[#ffecb3] drop-shadow-md">DIGITAL PASSPORT</h1>
                        <p className="text--[#c5cae9] text-sm mt-1 uppercase tracking-widest">Official Record</p>
                    </div>
                    <button 
                        onClick={handleRefresh}
                        className={`p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md border border-white/20 ${refreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="relative z-10 mt-6 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-2 border-[#ffecb3] p-1 bg-white/10 backdrop-blur-sm">
                        <img 
                            src={user.PictureUrl || `https://ui-avatars.com/api/?name=${user.Name}&background=random`} 
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                    <div>
                        <div className="text-lg font-bold text-white leading-tight">{user.Name}</div>
                        <div className="text-xs text-[#c5cae9] mt-1 flex items-center">
                            <span className="bg-[#ffecb3] text-[#1a237e] px-2 py-0.5 rounded text-[10px] font-bold mr-2">ID: {user.userid?.split('-')[1] || user.userid}</span>
                            {userLogs.length} Check-ins
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Mission Booklet */}
            <div className="-mt-8 px-4 space-y-6 relative z-20">
                {missions.map((mission, idx) => {
                    const status = getMissionStatus(mission);
                    const isToday = new Date(mission.date).toDateString() === new Date().toDateString();
                    // Fallback color if undefined
                    const cardColor = mission.rewardColor || '#F59E0B'; 
                    const isOR = mission.conditionLogic === 'OR';

                    return (
                        <div 
                            key={mission.id} 
                            ref={(el) => { missionRefs.current[mission.id] = el; }}
                            className={`bg-paper passport-card rounded-2xl overflow-hidden transition-all duration-500 ${isToday ? 'ring-4 ring-offset-2 ring-yellow-400/50 transform scale-[1.02]' : ''}`}
                            style={{ 
                                borderColor: cardColor,
                                backgroundColor: isToday ? '#fff' : '#fdfbf7'
                            }} 
                        >
                            {/* Mission Header */}
                            <div 
                                className="p-4 border-b border-dashed flex justify-between items-center" 
                                style={{ 
                                    borderBottomColor: cardColor + '60',
                                    backgroundColor: cardColor + '10' // Tint header
                                }}
                            >
                                <div>
                                    <h3 className="font-bold text-lg flex items-center" style={{ color: cardColor }}>
                                        {isToday && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full mr-2 shadow-sm animate-pulse">TODAY</span>}
                                        {mission.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 flex items-center mt-1">
                                        <Calendar className="w-3 h-3 mr-1" /> 
                                        {mission.dateScope === 'all_time' ? 'สะสมยอดรวม (All Time)' : new Date(mission.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mission {idx + 1}</span>
                                </div>
                            </div>

                            {/* Mission Body */}
                            <div className="p-6 relative">
                                {mission.description && (
                                    <div className="mb-6 p-3 bg-white/60 rounded-xl border text-sm text-gray-600 leading-relaxed font-handwriting whitespace-pre-wrap shadow-sm" style={{ borderColor: cardColor + '30' }}>
                                        {mission.description}
                                    </div>
                                )}

                                {/* Condition Logic Badge */}
                                {isOR && (
                                    <div className="mb-4 flex justify-center">
                                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 flex items-center shadow-sm">
                                            <Split className="w-3 h-3 mr-1" /> ทำข้อใดข้อหนึ่งก็ได้ (Match Any)
                                        </span>
                                    </div>
                                )}

                                {/* Requirements List */}
                                <div className="space-y-4 relative z-10">
                                    {status.reqStatus.map((req, rIdx) => (
                                        <div key={req.id} className="flex items-center gap-4">
                                            <div className="relative">
                                                <div 
                                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-500 ${req.achieved ? 'text-white' : 'bg-white border-gray-300 text-gray-400'}`} 
                                                    style={req.achieved ? { backgroundColor: cardColor, borderColor: cardColor } : {}}
                                                >
                                                    {req.achieved ? <Check className="w-5 h-5" /> : (rIdx + 1)}
                                                </div>
                                                {/* Connecting Line - Only if AND logic */}
                                                {!isOR && rIdx < status.reqStatus.length - 1 && (
                                                    <div className="absolute top-8 left-1/2 w-0.5 h-6 -ml-px bg-gray-200">
                                                        {req.achieved && status.reqStatus[rIdx+1].achieved && (
                                                            <div className="w-full h-full" style={{ backgroundColor: cardColor + '80' }}></div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div 
                                                className={`flex-1 p-3 rounded-xl border transition-all ${req.achieved ? '' : 'border-gray-200 bg-white/50'}`} 
                                                style={req.achieved ? { borderColor: cardColor + '50', backgroundColor: cardColor + '10' } : {}}
                                            >
                                                <p className={`text-sm font-medium ${req.achieved ? 'text-gray-900' : 'text-gray-600'}`}>{req.label}</p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden mr-3">
                                                        <div 
                                                            className="h-full rounded-full transition-all duration-700"
                                                            style={{ 
                                                                width: `${Math.min(100, (req.currentVal / req.targetValue) * 100)}%`,
                                                                backgroundColor: req.achieved ? cardColor : '#d1d5db'
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-mono">{req.currentVal}/{req.targetValue}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* STAMP AREA */}
                                <div className="mt-8 flex flex-col justify-center items-center relative h-40 ink-stamp-container">
                                    {status.isComplete ? (
                                        <>
                                            <div 
                                                className="ink-stamp relative group cursor-pointer mb-2" 
                                                style={{ color: cardColor, borderColor: cardColor }}
                                                onClick={() => { triggerConfetti(); setShowRedeem(mission); }}
                                            >
                                                {mission.stampImage ? (
                                                    <img 
                                                        src={mission.stampImage} 
                                                        className="w-24 h-24 object-contain filter drop-shadow-md transform hover:scale-105 transition-transform" 
                                                        alt="Stamp"
                                                        style={{ filter: `drop-shadow(0 2px 4px ${cardColor}60)` }}
                                                    />
                                                ) : (
                                                    <div className="stamp-border">
                                                        <div className="text-[10px] font-bold uppercase tracking-widest border-b-2 border-current pb-1 mb-1">Passed</div>
                                                        <Award className="w-8 h-8 fill-current" />
                                                        <div className="text-[9px] font-bold uppercase mt-1 text-center leading-tight px-1">{mission.rewardLabel}</div>
                                                    </div>
                                                )}
                                            </div>
                                            {status.completionTime && (
                                                <div className="text-[10px] text-gray-500 font-mono flex items-center bg-white/80 px-2 py-1 rounded-full shadow-sm border border-gray-200">
                                                    <Clock className="w-3 h-3 mr-1 text-green-500"/>
                                                    Completed: {status.completionTime.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} {status.completionTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="border-4 border-dashed border-gray-300 rounded-full w-24 h-24 flex flex-col items-center justify-center text-gray-300">
                                            <Target className="w-8 h-8 mb-1" />
                                            <span className="text-[10px] font-bold uppercase">Mission</span>
                                            <span className="text-[9px]">Incomplete</span>
                                        </div>
                                    )}
                                </div>

                                {/* Redeem Button (Mobile Friendly - Always visible if complete) */}
                                {status.isComplete && (
                                    <button 
                                        onClick={() => setShowRedeem(mission)}
                                        className="w-full mt-4 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                        style={{ backgroundColor: cardColor }}
                                    >
                                        <Gift className="w-5 h-5 animate-pulse" /> แลกของรางวัล (Redeem)
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Spacer */}
            <div className="h-12 text-center text-gray-400 text-xs font-mono opacity-50">
                End of Passport
            </div>
        </div>
    );
};

export default PassportView;
