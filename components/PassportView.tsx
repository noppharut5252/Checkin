
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, User, PassportMission, CheckInLog } from '../types';
import { Award, Target, ShieldCheck, Lock, Calendar, RefreshCw, X, QrCode, Gift, MapPin, Check, Clock, User as UserIcon, Split, Grid, LayoutList, Share2, Volume2, Star, Zap, CheckCircle2, Circle } from 'lucide-react';
import { getUserCheckInHistory } from '../services/api';
// @ts-ignore
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { sharePassportAchievement } from '../services/liff';

interface PassportViewProps {
    data: AppData;
    user: User;
}

// --- Styles for Passport Theme & Effects ---
const PASSPORT_STYLES = `
  .bg-paper {
    background-color: #fdfbf7;
    background-image: url("https://www.transparenttextures.com/patterns/cream-paper.png");
  }
  .passport-card {
    box-shadow: 
      0 10px 20px -5px rgba(0, 0, 0, 0.15), 
      0 5px 10px -2px rgba(0, 0, 0, 0.1),
      inset 0 0 20px rgba(0,0,0,0.05);
    border: 2px solid #e5e5e5;
    transform-style: preserve-3d;
    transition: transform 0.1s ease-out;
  }
  .ink-stamp {
    mask-image: url('https://www.transparenttextures.com/patterns/rough-paper.png'); 
    mix-blend-mode: multiply;
    transform: rotate(-12deg);
    animation: stamp-thud 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    opacity: 0.9;
  }
  @keyframes stamp-thud {
    0% { transform: scale(3) rotate(0deg); opacity: 0; }
    70% { transform: scale(0.9) rotate(-15deg); opacity: 1; }
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
  .perspective-container {
    perspective: 1000px;
  }
  .glow-text {
    text-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.4);
  }
  .level-progress-bar {
    transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .card-shine {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 60%, rgba(255,255,255,0) 100%);
    z-index: 10;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .passport-card:hover .card-shine {
    opacity: 1;
  }
`;

// Levels Configuration
const LEVELS = [
    { min: 0, title: 'Novice Explorer', color: 'from-gray-400 to-gray-600', icon: '🌱' },
    { min: 3, title: 'Skilled Adventurer', color: 'from-blue-400 to-blue-600', icon: '🧭' },
    { min: 6, title: 'Elite Master', color: 'from-purple-400 to-purple-600', icon: '⚔️' },
    { min: 10, title: 'Upright Legend', color: 'from-yellow-400 to-amber-600', icon: '👑' },
];

const playSound = (type: 'success' | 'stamp' | 'click') => {
    try {
        const urls = {
            success: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
            stamp: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // Thud like sound
            click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
        };
        const audio = new Audio(urls[type]);
        audio.volume = 0.4;
        audio.play().catch(()=>{});
    } catch(e){}
};

