
import React, { useState, useMemo } from 'react';
import { AppData, User, PassportMission, CheckInLog } from '../types';
import { Award, CheckCircle, Target, ShieldCheck, Lock, Star, Zap, Crown, Flame, Calendar, RefreshCw } from 'lucide-react';
import { getUserCheckInHistory } from '../services/api';

interface PassportViewProps {
    data: AppData;
    user: User;
}

// --- Skeleton Component ---
const PassportSkeleton = () => (
    <div className="pb-20 space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-800 rounded-3xl shadow-xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5"></div>
            <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-full bg-white/20"></div>
                <div className="space-y-2 flex-1">
                    <div className="h-6 bg-white/20 rounded w-1/2"></div>
                    <div className="h-4 bg-white/20 rounded w-1/3"></div>
                </div>
            </div>
        </div>

        {/* Date Tabs Skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-10 w-24 bg-gray-200 rounded-xl shrink-0"></div>
            ))}
        </div>

        {/* Card Skeleton */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 h-[400px]">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
            <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-2xl"></div>
                ))}
            </div>
        </div>
    </div>
);

const PassportView: React.FC<PassportViewProps> = ({ data, user }) => {
    const [userLogs, setUserLogs] = useState<CheckInLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeDate, setActiveDate] = useState<string>('');

    const fetchLogs = async () => {
        try {
            const logs = await getUserCheckInHistory(user.userid);
            setUserLogs(logs);
        } catch (e) { console.error(e); }
    };

    // Initialize & Fetch
    React.useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchLogs();
            setLoading(false);
        };
        init();
    }, [user.userid]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchLogs();
        // Add artificial delay for visual feedback
        setTimeout(() => setRefreshing(false), 800);
    };

    const missions = useMemo(() => {
        return data.passportConfig?.missions || [];
    }, [data.passportConfig]);

    // Set default date to today or first mission date
    React.useEffect(() => {
        if (!activeDate && missions.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const hasToday = missions.find(m => m.date === today);
            setActiveDate(hasToday ? today : missions[0].date);
        }
    }, [missions, activeDate]);

    // --- Calculation Logic ---
    const calculateProgress = (mission: PassportMission) => {
        if (!mission) return { progress: 0, total: 0, isComplete: false, reqStatus: [] };

        const missionDate = mission.date;
        const dailyLogs = userLogs.filter(log => log.Timestamp.startsWith(missionDate));
        
        let completedReqs = 0;
        const reqStatus = mission.requirements.map(req => {
            let achieved = false;
            let currentVal = 0;

            if (req.type === 'specific_activity') {
                const found = dailyLogs.find(l => l.ActivityID === req.targetId);
                if (found) { achieved = true; currentVal = 1; }
            } else if (req.type === 'total_count') {
                currentVal = dailyLogs.length;
                if (currentVal >= req.targetValue) achieved = true;
            } else if (req.type === 'category_count') {
                const catLogs = dailyLogs.filter(l => {
                    const act = data.activities.find(a => a.id === l.ActivityID);
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

    // Calculate Total Stats
    const totalStats = useMemo(() => {
        const totalCheckIns = userLogs.length;
        const level = Math.floor(totalCheckIns / 5) + 1; // Simple level logic
        const nextLevel = level * 5;
        const progressToNext = ((totalCheckIns % 5) / 5) * 100;
        return { totalCheckIns, level, nextLevel, progressToNext };
    }, [userLogs]);

    // Helper to get soft theme based on reward color
    const getTheme = (colorClass: string) => {
        if (colorClass.includes('yellow')) return { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-800' };
        if (colorClass.includes('orange')) return { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-800' };
        if (colorClass.includes('blue')) return { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800' };
        if (colorClass.includes('purple')) return { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-800' };
        if (colorClass.includes('green')) return { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-800' };
        if (colorClass.includes('gray')) return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800' };
        return { bg: 'bg-white', border: 'border-gray-100', text: 'text-gray-800' };
    };

    if (loading) return <PassportSkeleton />;

    const currentMission = missions.find(m => m.date === activeDate);
    const stats = currentMission ? calculateProgress(currentMission) : null;
    const theme = currentMission ? getTheme(currentMission.rewardColor) : getTheme('');

    if (missions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 m-4 animate-in fade-in">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-full mb-6 shadow-inner border border-indigo-100">
                    <ShieldCheck className="w-20 h-20 text-indigo-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-700">ยังไม่มีภารกิจ</h3>
                <p className="text-sm text-gray-500 mt-2">ระบบจะเปิดภารกิจสะสมแต้มเร็วๆ นี้</p>
            </div>
        );
    }

    return (
        <div className="pb-24 space-y-6 animate-in fade-in duration-500 font-kanit">
            
            {/* 1. Header Stats (Gamified) */}
            <div className="bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#4338ca] rounded-3xl shadow-2xl p-6 text-white relative overflow-hidden border border-indigo-700">
                
                {/* Refresh Button */}
                <button 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20 backdrop-blur-sm"
                >
                    <RefreshCw className={`w-5 h-5 text-white/80 ${refreshing ? 'animate-spin' : ''}`} />
                </button>

                {/* Background Pattern */}
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Award className="w-48 h-48 transform rotate-12" />
                </div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>

                <div className="relative z-10 flex items-center gap-5">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-indigo-300 p-1">
                            <img 
                                src={user.PictureUrl || `https://ui-avatars.com/api/?name=${user.Name}&background=random`} 
                                className="w-full h-full rounded-full object-cover shadow-lg"
                            />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow border border-white">
                            LVL {totalStats.level}
                        </div>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-indigo-50 truncate">{user.Name}</h2>
                        <div className="flex items-center gap-2 text-xs text-indigo-200 mt-1">
                            <Flame className="w-3 h-3 text-orange-400 fill-current" />
                            <span>{totalStats.totalCheckIns} Total Check-ins</span>
                        </div>
                        
                        {/* XP Bar */}
                        <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-indigo-300 mb-1">
                                <span>Progress</span>
                                <span>{totalStats.totalCheckIns % 5} / 5 to Next Level</span>
                            </div>
                            <div className="w-full bg-indigo-900/50 rounded-full h-1.5 overflow-hidden border border-indigo-500/30">
                                <div 
                                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(56,189,248,0.5)]" 
                                    style={{ width: `${totalStats.progressToNext}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Date Selector (Pills) */}
            <div>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
                    {missions.map(m => {
                        const isActive = activeDate === m.date;
                        const dateObj = new Date(m.date);
                        return (
                            <button
                                key={m.id}
                                onClick={() => setActiveDate(m.date)}
                                className={`flex flex-col items-center min-w-[70px] p-2 rounded-2xl transition-all duration-300 border ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 transform scale-105' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">
                                    {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                                </span>
                                <span className="text-xl font-bold">
                                    {dateObj.getDate()}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. Main Mission Card */}
            {currentMission && stats ? (
                <div className="relative animate-in slide-in-from-bottom-2 duration-500 fade-in fill-mode-backwards" key={currentMission.id}>
                    {/* Dynamic Background Card */}
                    <div className={`${theme.bg} rounded-[32px] shadow-xl overflow-hidden border ${theme.border} relative z-10 transition-all duration-500`}>
                        {/* Status Strip */}
                        <div className={`h-2 w-full ${stats.isComplete ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gray-200/50'}`}></div>
                        
                        <div className="p-6 md:p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className={`text-2xl font-bold leading-tight ${theme.text}`}>{currentMission.title}</h2>
                                    {currentMission.description && (
                                        <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-sm whitespace-pre-line">
                                            {currentMission.description}
                                        </p>
                                    )}
                                </div>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border bg-white ${stats.isComplete ? 'border-green-200 text-green-600' : `${theme.border} text-gray-400`}`}>
                                    {stats.isComplete ? <Crown className="w-6 h-6 fill-current animate-bounce" /> : <Target className="w-6 h-6" />}
                                </div>
                            </div>

                            {/* Requirements Grid with Staggered Animation */}
                            <div className="grid grid-cols-1 gap-3 mb-8">
                                {stats.reqStatus.map((item, idx) => (
                                    <div 
                                        key={item.id} 
                                        className={`group relative p-4 rounded-2xl border transition-all duration-300 overflow-hidden animate-in slide-in-from-bottom-3 fade-in fill-mode-backwards ${item.achieved ? 'bg-white border-green-200 shadow-md ring-1 ring-green-100' : 'bg-white/60 border-dashed border-gray-300 opacity-80 hover:opacity-100 hover:bg-white'}`}
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${item.achieved ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-gray-100 text-gray-400'}`}>
                                                {item.achieved ? <CheckCircle className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {/* Modified: Allow text wrapping, remove truncate */}
                                                <h4 className={`text-sm font-bold leading-tight ${item.achieved ? 'text-gray-800' : 'text-gray-500'}`}>{item.label}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-700 ${item.achieved ? 'bg-green-500' : 'bg-gray-400'}`} 
                                                            style={{ width: `${Math.min(100, (item.currentVal / item.targetValue) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] font-mono text-gray-400">
                                                        {item.currentVal}/{item.targetValue}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Shine Effect */}
                                        {item.achieved && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-100/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>}
                                    </div>
                                ))}
                            </div>

                            {/* Footer Reward Section */}
                            <div className="mt-auto bg-slate-900 rounded-2xl p-1 relative overflow-hidden group">
                                <div className={`absolute inset-0 bg-gradient-to-r ${currentMission.rewardColor.replace('bg-', 'from-').replace('500', '600')} to-purple-600 opacity-20`}></div>
                                <div className="relative bg-slate-800/80 backdrop-blur-md rounded-xl p-4 flex items-center justify-between border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg ${stats.isComplete ? currentMission.rewardColor + ' text-white' : 'bg-slate-700 text-slate-500'}`}>
                                            <Star className={`w-5 h-5 ${stats.isComplete ? 'fill-current' : ''}`} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Mission Reward</p>
                                            <p className={`text-sm font-bold ${stats.isComplete ? 'text-white' : 'text-slate-500'}`}>
                                                {currentMission.rewardLabel}
                                            </p>
                                        </div>
                                    </div>
                                    {stats.isComplete ? (
                                        <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold border border-green-500/30 flex items-center">
                                            Claimed <CheckCircle className="w-3 h-3 ml-1.5" />
                                        </div>
                                    ) : (
                                        <div className="bg-slate-700/50 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold border border-white/5 flex items-center">
                                            Locked <Lock className="w-3 h-3 ml-1.5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Decorative Elements */}
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-2xl opacity-20 -z-10"></div>
                    <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full blur-3xl opacity-20 -z-10"></div>
                </div>
            ) : (
                <div className="text-center py-10 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>เลือกวันที่เพื่อดูภารกิจ</p>
                </div>
            )}
        </div>
    );
};

export default PassportView;
