import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, User, PassportMission, CheckInLog } from '../types';
import { Award, Target, ShieldCheck, Lock, Calendar, RefreshCw, X, QrCode, Gift, MapPin, Check } from 'lucide-react';
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
    border: 1px solid #e5e5e5;
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
    width: 80px;
    height: 80px;
    box-shadow: inset 0 0 10px currentColor;
  }
`;

// --- Redemption Modal ---
const RedemptionModal = ({ isOpen, onClose, mission, user }: { isOpen: boolean, onClose: () => void, mission: PassportMission, user: User }) => {
    const [qrSrc, setQrSrc] = useState('');

    useEffect(() => {
        if (isOpen && mission) {
            // Generate QR Data: REDEEM|UserID|MissionID|Timestamp
            const redeemPayload = `REDEEM|${user.userid}|${mission.id}|${Date.now()}`;
            QRCode.toDataURL(redeemPayload, { margin: 1, width: 300, color: { dark: '#1e3a8a' } })
                .then(setQrSrc);
        }
    }, [isOpen, mission, user]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in zoom-in-95">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
                
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center text-white">
                    <Gift className="w-12 h-12 mx-auto mb-2 animate-bounce" />
                    <h3 className="text-xl font-bold">แลกของรางวัล</h3>
                    <p className="text-indigo-100 text-sm">{mission.rewardLabel}</p>
                </div>

                <div className="p-8 flex flex-col items-center text-center">
                    <div className="bg-white p-2 rounded-xl border-4 border-dashed border-indigo-200 mb-4">
                        {qrSrc ? <img src={qrSrc} className="w-48 h-48 object-contain" /> : <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-lg" />}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                        แสดง QR Code นี้ให้เจ้าหน้าที่<br/>เพื่อรับของรางวัลหรือประทับตราของจริง
                    </p>
                    <div className="text-xs bg-gray-50 text-gray-400 px-3 py-1 rounded-full font-mono">
                        REF: {mission.id.split('-')[1] || mission.id}
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
        return (data.passportConfig?.missions || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
        if (!mission) return { progress: 0, total: 0, isComplete: false, reqStatus: [] };

        const missionDate = mission.date;
        
        // 1. Logs for "Count" Requirements (Must be on the specific date)
        const dailyLogs = userLogs.filter(log => {
            if (!log.Timestamp) return false;
            // Simple string check for same day (assuming ISO format YYYY-MM-DD...)
            return log.Timestamp.startsWith(missionDate); 
        });

        // 2. Requirements Logic
        let completedReqs = 0;
        const reqStatus = mission.requirements.map(req => {
            let achieved = false;
            let currentVal = 0;

            if (req.type === 'specific_activity') {
                // BUG FIX: For specific activity, check ALL logs (Global History), not just today's
                // This fixes the issue where checking in yesterday didn't count for a specific task
                const found = userLogs.find(l => String(l.ActivityID).trim() === String(req.targetId).trim());
                if (found) { 
                    achieved = true; 
                    currentVal = 1; 
                }
            } else if (req.type === 'total_count') {
                // For counters, strictly check DAILY logs to prevent spamming from history
                currentVal = dailyLogs.length;
                if (currentVal >= req.targetValue) achieved = true;
            } else if (req.type === 'category_count') {
                // Category counts also strictly daily
                const catLogs = dailyLogs.filter(l => {
                    const act = data.activities.find(a => String(a.id) === String(l.ActivityID));
                    return act?.category === req.targetId;
                });
                currentVal = catLogs.length;
                if (currentVal >= req.targetValue) achieved = true;
            }

            if (achieved) completedReqs++;
            return { ...req, achieved, currentVal };
        });

        const isComplete = completedReqs === mission.requirements.length && mission.requirements.length > 0;
        
        return {
            progress: completedReqs,
            total: mission.requirements.length,
            isComplete,
            reqStatus
        };
    };

    // Confetti Effect when completing a mission
    useEffect(() => {
        if (loading) return;
        missions.forEach(m => {
            const status = getMissionStatus(m);
            // Simple check: If complete and this is the active view (to prevent spam on load)
            if (status.isComplete && activeMissionId === m.id) {
                // Trigger only if we haven't flagged it locally (optional, for now just allow re-trigger on view)
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

    // --- Helper for Stamp Color ---
    const getStampColor = (colorClass: string) => {
        if (colorClass.includes('yellow')) return 'text-yellow-600 border-yellow-600';
        if (colorClass.includes('orange')) return 'text-orange-600 border-orange-600';
        if (colorClass.includes('blue')) return 'text-blue-600 border-blue-600';
        if (colorClass.includes('purple')) return 'text-purple-600 border-purple-600';
        if (colorClass.includes('green')) return 'text-green-600 border-green-600';
        return 'text-indigo-600 border-indigo-600';
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
                        <p className="text-[#c5cae9] text-sm mt-1 uppercase tracking-widest">Official Record</p>
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
                    const themeColor = getStampColor(mission.rewardColor);

                    return (
                        <div 
                            key={mission.id} 
                            ref={(el) => { missionRefs.current[mission.id] = el; }}
                            className={`bg-paper passport-card rounded-2xl overflow-hidden transition-all duration-500 ${isToday ? 'ring-4 ring-yellow-400/50 transform scale-[1.02]' : ''}`}
                        >
                            {/* Mission Header */}
                            <div className="p-4 border-b border-gray-200 border-dashed flex justify-between items-center bg-white/50">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg flex items-center">
                                        {isToday && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full mr-2 shadow-sm animate-pulse">TODAY</span>}
                                        {mission.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 flex items-center mt-1">
                                        <Calendar className="w-3 h-3 mr-1" /> {new Date(mission.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mission {idx + 1}</span>
                                </div>
                            </div>

                            {/* Mission Body */}
                            <div className="p-6 relative">
                                {mission.description && (
                                    <div className="mb-6 p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-sm text-gray-600 leading-relaxed font-handwriting">
                                        "{mission.description}"
                                    </div>
                                )}

                                {/* Requirements List */}
                                <div className="space-y-4 relative z-10">
                                    {status.reqStatus.map((req, rIdx) => (
                                        <div key={req.id} className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-500 ${req.achieved ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                                                    {req.achieved ? <Check className="w-5 h-5" /> : (rIdx + 1)}
                                                </div>
                                                {/* Connecting Line */}
                                                {rIdx < status.reqStatus.length - 1 && (
                                                    <div className={`absolute top-8 left-1/2 w-0.5 h-6 -ml-px ${req.achieved && status.reqStatus[rIdx+1].achieved ? 'bg-green-300' : 'bg-gray-200'}`}></div>
                                                )}
                                            </div>
                                            <div className={`flex-1 p-3 rounded-xl border transition-all ${req.achieved ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-200'}`}>
                                                <p className={`text-sm font-medium ${req.achieved ? 'text-green-800' : 'text-gray-600'}`}>{req.label}</p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden mr-3">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-700 ${req.achieved ? 'bg-green-500' : 'bg-gray-300'}`} 
                                                            style={{ width: `${Math.min(100, (req.currentVal / req.targetValue) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-mono">{req.currentVal}/{req.targetValue}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* STAMP AREA */}
                                <div className="mt-8 flex justify-center items-center relative h-32 ink-stamp-container">
                                    {status.isComplete ? (
                                        <div className={`ink-stamp ${themeColor} relative group cursor-pointer`} onClick={() => { triggerConfetti(); setShowRedeem(mission); }}>
                                            <div className="stamp-border">
                                                <div className="text-[10px] font-bold uppercase tracking-widest border-b border-current pb-1 mb-1">Passed</div>
                                                <Award className="w-8 h-8 fill-current" />
                                                <div className="text-[9px] font-bold uppercase mt-1">{mission.rewardLabel}</div>
                                            </div>
                                            {/* Redeem Button Overlay */}
                                            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-max opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-black text-white text-xs px-2 py-1 rounded shadow-lg">แตะเพื่อแลกรางวัล</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-4 border-dashed border-gray-200 rounded-full w-24 h-24 flex flex-col items-center justify-center text-gray-300">
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
                                        className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
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