// --- Skeleton Component ---
const PassportSkeleton = () => {
    return (
        <div className="pb-24 space-y-6 font-kanit min-h-screen bg-[#f3f4f6] animate-pulse">
            {/* Header Level & Progress */}
            <div className="bg-gray-300 h-80 rounded-b-[40px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <div className="w-64 h-64 bg-gray-400 rounded-full"></div>
                </div>
                <div className="relative z-10 flex flex-col items-center text-center mt-8 space-y-4">
                    <div className="w-24 h-24 bg-gray-400 rounded-full"></div>
                    <div className="h-8 w-48 bg-gray-400 rounded-lg"></div>
                    <div className="h-6 w-32 bg-gray-400 rounded-full"></div>
                    
                    <div className="w-64 mt-6 space-y-2">
                        <div className="flex justify-between">
                            <div className="h-3 w-16 bg-gray-400 rounded"></div>
                            <div className="h-3 w-8 bg-gray-400 rounded"></div>
                        </div>
                        <div className="h-3 bg-gray-400 rounded-full w-full"></div>
                        <div className="h-3 w-40 bg-gray-400 rounded mx-auto mt-2"></div>
                    </div>
                </div>
            </div>

            {/* Toggle View */}
            <div className="-mt-10 px-6 relative z-20 flex justify-center mb-4">
                <div className="bg-white p-1 rounded-xl shadow-lg flex w-48 h-12">
                    <div className="flex-1 bg-gray-200 rounded-lg m-1"></div>
                    <div className="flex-1 m-1"></div>
                </div>
            </div>

            {/* Cards List */}
            <div className="px-4 space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl h-64 border-2 border-gray-200 p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                            <div className="space-y-2">
                                <div className="h-5 w-48 bg-gray-200 rounded"></div>
                                <div className="h-3 w-24 bg-gray-200 rounded"></div>
                            </div>
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="space-y-3">
                            <div className="h-3 w-full bg-gray-200 rounded"></div>
                            <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <div className="h-3 w-16 bg-gray-200 rounded"></div>
                                <div className="h-3 w-8 bg-gray-200 rounded"></div>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                            <div className="h-8 w-24 bg-gray-200 rounded-full"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Redemption Modal ---
const RedemptionModal = ({ isOpen, onClose, mission, user }: { isOpen: boolean, onClose: () => void, mission: PassportMission, user: User }) => {
    const [qrSrc, setQrSrc] = useState('');
    const themeColor = mission.rewardColor || '#F59E0B';

    useEffect(() => {
        if (isOpen && mission) {
            const redeemPayload = `REDEEM|${user.userid}|${mission.id}|${Date.now()}`;
            QRCode.toDataURL(redeemPayload, { margin: 1, width: 300, color: { dark: '#000000', light: '#ffffff' } })
                .then(setQrSrc);
        }
    }, [isOpen, mission, user]);

    if (!isOpen) return null;

    const fullName = `${user.Prefix || ''} ${user.Name || ''} ${user.Surname || ''}`.trim();

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in zoom-in-95 flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-full text-white transition-colors z-10">
                    <X className="w-5 h-5" />
                </button>
                
                <div 
                    className="p-8 text-center text-white relative overflow-hidden"
                    style={{ backgroundColor: themeColor }}
                >
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="relative z-10">
                        <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm shadow-inner">
                            <Gift className="w-8 h-8 text-white animate-bounce" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-widest opacity-90 mb-1">Redemption Ticket</h3>
                        <h2 className="text-2xl font-black leading-tight drop-shadow-md">{mission.rewardLabel}</h2>
                    </div>
                </div>

                <div className="p-6 flex flex-col items-center text-center bg-white relative">
                    <div className="mb-4">
                        <div className="text-xs text-gray-400 font-bold uppercase mb-2">Scan to Redeem</div>
                        <div className="p-2 rounded-xl border-4 border-dashed" style={{ borderColor: themeColor }}>
                            {qrSrc ? <img src={qrSrc} className="w-48 h-48 object-contain mix-blend-multiply" /> : <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-lg" />}
                        </div>
                    </div>
                    <div className="w-full bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center gap-3 text-left">
                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-300">
                            <img src={user.PictureUrl || `https://ui-avatars.com/api/?name=${user.Name}`} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{fullName}</p>
                            <p className="text-xs text-gray-500 truncate">ID: {user.userid}</p>
                        </div>
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
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    
    // Tilt State
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const cardContainerRef = useRef<HTMLDivElement>(null);

    const missions = useMemo(() => {
        return (data.passportConfig?.missions || [])
            .filter(m => m.isVisible !== false)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data.passportConfig]);

    // Calculate Completion Status Helper with Detailed Progress
    const calculateStatus = useMemo(() => {
        const statusMap: Record<string, { isComplete: boolean, current: number, total: number, progressPercent: number, details: any[] }> = {};
        let completedCount = 0;

        missions.forEach(m => {
            let targetLogs = userLogs;
            if (m.dateScope !== 'all_time') {
                targetLogs = userLogs.filter(l => l.Timestamp && l.Timestamp.startsWith(m.date));
            }

            // Logic calculation
            let passedCount = 0;
            const logic = m.conditionLogic || 'AND';
            let totalPossibleProgress = 0;
            let currentTotalProgress = 0;
            
            const reqDetails = m.requirements.map(req => {
                let hit = false;
                let currentVal = 0;
                let targetVal = req.targetValue || 1;

                if (req.type === 'specific_activity') {
                    hit = targetLogs.some(l => String(l.ActivityID) === String(req.targetId));
                    currentVal = hit ? 1 : 0;
                } else if (req.type === 'total_count') {
                    currentVal = Math.min(targetLogs.length, targetVal);
                    hit = currentVal >= targetVal;
                } else if (req.type === 'category_count') {
                    const catLogs = targetLogs.filter(l => {
                        const act = data.activities.find(a => String(a.id) === String(l.ActivityID));
                        return act?.category === req.targetId;
                    });
                    currentVal = Math.min(catLogs.length, targetVal);
                    hit = currentVal >= targetVal;
                }
                
                if (hit) passedCount++;
                
                // For overall progress bar
                totalPossibleProgress += targetVal;
                currentTotalProgress += currentVal;

                return { ...req, hit, currentVal, targetVal };
            });

            const isComplete = logic === 'OR' ? passedCount > 0 : passedCount === m.requirements.length && m.requirements.length > 0;
            
            // Adjust progress for OR logic: if any is 100%, total is 100%
            let progressPercent = 0;
            if (logic === 'OR') {
                const maxReqProgress = Math.max(...reqDetails.map(r => r.currentVal / r.targetVal));
                progressPercent = Math.round(maxReqProgress * 100);
            } else {
                progressPercent = totalPossibleProgress > 0 ? Math.round((currentTotalProgress / totalPossibleProgress) * 100) : 0;
            }

            statusMap[m.id] = {
                isComplete,
                current: currentTotalProgress,
                total: totalPossibleProgress,
                progressPercent,
                details: reqDetails
            };

            if (isComplete) completedCount++;
        });

        return { map: statusMap, count: completedCount };
    }, [missions, userLogs, data.activities]);

    const currentLevel = useMemo(() => {
        // Find highest level met
        const count = calculateStatus.count;
        return [...LEVELS].reverse().find(l => count >= l.min) || LEVELS[0];
    }, [calculateStatus.count]);

    const nextLevel = useMemo(() => {
        const idx = LEVELS.indexOf(currentLevel);
        return LEVELS[idx + 1] || null;
    }, [currentLevel]);

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
            // Artificial delay for smooth transition
            setTimeout(() => setLoading(false), 600);
        };
        init();
    }, [user.userid]);

    const handleRefresh = async () => {
        setRefreshing(true);
        playSound('click');
        await fetchLogs();
        setTimeout(() => setRefreshing(false), 800);
    };

    // --- 3D Tilt Logic ---
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardContainerRef.current) return;
        const rect = cardContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -5; // Max 5 deg tilt
        const rotateY = ((x - centerX) / centerX) * 5;

        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
    };

    const handleShare = () => {
        playSound('click');
        sharePassportAchievement(
            user, 
            currentLevel.title, 
            calculateStatus.count, 
            missions.length, 
            nextLevel?.title || ''
        );
    };

    const toggleView = (mode: 'list' | 'grid') => {
        if (viewMode !== mode) {
            playSound('click');
            setViewMode(mode);
        }
    };

    if (loading) {
        return <PassportSkeleton />;
    }

    // --- Render ---
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

            {/* 1. Header: Level & Progress */}
            <div className={`bg-gradient-to-br ${currentLevel.color} text-white p-6 pb-16 rounded-b-[40px] shadow-xl relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-8 opacity-20 transform rotate-12">
                    <QrCode className="w-64 h-64" />
                </div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] opacity-30 mix-blend-overlay"></div>
                
                {/* Level Badge */}
                <div className="relative z-10 flex flex-col items-center text-center mt-2">
                    <div className="text-5xl mb-2 filter drop-shadow-lg animate-in zoom-in duration-500">{currentLevel.icon}</div>
                    <h1 className="text-3xl font-black tracking-wide glow-text uppercase mb-1">{currentLevel.title}</h1>
                    <p className="text-white/80 text-sm bg-black/20 px-3 py-1 rounded-full backdrop-blur-md">
                        {calculateStatus.count} / {missions.length} Missions Completed
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="w-full max-w-xs mt-6">
                        <div className="flex justify-between text-xs font-bold mb-1 opacity-90">
                            <span>Level Progress</span>
                            <span>{nextLevel ? `${calculateStatus.count} / ${nextLevel.min}` : 'MAX'}</span>
                        </div>
                        <div className="h-3 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                            <div 
                                className="h-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.5)] level-progress-bar"
                                style={{ 
                                    width: nextLevel 
                                        ? `${Math.min(100, (calculateStatus.count / nextLevel.min) * 100)}%` 
                                        : '100%' 
                                }}
                            ></div>
                        </div>
                        {nextLevel && (
                            <p className="text-xs text-center mt-2 text-white/70">
                                Collect {nextLevel.min - calculateStatus.count} more stamps to reach <strong>{nextLevel.title}</strong>
                            </p>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                    <button onClick={handleShare} className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-md transition-colors border border-white/30 text-white">
                        <Share2 className="w-5 h-5" />
                    </button>
                    <button onClick={handleRefresh} className={`p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-md transition-colors border border-white/30 text-white ${refreshing ? 'animate-spin' : ''}`}>
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 2. View Toggle */}
            <div className="-mt-10 px-6 relative z-20 flex justify-center mb-4">
                <div className="bg-white p-1 rounded-xl shadow-lg flex border border-gray-100">
                    <button 
                        onClick={() => toggleView('list')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LayoutList className="w-4 h-4 mr-2" /> รายการ
                    </button>
                    <button 
                        onClick={() => toggleView('grid')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Grid className="w-4 h-4 mr-2" /> สะสม
                    </button>
                </div>
            </div>

            {/* 3. Content Area */}
            <div 
                className="px-4 perspective-container" 
                ref={cardContainerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {viewMode === 'list' ? (
                    <div className="space-y-6">
                        {missions.map((mission, idx) => {
                            const statusData = calculateStatus.map[mission.id];
                            const isComplete = statusData.isComplete;
                            const cardColor = mission.rewardColor || '#F59E0B';
                            const percent = statusData.progressPercent;
                            
                            return (
                                <div 
                                    key={mission.id} 
                                    className={`bg-paper passport-card rounded-2xl overflow-hidden relative group transition-all duration-300 ${isComplete ? 'border-l-8' : ''}`}
                                    style={{ 
                                        borderLeftColor: isComplete ? cardColor : undefined,
                                        transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                                    }} 
                                >
                                    <div className="card-shine"></div>
                                    
                                    <div className="p-4 border-b border-dashed border-gray-200 flex justify-between items-center bg-white/50">
                                        <div>
                                            <h3 className="font-bold text-gray-800 flex items-center">
                                                {mission.title}
                                            </h3>
                                            <div className="text-xs text-gray-500 mt-1 flex items-center">
                                                <Calendar className="w-3 h-3 mr-1"/>
                                                {mission.dateScope === 'all_time' ? 'All Time' : new Date(mission.date).toLocaleDateString('th-TH')}
                                            </div>
                                        </div>
                                        {isComplete ? (
                                            <div className="ink-stamp stamp-border" style={{ color: cardColor, width: '60px', height: '60px', padding: '2px', border: '2px solid' }}>
                                                <span className="text-[8px] font-black uppercase">PASSED</span>
                                                <Award className="w-6 h-6" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                                                <Lock className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5">
                                        {mission.description && <p className="text-sm text-gray-600 mb-4 font-handwriting">{mission.description}</p>}
                                        
                                        {/* --- PROGRESS BAR SECTION --- */}
                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                                                <span>Progress</span>
                                                <span>{percent}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className="h-full rounded-full transition-all duration-500 ease-out"
                                                    style={{ 
                                                        width: `${percent}%`,
                                                        backgroundColor: isComplete ? '#22c55e' : cardColor 
                                                    }}
                                                ></div>
                                            </div>
                                            
                                            {/* Requirements Checklist (Only if not single generic 100%) */}
                                            {statusData.details.length > 0 && (
                                                <div className="mt-3 space-y-1">
                                                    {statusData.details.map((req: any, i: number) => (
                                                        <div key={i} className="flex items-center text-xs text-gray-500">
                                                            {req.hit ? <CheckCircle2 className="w-3 h-3 text-green-500 mr-2" /> : <Circle className="w-3 h-3 text-gray-300 mr-2" />}
                                                            <span className={req.hit ? 'text-gray-700 font-medium' : ''}>
                                                                {req.label || (req.type === 'specific_activity' ? 'เข้าร่วมกิจกรรม' : 'สะสมแต้ม')} 
                                                                <span className="opacity-70 ml-1">({req.currentVal}/{req.targetVal})</span>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-4">
                                            <div className="flex items-center text-sm font-bold text-gray-700">
                                                <Gift className="w-4 h-4 mr-2 text-orange-500" />
                                                <span style={{ color: cardColor }}>{mission.rewardLabel}</span>
                                            </div>
                                            {isComplete && (
                                                <button 
                                                    onClick={() => { playSound('click'); setShowRedeem(mission); }}
                                                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center"
                                                >
                                                    <Gift className="w-3 h-3 mr-1 animate-pulse" /> แลกรางวัล
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3 animate-in zoom-in duration-300">
                        {missions.map((mission, idx) => {
                            const isComplete = calculateStatus.map[mission.id].isComplete;
                            const cardColor = mission.rewardColor || '#F59E0B';
                            
                            return (
                                <div 
                                    key={mission.id}
                                    onClick={() => { if(isComplete) { playSound('stamp'); setShowRedeem(mission); } }}
                                    className={`aspect-square rounded-xl flex flex-col items-center justify-center p-2 text-center border-2 transition-all relative overflow-hidden ${isComplete ? 'bg-white shadow-md cursor-pointer border-transparent' : 'bg-gray-100 border-gray-200 grayscale opacity-70'}`}
                                >
                                    {isComplete ? (
                                        <>
                                            <div className="absolute inset-0 bg-paper opacity-50"></div>
                                            {mission.stampImage ? (
                                                <img src={mission.stampImage} className="w-12 h-12 object-contain ink-stamp z-10" style={{ filter: `drop-shadow(0 2px 2px ${cardColor}40)` }} />
                                            ) : (
                                                <div className="ink-stamp z-10" style={{ color: cardColor }}>
                                                    <Award className="w-10 h-10" />
                                                </div>
                                            )}
                                            <span className="text-[9px] font-bold mt-2 z-10 truncate w-full" style={{ color: cardColor }}>{mission.rewardLabel}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-8 h-8 text-gray-300 mb-1" />
                                            <span className="text-[8px] text-gray-400 font-bold uppercase">Locked</span>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="h-12 text-center text-gray-400 text-xs font-mono opacity-50 pt-8">
                Official Digital Passport System
            </div>
        </div>
    );
};

export default PassportView;
