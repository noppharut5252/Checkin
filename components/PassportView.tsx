
import React, { useState, useMemo } from 'react';
import { AppData, User, PassportMission, CheckInLog } from '../types';
import { Award, CheckCircle, Calendar, Target, ShieldCheck, Lock, Star, ChevronRight, LayoutGrid } from 'lucide-react';
import { getUserCheckInHistory } from '../services/api';

interface PassportViewProps {
    data: AppData;
    user: User;
}

const PassportView: React.FC<PassportViewProps> = ({ data, user }) => {
    const [userLogs, setUserLogs] = useState<CheckInLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDate, setActiveDate] = useState<string>('');

    // Initialize & Fetch
    React.useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const logs = await getUserCheckInHistory(user.userid);
                setUserLogs(logs);
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        init();
    }, [user.userid]);

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
        // Filter logs for this date (using local time string match for simplicity as date is YYYY-MM-DD)
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

    const currentMission = missions.find(m => m.date === activeDate);
    const stats = currentMission ? calculateProgress(currentMission) : null;

    if (loading) return <div className="p-10 text-center">Loading Passport...</div>;

    if (missions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-2xl border-2 border-dashed m-4">
                <Award className="w-12 h-12 mb-3 opacity-20" />
                <p>ยังไม่มีภารกิจในขณะนี้</p>
            </div>
        );
    }

    return (
        <div className="pb-20 space-y-6 animate-in fade-in">
            {/* Header / Date Selector */}
            <div className="bg-indigo-900 text-white p-6 rounded-b-3xl shadow-lg -mt-4 pt-10">
                <h1 className="text-2xl font-bold flex items-center mb-1">
                    <ShieldCheck className="w-6 h-6 mr-2 text-yellow-400" /> Digital Passport
                </h1>
                <p className="text-indigo-200 text-sm mb-6">สมุดสะสมแต้มและภารกิจประจำวัน</p>
                
                {/* Date Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {missions.map(m => (
                        <button
                            key={m.id}
                            onClick={() => setActiveDate(m.date)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeDate === m.date ? 'bg-white text-indigo-900 shadow-md transform scale-105' : 'bg-indigo-800 text-indigo-300 hover:bg-indigo-700'}`}
                        >
                            {new Date(m.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Passport Page */}
            <div className="px-4">
                {currentMission && stats ? (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative min-h-[400px] flex flex-col">
                        
                        {/* Paper Texture Overlay */}
                        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>

                        {/* Stamp Overlay (If Complete) */}
                        {stats.isComplete && (
                            <div className="absolute top-10 right-10 z-20 animate-in zoom-in duration-500 pointer-events-none">
                                <div className={`w-32 h-32 rounded-full border-4 border-dashed ${currentMission.rewardColor.replace('bg-', 'border-')} flex items-center justify-center transform rotate-12 opacity-80 mix-blend-multiply`}>
                                    <div className={`text-center ${currentMission.rewardColor.replace('bg-', 'text-')} font-black uppercase tracking-widest`}>
                                        <Award className="w-12 h-12 mx-auto mb-1" />
                                        PASSED
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-6 border-b border-dashed border-gray-300 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-800">{currentMission.title}</h2>
                            {currentMission.description && <p className="text-sm text-gray-500 mt-1">{currentMission.description}</p>}
                            
                            {/* Progress Bar */}
                            <div className="mt-4">
                                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                                    <span>ความคืบหน้า</span>
                                    <span>{stats.progress} / {stats.total}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                    <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(stats.progress / stats.total) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Grid of Slots */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
                            {stats.reqStatus.map((item, idx) => (
                                <div 
                                    key={item.id} 
                                    className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all relative overflow-hidden ${item.achieved ? 'bg-white border-green-500 shadow-md' : 'bg-gray-50 border-dashed border-gray-300 opacity-80'}`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${item.achieved ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                                        {item.type === 'total_count' ? <Target /> : item.type === 'category_count' ? <LayoutGrid /> : <CheckCircle />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-sm font-bold ${item.achieved ? 'text-gray-900' : 'text-gray-500'}`}>{item.label}</h4>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {item.type === 'specific_activity' ? (item.achieved ? 'เรียบร้อย' : 'ยังไม่ทำ') : `${item.currentVal} / ${item.targetValue}`}
                                        </p>
                                    </div>
                                    {item.achieved && (
                                        <div className="absolute -right-2 -bottom-2 text-green-100 opacity-20 transform -rotate-12">
                                            <Award className="w-16 h-16" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Footer Reward */}
                        <div className="mt-auto p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">REWARD</div>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${stats.isComplete ? currentMission.rewardColor + ' text-white shadow-md' : 'bg-gray-200 text-gray-400'}`}>
                                {stats.isComplete ? <Star className="w-4 h-4 fill-current"/> : <Lock className="w-4 h-4"/>}
                                <span className="text-sm font-bold">{currentMission.rewardLabel}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400">เลือกวันที่เพื่อดูภารกิจ</div>
                )}
            </div>
        </div>
    );
};

export default PassportView;
