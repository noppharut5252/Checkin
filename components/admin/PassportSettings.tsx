
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppData, PassportConfig, PassportMission, PassportRequirement, CheckInLog, User, RedemptionLog } from '../../types';
import { Save, Plus, Trash2, Calendar, Target, Award, ListPlus, Loader2, CheckCircle, X, AlertTriangle, ArrowUp, ArrowDown, Upload, Image as ImageIcon, Copy, BarChart3, Download, Search, School as SchoolIcon, Clock, Check, Gift, ScanLine, Eye, EyeOff, LayoutList, Split, TrendingUp, PieChart, Volume2, RefreshCcw, Timer, ShieldAlert, Wifi, WifiOff } from 'lucide-react';
import { savePassportConfig, uploadImage, getCheckInLogs, getAllUsers, redeemReward, getRedemptions, getUserCheckInHistory } from '../../services/api';
import { resizeImage } from '../../services/utils';
import SearchableSelect from '../SearchableSelect';
import QRScannerModal from '../QRScannerModal';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';

interface PassportSettingsProps {
    data: AppData;
    onDataUpdate: () => void;
}

// Sound Helper
const playSound = (type: 'success' | 'error' | 'redeem') => {
    const sounds = {
        success: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Ping
        error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3', // Error buzz
        redeem: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3' // Victory
    };
    new Audio(sounds[type]).play().catch(() => {});
};

const PassportSettings: React.FC<PassportSettingsProps> = ({ data, onDataUpdate }) => {
    const [config, setConfig] = useState<PassportConfig>(data.passportConfig || { missions: [] });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    // Stats & Data State
    const [allLogs, setAllLogs] = useState<CheckInLog[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allRedemptions, setAllRedemptions] = useState<RedemptionLog[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isLoadingDashboard, setIsLoadingDashboard] = useState(false); 
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
    const [isSyncing, setIsSyncing] = useState(false);
    
    // UI State
    const [viewingStatsFor, setViewingStatsFor] = useState<PassportMission | null>(null);
    const [showDashboard, setShowDashboard] = useState(false); 
    const [searchQuery, setSearchQuery] = useState('');
    const [savingRedemption, setSavingRedemption] = useState<string | null>(null); 
    
    // Scanner State
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isContinuousMode, setIsContinuousMode] = useState(false);
    const [verifyResult, setVerifyResult] = useState<{
        status: 'valid' | 'invalid' | 'redeemed' | 'not_completed' | 'out_of_stock' | 'expired' | 'verifying';
        user?: User;
        mission?: PassportMission;
        redemption?: RedemptionLog;
        message?: string;
        debugInfo?: string;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-hide alert
    useEffect(() => {
        if (alertMessage) {
            const timer = setTimeout(() => setAlertMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [alertMessage]);

    // Initial Data Load
    useEffect(() => {
        loadData();
        
        // Background Polling every 30 seconds to keep data fresh without blocking UI
        const interval = setInterval(() => {
            syncDataBackground();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        setIsLoadingStats(true);
        await syncDataBackground();
        setIsLoadingStats(false);
        setIsDataLoaded(true);
    };

    const syncDataBackground = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            const [logsRes, usersRes, redemptionsRes] = await Promise.all([
                getCheckInLogs(),
                getAllUsers(),
                getRedemptions()
            ]);
            // Merge strategy: Replace completely to ensure latest state
            // In a real app, you might want more complex merging to avoid overwriting local optimistic updates
            // But for this simple case, replacement works if we assume admin is the single source of truth for redemptions
            setAllLogs(logsRes || []);
            setAllUsers(usersRes || []);
            setAllRedemptions(redemptionsRes || []);
            setLastSyncTime(new Date());
        } catch (e) {
            console.error("Background sync failed", e);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleOpenDashboard = async () => {
        if (!isDataLoaded) await loadData();
        setShowDashboard(true);
    };

    // --- Logic: Check Mission Completion ---
    const checkUserCompletion = (userId: string, mission: PassportMission, logsOverride?: CheckInLog[]) => {
        const sourceLogs = logsOverride || allLogs;
        const userLogs = sourceLogs.filter(l => l.UserID === userId);
        
        // Fix Timezone Issue: Compare Date parts only using local time
        const targetLogs = mission.dateScope === 'all_time' ? userLogs : userLogs.filter(l => {
            const logDate = new Date(l.Timestamp);
            const localLogDate = logDate.toLocaleDateString('en-CA'); 
            return localLogDate === mission.date;
        });

        const logic = mission.conditionLogic || 'AND';
        
        const results = mission.requirements.map(req => {
            if (req.type === 'specific_activity') return targetLogs.some(l => String(l.ActivityID) === String(req.targetId));
            else if (req.type === 'total_count') return targetLogs.length >= req.targetValue;
            else if (req.type === 'category_count') {
                const catLogs = targetLogs.filter(l => {
                    const act = data.activities.find(a => String(a.id) === String(l.ActivityID));
                    return act?.category === req.targetId;
                });
                return catLogs.length >= req.targetValue;
            }
            return false;
        });
        if (logic === 'OR') return results.some(r => r === true);
        else return results.every(r => r === true);
    };

    const getCompletedUsers = (mission: PassportMission) => {
        if (allLogs.length === 0 || mission.requirements.length === 0) return [];
        const logsByUser: Record<string, CheckInLog[]> = {};
        allLogs.forEach(log => { if (!logsByUser[log.UserID]) logsByUser[log.UserID] = []; logsByUser[log.UserID].push(log); });
        const completedUsers: { user: User | undefined, userId: string, timestamp: string }[] = [];
        const logic = mission.conditionLogic || 'AND';
        Object.keys(logsByUser).forEach(userId => {
            const userLogs = logsByUser[userId];
            const targetLogs = mission.dateScope === 'all_time' ? userLogs : userLogs.filter(l => new Date(l.Timestamp).toLocaleDateString('en-CA') === mission.date);
            let lastReqTimestamp = 0;
            let satisfiedCount = 0;
            mission.requirements.forEach(req => {
                let satisfied = false; let reqTime = 0;
                if (req.type === 'specific_activity') {
                    const match = targetLogs.find(l => String(l.ActivityID) === String(req.targetId));
                    if (match) { satisfied = true; reqTime = new Date(match.Timestamp).getTime(); }
                } else if (req.type === 'total_count') {
                    if (targetLogs.length >= req.targetValue) {
                        satisfied = true;
                        const sorted = targetLogs.sort((a,b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
                        const targetLog = sorted[req.targetValue - 1]; if (targetLog) reqTime = new Date(targetLog.Timestamp).getTime();
                    }
                } else if (req.type === 'category_count') {
                    const catLogs = targetLogs.filter(l => { const act = data.activities.find(a => String(a.id) === String(l.ActivityID)); return act?.category === req.targetId; });
                    if (catLogs.length >= req.targetValue) {
                        satisfied = true;
                        const sorted = catLogs.sort((a,b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
                        const targetLog = sorted[req.targetValue - 1]; if (targetLog) reqTime = new Date(targetLog.Timestamp).getTime();
                    }
                }
                if (satisfied) { satisfiedCount++; if (reqTime > lastReqTimestamp) lastReqTimestamp = reqTime; }
            });
            const isComplete = logic === 'OR' ? satisfiedCount > 0 : satisfiedCount === mission.requirements.length;
            if (isComplete) {
                const userInfo = allUsers.find(u => u.UserID === userId);
                completedUsers.push({ userId, user: userInfo, timestamp: new Date(lastReqTimestamp).toISOString() });
            }
        });
        return completedUsers.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    const dashboardStats = useMemo(() => {
        if (!isDataLoaded) return null;
        const totalRedemptions = allRedemptions.length;
        const today = new Date().toISOString().split('T')[0];
        const todayRedemptions = allRedemptions.filter(r => r.Timestamp.startsWith(today)).length;
        const missionStats = config.missions.map(m => {
            const count = allRedemptions.filter(r => r.MissionID === m.id).length;
            return { name: m.title, count: count, color: m.rewardColor };
        }).sort((a, b) => b.count - a.count);
        return { totalRedemptions, todayRedemptions, missionStats };
    }, [allRedemptions, config.missions, isDataLoaded]);

    // --- Actions ---

    // Optimized Scan Handler: Use LOCAL data first for instant feedback
    const handleScanResult = async (code: string) => {
        setIsScannerOpen(false);
        // setVerifyResult({ status: 'verifying', message: 'กำลังตรวจสอบ...' }); // Skip this state for speed

        // Format: REDEEM|UserID|MissionID|Timestamp
        const parts = code.split('|');
        
        if (parts[0] !== 'REDEEM' || parts.length < 4) { 
            playSound('error');
            setVerifyResult({ status: 'invalid', message: 'QR Code ไม่ถูกต้อง (รูปแบบผิด)' });
            return;
        }

        const [_, userId, missionId, timestamp] = parts;
        
        // 1. Check Expiration
        const qrTime = parseInt(timestamp);
        const now = Date.now();
        if (now - qrTime > 10 * 60 * 1000) { // 10 minutes tolerance
            playSound('error');
            setVerifyResult({ status: 'expired', message: 'QR Code หมดอายุ โปรดให้นักเรียนรีเฟรชหน้าจอ' });
            return;
        }

        const mission = config.missions.find(m => m.id === missionId);
        if (!mission) {
            playSound('error');
            setVerifyResult({ status: 'invalid', message: 'ไม่พบภารกิจนี้ในระบบ' });
            return;
        }

        // 2. Local User Lookup (Fastest)
        let currentUser = allUsers.find(u => u.UserID === userId);
        if (!currentUser) {
            // Fallback: Create placeholder user to allow scanning to proceed if log exists
            // Or rely on background sync to have fetched it.
            // If strictly local, we might miss new users, but speed is key.
            currentUser = { UserID: userId, Name: 'Unknown User (' + userId.substring(0,4) + ')', Role: 'User' } as User;
        }

        // 3. Local Validation Checks
        
        // Check Inventory
        if (mission.maxRedemptions && mission.maxRedemptions > 0) {
            const currentRedeemed = allRedemptions.filter(r => r.MissionID === missionId).length;
            if (currentRedeemed >= mission.maxRedemptions) {
                playSound('error');
                setVerifyResult({ status: 'out_of_stock', user: currentUser, mission, message: 'ของรางวัลหมดแล้ว (Out of Stock)' });
                return;
            }
        }

        // Check Already Redeemed (Local Memory)
        const existingRedemption = allRedemptions.find(r => r.UserID === userId && r.MissionID === missionId);
        if (existingRedemption) {
            playSound('error'); 
            setVerifyResult({ status: 'redeemed', user: currentUser, mission, redemption: existingRedemption });
            return;
        }

        // Check Completion (Local Memory)
        const isComplete = checkUserCompletion(userId, mission);
        if (!isComplete) {
            playSound('error');
            setVerifyResult({ 
                status: 'not_completed', 
                user: currentUser, 
                mission, 
                message: 'ระบบตรวจสอบไม่พบประวัติการทำภารกิจครบตามเงื่อนไข (ลองกด Refresh ข้อมูล)'
            });
            return;
        }

        // Valid
        playSound('success');
        setVerifyResult({ status: 'valid', user: currentUser, mission });
    };

    const confirmRedemptionFromScan = async () => {
        if (!verifyResult || !verifyResult.user || !verifyResult.mission) return;
        
        const { user, mission } = verifyResult;
        
        // --- Optimistic UI Update ---
        // 1. Update Local State Immediately
        const newLog = { UserID: user.UserID, MissionID: mission.id, Timestamp: new Date().toISOString() };
        setAllRedemptions(prev => [...prev, newLog]);
        
        // 2. Feedback
        playSound('redeem');
        
        // 3. Handle UI Flow
        if (isContinuousMode) {
            setVerifyResult(null); // Close modal
            setAlertMessage({ type: 'success', text: `แจกรางวัลให้ ${user.Name} แล้ว!` });
            // Re-open scanner quickly
            setTimeout(() => setIsScannerOpen(true), 300);
        } else {
            setVerifyResult({ ...verifyResult, status: 'redeemed', redemption: newLog });
            setAlertMessage({ type: 'success', text: 'บันทึกการแจกรางวัลสำเร็จ' });
        }

        // 4. Background Server Sync
        // We don't await this to keep UI responsive
        redeemReward(user.UserID, mission.id).then(res => {
            if (res.status !== 'success') {
                // Rollback if failed (Unlikely but possible)
                console.error("Redemption failed on server", res);
                setAllRedemptions(prev => prev.filter(r => r !== newLog));
                alert(`การบันทึกข้อมูลล้มเหลวสำหรับ ${user.Name}: ${res.message}`);
            }
        }).catch(e => {
            console.error("Redemption network error", e);
            // Optional: Add to retry queue
        });
    };

    // Force Redeem Handler
    const handleForceRedeem = async () => {
        if(!confirm('ยืนยันการแจกรางวัลกรณีพิเศษ? (Force Redeem)')) return;
        if(verifyResult) {
            setVerifyResult({...verifyResult, status: 'valid'});
            setTimeout(() => confirmRedemptionFromScan(), 100);
        }
    };

    // ... (Keep existing CRUD handlers: handleSave, handleRedeem, addMission, etc.) ...
    const handleSave = async () => { setIsSaving(true); try { await savePassportConfig(config); setAlertMessage({ type: 'success', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' }); onDataUpdate(); } catch (e) { setAlertMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก' }); } finally { setIsSaving(false); } };
    const handleRedeem = async (userId: string, missionId: string) => { if (!confirm('ยืนยันว่าผู้ใช้นี้ได้รับรางวัลแล้ว?')) return; setSavingRedemption(userId); try { const res = await redeemReward(userId, missionId); if (res.status === 'success') { setAllRedemptions(prev => [...prev, { UserID: userId, MissionID: missionId, Timestamp: new Date().toISOString() }]); } else { alert('บันทึกไม่สำเร็จ: ' + res.message); } } catch (e) { alert('เกิดข้อผิดพลาดในการเชื่อมต่อ'); } finally { setSavingRedemption(null); } };
    const addMission = () => { const newMission: PassportMission = { id: `m-${Date.now()}`, date: new Date().toISOString().split('T')[0], title: 'ภารกิจใหม่', requirements: [], rewardColor: '#F59E0B', rewardLabel: 'Completed', dateScope: 'specific_date', isVisible: true, conditionLogic: 'AND', maxRedemptions: 0 }; setConfig(prev => ({ missions: [...prev.missions, newMission] })); setActiveMissionId(newMission.id); };
    const updateMission = (id: string, field: keyof PassportMission, value: any) => { setConfig(prev => ({ missions: prev.missions.map(m => m.id === id ? { ...m, [field]: value } : m) })); };
    const duplicateMission = (mission: PassportMission) => { const newMission: PassportMission = { ...mission, id: `m-${Date.now()}`, title: `${mission.title} (Copy)`, requirements: mission.requirements.map(r => ({ ...r, id: `r-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` })) }; setConfig(prev => ({ missions: [...prev.missions, newMission] })); setActiveMissionId(newMission.id); setAlertMessage({ type: 'success', text: 'คัดลอกภารกิจแล้ว' }); };
    const deleteMission = (id: string) => { if(!confirm('ยืนยันการลบภารกิจนี้?')) return; setConfig(prev => ({ missions: prev.missions.filter(m => m.id !== id) })); if (activeMissionId === id) setActiveMissionId(null); };
    const moveMission = (index: number, direction: 'up' | 'down') => { const newMissions = [...config.missions]; if (direction === 'up' && index > 0) [newMissions[index], newMissions[index - 1]] = [newMissions[index - 1], newMissions[index]]; else if (direction === 'down' && index < newMissions.length - 1) [newMissions[index], newMissions[index + 1]] = [newMissions[index + 1], newMissions[index]]; setConfig(prev => ({ ...prev, missions: newMissions })); };
    const addRequirement = (missionId: string) => { const newReq: PassportRequirement = { id: `r-${Date.now()}`, type: 'specific_activity', label: 'เข้าร่วมกิจกรรม...', targetValue: 1 }; setConfig(prev => ({ missions: prev.missions.map(m => m.id === missionId ? { ...m, requirements: [...m.requirements, newReq] } : m) })); };
    const updateRequirement = (missionId: string, reqId: string, field: keyof PassportRequirement, value: any) => { setConfig(prev => ({ missions: prev.missions.map(m => { if (m.id !== missionId) return m; return { ...m, requirements: m.requirements.map(r => r.id === reqId ? { ...r, [field]: value } : r) }; }) })); };
    const removeRequirement = (missionId: string, reqId: string) => { setConfig(prev => ({ missions: prev.missions.map(m => { if (m.id !== missionId) return m; return { ...m, requirements: m.requirements.filter(r => r.id !== reqId) }; }) })); };
    const moveRequirement = (missionId: string, index: number, direction: 'up' | 'down') => { setConfig(prev => ({ missions: prev.missions.map(m => { if (m.id !== missionId) return m; const newReqs = [...m.requirements]; if (direction === 'up' && index > 0) [newReqs[index], newReqs[index - 1]] = [newReqs[index - 1], newReqs[index]]; else if (direction === 'down' && index < newReqs.length - 1) [newReqs[index], newReqs[index + 1]] = [newReqs[index + 1], newReqs[index]]; return { ...m, requirements: newReqs }; }) })); };
    const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || !activeMissionId) return; setIsUploading(true); try { const base64 = await resizeImage(file, 300, 300, 0.9, 'image/png'); const res = await uploadImage(base64, `stamp_${Date.now()}.png`); if (res.status === 'success' && res.fileUrl) updateMission(activeMissionId, 'stampImage', res.fileUrl); else alert('Upload failed'); } catch (err) { console.error(err); alert('Error uploading stamp'); } finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; } };
    const removeStampImage = (missionId: string) => updateMission(missionId, 'stampImage', '');
    const downloadStatsCSV = (userList: any[], missionTitle: string) => { const headers = ['UserID', 'Name', 'School', 'CompletedTime', 'Reward', 'RedeemedStatus', 'RedeemedTime']; const rows = userList.map(u => { const redemption = allRedemptions.find(r => r.UserID === u.userId && r.MissionID === viewingStatsFor?.id); return [ u.userId, `"${u.user?.Name || u.userId}"`, `"${u.user?.SchoolID || '-'}"`, `"${new Date(u.timestamp).toLocaleString('th-TH')}"`, `"${viewingStatsFor?.rewardLabel}"`, redemption ? 'Received' : 'Pending', redemption ? `"${new Date(redemption.Timestamp).toLocaleString('th-TH')}"` : '' ]; }); const csvContent = "\uFEFF" + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n'); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `completed_users_${missionTitle.substring(0,10)}_${Date.now()}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
    const activityOptions = data.activities.map(a => ({ label: a.name, value: a.id }));
    const categoryOptions = Array.from(new Set(data.activities.map(a => a.category))).map(c => ({ label: c, value: c }));
    const activeMission = config.missions.find(m => m.id === activeMissionId);

    // --- Components: Verification Modal (Updated) ---
    const VerificationModal = () => {
        if (!verifyResult) return null;
        
        const { status, user, mission, redemption, message } = verifyResult;
        let color = 'blue';
        let Icon = AlertTriangle;
        let title = 'ตรวจสอบ';

        if (status === 'verifying') { color = 'blue'; Icon = Loader2; title = 'กำลังตรวจสอบ...'; }
        else if (status === 'valid') { color = 'green'; Icon = CheckCircle; title = 'พร้อมแจกรางวัล'; }
        else if (status === 'redeemed') { color = 'blue'; Icon = Check; title = 'รับไปแล้ว'; }
        else if (status === 'out_of_stock') { color = 'purple'; Icon = X; title = 'ของรางวัลหมด'; }
        else if (status === 'expired') { color = 'orange'; Icon = Timer; title = 'QR Code หมดอายุ'; }
        else { color = 'red'; Icon = AlertTriangle; title = 'ไม่สามารถแจกได้'; }

        return (
            <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in zoom-in-95">
                    {status !== 'verifying' && (
                        <button onClick={() => setVerifyResult(null)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"><X className="w-5 h-5 text-gray-500" /></button>
                    )}
                    
                    <div className={`p-6 text-center text-white bg-${color}-600`}>
                        <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm shadow-inner">
                            <Icon className={`w-10 h-10 text-white ${status === 'verifying' ? 'animate-spin' : ''}`} />
                        </div>
                        <h2 className="text-2xl font-bold">{title}</h2>
                        {message && <p className="text-white/80 text-sm mt-1">{message}</p>}
                    </div>

                    <div className="p-6 space-y-4">
                        {status === 'verifying' && (
                            <div className="text-center text-gray-500 py-4">
                                กำลังตรวจสอบข้อมูล...
                            </div>
                        )}

                        {user && status !== 'verifying' && (
                            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <img src={user.PictureUrl || `https://ui-avatars.com/api/?name=${user.Name}`} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                <div>
                                    <div className="font-bold text-gray-900">{user.Name || 'Unknown User'}</div>
                                    <div className="text-xs text-gray-500">{user.SchoolID || user.userid}</div>
                                </div>
                            </div>
                        )}

                        {mission && status !== 'verifying' && (
                            <div className="text-center border-t border-dashed border-gray-200 pt-4">
                                <div className="text-xs text-gray-400 uppercase font-bold mb-1">Reward Item</div>
                                <div className="text-lg font-black text-gray-800" style={{ color: mission.rewardColor }}>{mission.rewardLabel}</div>
                                <div className="text-sm text-gray-500">{mission.title}</div>
                            </div>
                        )}

                        {status === 'redeemed' && redemption && (
                            <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded-lg text-center">
                                รับไปเมื่อ: {new Date(redemption.Timestamp).toLocaleString('th-TH')}
                            </div>
                        )}

                        {status === 'valid' && (
                            <>
                                <button 
                                    onClick={confirmRedemptionFromScan}
                                    // disabled={!!savingRedemption} // Optimistic UI: Don't disable, just fire
                                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center"
                                >
                                    {/* {savingRedemption ? <Loader2 className="w-5 h-5 animate-spin"/> : <Gift className="w-5 h-5 mr-2"/>} */}
                                    <Gift className="w-5 h-5 mr-2"/>
                                    ยืนยันการแจกรางวัล
                                </button>
                                
                                {/* Continuous Mode Toggle */}
                                <label className="flex items-center justify-center gap-2 cursor-pointer mt-2 text-sm text-gray-600">
                                    <input 
                                        type="checkbox" 
                                        checked={isContinuousMode}
                                        onChange={(e) => setIsContinuousMode(e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>สแกนคนต่อไปอัตโนมัติ (Auto-Next)</span>
                                </label>
                            </>
                        )}
                        
                        {/* Force Redeem for Errors */}
                        {(status === 'not_completed' || status === 'invalid') && (
                            <div className="space-y-3">
                                <button 
                                    onClick={handleForceRedeem}
                                    className="w-full py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl font-bold transition-colors flex items-center justify-center border border-orange-200"
                                >
                                    <ShieldAlert className="w-4 h-4 mr-2" /> อนุมัติกรณีพิเศษ (Force)
                                </button>
                                <button 
                                    onClick={() => { setVerifyResult(null); setIsScannerOpen(true); }}
                                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors flex items-center justify-center"
                                >
                                    <ScanLine className="w-4 h-4 mr-2" /> สแกนใหม่
                                </button>
                            </div>
                        )}
                        
                        {/* Other Errors */}
                        {(status === 'expired' || status === 'out_of_stock') && (
                            <button 
                                onClick={() => { setVerifyResult(null); setIsScannerOpen(true); }}
                                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors flex items-center justify-center"
                            >
                                <ScanLine className="w-4 h-4 mr-2" /> สแกนใหม่
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ... (Keep existing renderStatsModal, renderDashboardModal) ...
    // --- Render Stats Modal (Updated with Responsive List) ---
    const renderStatsModal = () => {
        if (!viewingStatsFor) return null;
        
        const completedUsers = getCompletedUsers(viewingStatsFor);
        const themeColor = viewingStatsFor.rewardColor || '#F59E0B';
        const filteredUsers = completedUsers.filter(u => {
            const term = searchQuery.toLowerCase();
            return (
                (u.user?.Name || '').toLowerCase().includes(term) ||
                (u.user?.Surname || '').toLowerCase().includes(term) ||
                (u.userId || '').toLowerCase().includes(term) ||
                (u.user?.SchoolID || '').toLowerCase().includes(term)
            );
        });

        return (
            <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-4xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-white shrink-0" style={{ backgroundColor: themeColor }}>
                        <div>
                            <h3 className="font-bold text-lg flex items-center">
                                <Award className="w-5 h-5 mr-2 text-white/80"/>
                                รายชื่อผู้มีสิทธิ์รับรางวัล ({completedUsers.length})
                            </h3>
                            <p className="text-xs text-white/80 mt-1 font-medium bg-black/10 inline-block px-2 py-0.5 rounded">
                                {viewingStatsFor.title} • {viewingStatsFor.rewardLabel}
                            </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input 
                                    type="text" 
                                    className="w-full pl-9 pr-3 py-2 bg-white/90 border-0 rounded-lg text-sm text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-white/50"
                                    placeholder="ค้นหาชื่อ, รหัส, โรงเรียน..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={() => downloadStatsCSV(completedUsers, viewingStatsFor.title)}
                                className="px-3 py-2 bg-white/20 text-white rounded-lg text-xs font-bold hover:bg-white/30 flex items-center backdrop-blur-sm shrink-0"
                            >
                                <Download className="w-4 h-4 mr-1"/> CSV
                            </button>
                            <button onClick={() => { setViewingStatsFor(null); setSearchQuery(''); }} className="p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors shrink-0">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-0 bg-gray-50">
                        {/* Mobile View (Cards) */}
                        <div className="block md:hidden p-3 space-y-3">
                            {filteredUsers.map((u, idx) => {
                                const redemption = allRedemptions.find(r => r.UserID === u.userId && r.MissionID === viewingStatsFor.id);
                                const displayName = u.user ? `${u.user.Name || ''} ${u.user.Surname || ''}`.trim() : u.userId;
                                return (
                                    <div key={idx} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-100">
                                                <img src={u.user?.PictureUrl || `https://ui-avatars.com/api/?name=${u.user?.Name}`} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 text-sm line-clamp-1">{displayName}</div>
                                                <div className="text-xs text-gray-500 font-mono">{u.userId}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-600 grid grid-cols-2 gap-2 mt-1 bg-gray-50 p-2 rounded-lg">
                                            <div className="flex items-center truncate"><SchoolIcon className="w-3 h-3 mr-1 text-gray-400 shrink-0"/> {u.user?.SchoolID || '-'}</div>
                                            <div className="text-right flex items-center justify-end"><Clock className="w-3 h-3 mr-1 text-gray-400"/> {new Date(u.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</div>
                                        </div>
                                        <div className="pt-2 border-t border-gray-50 flex justify-center">
                                            {redemption ? (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center w-full justify-center">
                                                    <Check className="w-3 h-3 mr-1" /> รับแล้ว ({new Date(redemption.Timestamp).toLocaleTimeString('th-TH')})
                                                </span>
                                            ) : (
                                                <button 
                                                    onClick={() => handleRedeem(u.userId, viewingStatsFor.id)}
                                                    disabled={savingRedemption === u.userId}
                                                    className="w-full px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 flex items-center justify-center shadow-sm disabled:opacity-50 active:scale-95 transition-transform"
                                                >
                                                    {savingRedemption === u.userId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3 mr-1" />}
                                                    กดรับของ
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredUsers.length === 0 && <div className="text-center py-10 text-gray-400">ไม่พบรายชื่อ</div>}
                        </div>

                        {/* Desktop View (Table) */}
                        <table className="hidden md:table min-w-full divide-y divide-gray-200 bg-white">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ-นามสกุล</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">โรงเรียน / สังกัด</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">เวลาที่สำเร็จ</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะการรับของ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.map((u, idx) => {
                                    const redemption = allRedemptions.find(r => r.UserID === u.userId && r.MissionID === viewingStatsFor.id);
                                    const displayName = u.user ? `${u.user.Name || ''} ${u.user.Surname || ''}`.trim() : u.userId;
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-100">
                                                        <img src={u.user?.PictureUrl || `https://ui-avatars.com/api/?name=${u.user?.Name}`} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{displayName}</div>
                                                        <div className="text-xs text-gray-500">ID: {u.userId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 flex items-center mb-1">
                                                    <SchoolIcon className="w-3 h-3 mr-1 text-gray-400"/>
                                                    {u.user?.SchoolID || '-'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {u.user?.Role || 'User'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="text-sm text-gray-500 flex items-center justify-end">
                                                    {new Date(u.timestamp).toLocaleTimeString('th-TH')}
                                                    <Clock className="w-3 h-3 ml-1 text-gray-300"/>
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {new Date(u.timestamp).toLocaleDateString('th-TH')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {redemption ? (
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center mb-1">
                                                            <Check className="w-3 h-3 mr-1" /> รับแล้ว
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">
                                                            {new Date(redemption.Timestamp).toLocaleString('th-TH')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleRedeem(u.userId, viewingStatsFor.id)}
                                                        disabled={savingRedemption === u.userId}
                                                        className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 flex items-center justify-center mx-auto shadow-sm disabled:opacity-50"
                                                    >
                                                        {savingRedemption === u.userId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3 mr-1" />}
                                                        กดรับของ
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                                            {searchQuery ? 'ไม่พบรายชื่อที่ค้นหา' : 'ยังไม่มีผู้ทำภารกิจสำเร็จ'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderDashboardModal = () => {
        if (!showDashboard || !dashboardStats) return null;

        return (
            <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-5xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-gray-100 flex justify-between items-center text-white shrink-0">
                        <div>
                            <h3 className="font-bold text-xl flex items-center">
                                <BarChart3 className="w-6 h-6 mr-3"/>
                                Redemption Overview
                            </h3>
                            <p className="text-sm opacity-80 mt-1">ภาพรวมการแจกรางวัลทั้งหมด</p>
                        </div>
                        <button onClick={() => setShowDashboard(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
                            <X className="w-6 h-6"/>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                                <div className="p-4 bg-blue-100 text-blue-600 rounded-full mr-4">
                                    <Gift className="w-8 h-8"/>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-sm font-bold uppercase">รางวัลที่แจกไปแล้วทั้งหมด</p>
                                    <h2 className="text-4xl font-black text-gray-800">{dashboardStats.totalRedemptions.toLocaleString()}</h2>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                                <div className="p-4 bg-green-100 text-green-600 rounded-full mr-4">
                                    <TrendingUp className="w-8 h-8"/>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-sm font-bold uppercase">แจกวันนี้</p>
                                    <h2 className="text-4xl font-black text-gray-800">{dashboardStats.todayRedemptions.toLocaleString()}</h2>
                                </div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-6 flex items-center">
                                <PieChart className="w-5 h-5 mr-2 text-indigo-500"/>
                                สถิติแยกตามภารกิจ
                            </h4>
                            <div className="h-[300px] w-full mb-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dashboardStats.missionStats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={20}>
                                            {dashboardStats.missionStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color || '#4F46E5'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            
                            {/* Table Breakdown */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                                        <tr>
                                            <th className="px-4 py-3 text-left">ภารกิจ</th>
                                            <th className="px-4 py-3 text-right">จำนวนที่แจก</th>
                                            <th className="px-4 py-3 text-right">สัดส่วน</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {dashboardStats.missionStats.map((stat, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-3 font-medium text-gray-700">{stat.name}</td>
                                                <td className="px-4 py-3 text-right font-bold">{stat.count}</td>
                                                <td className="px-4 py-3 text-right text-gray-500">
                                                    {dashboardStats.totalRedemptions > 0 ? ((stat.count / dashboardStats.totalRedemptions) * 100).toFixed(1) : 0}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 relative">
            
            {/* Toast Notification */}
            {alertMessage && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[300] px-6 py-3 rounded-full shadow-xl flex items-center animate-in slide-in-from-top-5 fade-in duration-300 ${alertMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {alertMessage.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertTriangle className="w-5 h-5 mr-2" />}
                    <span className="font-bold text-sm">{alertMessage.text}</span>
                    <button onClick={() => setAlertMessage(null)} className="ml-4 opacity-80 hover:opacity-100"><X className="w-4 h-4"/></button>
                </div>
            )}

            {/* Modals */}
            {renderStatsModal()}
            {renderDashboardModal()}
            <QRScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScanResult} />
            <VerificationModal />

            {/* Top Action Bar */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Award className="w-6 h-6 mr-2 text-indigo-600"/> ตั้งค่า Passport ภารกิจ
                    </h2>
                    <p className="text-gray-500 text-sm">กำหนดเงื่อนไขการผ่านด่านและการรับตราประทับในแต่ละวัน</p>
                    
                    {/* Sync Indicator */}
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></span>
                        <span className="text-xs text-gray-400">
                            {isSyncing ? 'Syncing...' : `Last synced: ${lastSyncTime.toLocaleTimeString()}`}
                        </span>
                        <button onClick={() => syncDataBackground()} className="p-1 hover:bg-gray-100 rounded-full" title="Sync Now">
                            <RefreshCcw className={`w-3 h-3 text-gray-400 ${isSyncing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={handleOpenDashboard} 
                        disabled={isLoadingDashboard}
                        className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg font-bold flex items-center hover:bg-blue-100 border border-blue-200 transition-all active:scale-95 disabled:opacity-70 disabled:scale-100"
                    >
                        {isLoadingDashboard ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <BarChart3 className="w-5 h-5 mr-2" />}
                        {isLoadingDashboard ? 'กำลังโหลด...' : 'ภาพรวม (Dashboard)'}
                    </button>
                    <button 
                        onClick={() => setIsScannerOpen(true)} 
                        className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-bold flex items-center hover:bg-green-700 shadow-md transition-all active:scale-95"
                    >
                        <ScanLine className="w-5 h-5 mr-2" />
                        สแกนแจกรางวัล
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold flex items-center hover:bg-indigo-700 disabled:opacity-70 shadow-sm transition-all active:scale-95"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                        บันทึกทั้งหมด
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Mission List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">รายการภารกิจ</h3>
                        <button onClick={addMission} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[600px] p-2 space-y-2">
                        {config.missions.map((m, idx) => {
                            // Don't calculate on every render for list, use loading indicator if data isn't ready
                            let statsCount = 0;
                            if (isDataLoaded) {
                                const completedList = getCompletedUsers(m);
                                statsCount = completedList.length;
                            }
                            
                            return (
                                <div 
                                    key={m.id}
                                    onClick={() => setActiveMissionId(m.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex gap-2 ${activeMissionId === m.id ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'} ${m.isVisible === false ? 'opacity-70 grayscale-[0.5]' : ''}`}
                                >
                                    <div className="flex flex-col gap-1 justify-center">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); moveMission(idx, 'up'); }}
                                            disabled={idx === 0}
                                            className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30 hover:bg-gray-100 rounded"
                                        >
                                            <ArrowUp className="w-3 h-3" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); moveMission(idx, 'down'); }}
                                            disabled={idx === config.missions.length - 1}
                                            className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30 hover:bg-gray-100 rounded"
                                        >
                                            <ArrowDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div className="truncate">
                                                <div className="font-bold text-sm text-gray-800 truncate flex items-center">
                                                    {m.title}
                                                    {m.isVisible === false && <EyeOff className="w-3 h-3 ml-2 text-gray-400" />}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center mt-1">
                                                    <Calendar className="w-3 h-3 mr-1" /> {new Date(m.date).toLocaleDateString('th-TH')}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); duplicateMission(m); }}
                                                    className="text-gray-400 hover:text-blue-500 p-1"
                                                    title="Duplicate"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteMission(m.id); }}
                                                    className="text-gray-400 hover:text-red-500 p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex justify-between items-center">
                                            <div className="flex gap-1 items-center">
                                                <div className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: m.rewardColor }}></div>
                                                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                                    {m.requirements.length} เงื่อนไข
                                                </span>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setViewingStatsFor(m); }}
                                                className="text-[10px] text-green-600 font-bold flex items-center bg-green-50 px-2 py-0.5 rounded hover:bg-green-100 transition-colors"
                                            >
                                                <BarChart3 className="w-3 h-3 mr-1"/>
                                                {isLoadingStats ? <Loader2 className="w-3 h-3 animate-spin" /> : `${statsCount} สำเร็จ`}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {config.missions.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีภารกิจ</div>}
                    </div>
                </div>

                {/* Mission Editor */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    {activeMission ? (
                        <div className="space-y-6">
                            {/* Toggle Visibility & Scope */}
                            <div className="flex justify-between items-start bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center">
                                    <label className="relative inline-flex items-center cursor-pointer mr-3">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={activeMission.isVisible !== false} // Default true
                                            onChange={e => updateMission(activeMission.id, 'isVisible', e.target.checked)}
                                        />
                                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                    <span className="text-sm font-bold text-gray-700 flex items-center">
                                        {activeMission.isVisible !== false ? <Eye className="w-4 h-4 mr-1 text-indigo-600"/> : <EyeOff className="w-4 h-4 mr-1 text-gray-400"/>}
                                        {activeMission.isVisible !== false ? 'แสดงผลในหน้า User' : 'ซ่อนจาก User'}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-xs text-gray-500 mr-2">ขอบเขตเวลา:</span>
                                    <select 
                                        className="border rounded p-1 text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                                        value={activeMission.dateScope || 'specific_date'}
                                        onChange={e => updateMission(activeMission.id, 'dateScope', e.target.value)}
                                    >
                                        <option value="specific_date">เฉพาะวันที่กำหนด</option>
                                        <option value="all_time">สะสมรวมทุกวัน</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อภารกิจ</label>
                                    <input 
                                        className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        value={activeMission.title} 
                                        onChange={e => updateMission(activeMission.id, 'title', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">วันที่ (สำหรับอ้างอิง)</label>
                                    <input 
                                        type="date" 
                                        className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        value={activeMission.date} 
                                        onChange={e => updateMission(activeMission.id, 'date', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">รายละเอียด / คำอธิบาย (รองรับการขึ้นบรรทัดใหม่)</label>
                                <textarea 
                                    className="w-full border rounded p-2 text-sm h-28 resize-none focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed" 
                                    value={activeMission.description || ''} 
                                    onChange={e => updateMission(activeMission.id, 'description', e.target.value)}
                                    placeholder="เช่น ต้องเข้าร่วมกิจกรรมหลัก...&#10;1. กิจกรรม A&#10;2. กิจกรรม B"
                                />
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-bold text-gray-800 flex items-center">
                                            <ListPlus className="w-5 h-5 mr-2 text-blue-600" /> เงื่อนไขการผ่าน
                                        </h4>
                                        <select 
                                            className="text-xs border rounded p-1 bg-blue-50 text-blue-800 font-bold"
                                            value={activeMission.conditionLogic || 'AND'}
                                            onChange={e => updateMission(activeMission.id, 'conditionLogic', e.target.value)}
                                        >
                                            <option value="AND">ต้องครบทุกข้อ (AND)</option>
                                            <option value="OR">ทำข้อใดข้อหนึ่ง (OR)</option>
                                        </select>
                                    </div>
                                    <button onClick={() => addRequirement(activeMission.id)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100">
                                        + เพิ่มเงื่อนไข
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {activeMission.requirements.map((req, idx) => (
                                        <div key={req.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col gap-2 relative">
                                            {/* OR Logic Indicator */}
                                            {idx > 0 && activeMission.conditionLogic === 'OR' && (
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-100 text-blue-600 text-[10px] font-bold px-2 rounded-full border border-blue-200 z-10">
                                                    OR
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-2 mb-1">
                                                {/* Reorder Buttons */}
                                                <div className="flex flex-col">
                                                    <button 
                                                        onClick={() => moveRequirement(activeMission.id, idx, 'up')}
                                                        disabled={idx === 0}
                                                        className="text-gray-400 hover:text-blue-600 disabled:opacity-30"
                                                    >
                                                        <ArrowUp className="w-3 h-3" />
                                                    </button>
                                                    <button 
                                                        onClick={() => moveRequirement(activeMission.id, idx, 'down')}
                                                        disabled={idx === activeMission.requirements.length - 1}
                                                        className="text-gray-400 hover:text-blue-600 disabled:opacity-30"
                                                    >
                                                        <ArrowDown className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="bg-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-500 border shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 font-bold text-sm text-gray-700">เงื่อนไขที่ {idx+1}</div>
                                                <button onClick={() => removeRequirement(activeMission.id, req.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-8">
                                                <select 
                                                    className="border rounded p-1.5 text-sm bg-white"
                                                    value={req.type}
                                                    onChange={e => updateRequirement(activeMission.id, req.id, 'type', e.target.value)}
                                                >
                                                    <option value="specific_activity">กิจกรรมบังคับ (Specific Activity)</option>
                                                    <option value="total_count">จำนวนเช็คอินรวม (Total Check-ins)</option>
                                                    <option value="category_count">จำนวนตามหมวด (Category Count)</option>
                                                </select>

                                                {req.type === 'specific_activity' && (
                                                    <SearchableSelect 
                                                        options={activityOptions}
                                                        value={req.targetId || ''}
                                                        onChange={val => updateRequirement(activeMission.id, req.id, 'targetId', val)}
                                                        placeholder="เลือกกิจกรรม..."
                                                        className="md:col-span-2"
                                                    />
                                                )}

                                                {req.type === 'category_count' && (
                                                    <SearchableSelect 
                                                        options={categoryOptions}
                                                        value={req.targetId || ''}
                                                        onChange={val => updateRequirement(activeMission.id, req.id, 'targetId', val)}
                                                        placeholder="เลือกหมวดหมู่..."
                                                    />
                                                )}

                                                {(req.type === 'total_count' || req.type === 'category_count') && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs whitespace-nowrap">จำนวน:</span>
                                                        <input 
                                                            type="number" min="1"
                                                            className="border rounded p-1.5 text-sm w-full"
                                                            value={req.targetValue}
                                                            onChange={e => updateRequirement(activeMission.id, req.id, 'targetValue', parseInt(e.target.value))}
                                                        />
                                                    </div>
                                                )}
                                                
                                                <input 
                                                    className="border rounded p-1.5 text-sm md:col-span-3"
                                                    placeholder="ข้อความที่แสดงให้ผู้ใช้เห็น (เช่น 'เข้าฐานวิทยาศาสตร์')"
                                                    value={req.label}
                                                    onChange={e => updateRequirement(activeMission.id, req.id, 'label', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {activeMission.requirements.length === 0 && (
                                        <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                                            ยังไม่มีเงื่อนไข
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="font-bold text-gray-800 mb-2 flex items-center">
                                    <Target className="w-5 h-5 mr-2 text-green-600" /> ตราประทับและรางวัล (Stamp & Reward)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">ข้อความรางวัล</label>
                                            <input 
                                                className="w-full border rounded p-2 text-sm" 
                                                value={activeMission.rewardLabel} 
                                                onChange={e => updateMission(activeMission.id, 'rewardLabel', e.target.value)}
                                                placeholder="e.g. Gold Stamp"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">จำนวนจำกัด (Inventory)</label>
                                            <input 
                                                type="number" 
                                                className="w-full border rounded p-2 text-sm" 
                                                placeholder="0 = ไม่จำกัด"
                                                value={activeMission.maxRedemptions || ''} 
                                                onChange={e => updateMission(activeMission.id, 'maxRedemptions', parseInt(e.target.value) || 0)}
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">หากใส่เลข ระบบจะหยุดแจกเมื่อครบจำนวน</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Theme Color</label>
                                            <div className="flex items-center gap-2 border p-2 rounded-lg bg-gray-50">
                                                <input 
                                                    type="color" 
                                                    value={activeMission.rewardColor || '#F59E0B'}
                                                    onChange={e => updateMission(activeMission.id, 'rewardColor', e.target.value)}
                                                    className="w-10 h-10 border-0 p-0 rounded cursor-pointer bg-transparent"
                                                />
                                                <input 
                                                    type="text" 
                                                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs font-mono uppercase"
                                                    value={activeMission.rewardColor || '#F59E0B'}
                                                    onChange={e => updateMission(activeMission.id, 'rewardColor', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">รูปตรายาง (Custom Image)</label>
                                            <div className="flex gap-2 items-center">
                                                <button 
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className="px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 flex items-center"
                                                >
                                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <Upload className="w-4 h-4 mr-1"/>}
                                                    อัปโหลดรูป
                                                </button>
                                                {activeMission.stampImage && (
                                                    <button 
                                                        onClick={() => removeStampImage(activeMission.id)}
                                                        className="text-red-500 text-xs hover:underline"
                                                    >
                                                        ลบรูป
                                                    </button>
                                                )}
                                                <input 
                                                    type="file" 
                                                    ref={fileInputRef} 
                                                    className="hidden" 
                                                    accept="image/png" 
                                                    onChange={handleStampUpload} 
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1">แนะนำ: ไฟล์ PNG พื้นใส ขนาด 300x300 px</p>
                                        </div>
                                    </div>

                                    {/* Preview Box */}
                                    <div className="bg-gray-100 p-4 rounded-xl flex flex-col items-center justify-center border border-gray-200 border-dashed relative overflow-hidden">
                                        <span className="text-xs text-gray-400 font-bold uppercase mb-2 relative z-10">Card & Stamp Preview</span>
                                        
                                        {/* Fake Card Background */}
                                        <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundColor: activeMission.rewardColor || '#F59E0B' }}></div>
                                        
                                        <div 
                                            className="relative flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 transition-all z-10"
                                            style={{ 
                                                borderColor: activeMission.rewardColor || '#F59E0B',
                                                color: activeMission.rewardColor || '#F59E0B',
                                                transform: 'rotate(-12deg)',
                                                maskImage: `url('https://www.transparenttextures.com/patterns/rough-paper.png')`,
                                                WebkitMaskImage: `url('https://www.transparenttextures.com/patterns/rough-paper.png')`,
                                                opacity: 0.9
                                            }}
                                        >
                                            {activeMission.stampImage ? (
                                                <img 
                                                    src={activeMission.stampImage} 
                                                    className="w-20 h-20 object-contain"
                                                    style={{ 
                                                        filter: `drop-shadow(0 0 1px ${activeMission.rewardColor || '#F59E0B'})` 
                                                    }}
                                                />
                                            ) : (
                                                <>
                                                    <div className="text-[10px] font-bold uppercase tracking-widest border-b-2 border-current pb-1 mb-1">Passed</div>
                                                    <Award className="w-8 h-8 fill-current" />
                                                    <div className="text-[9px] font-bold uppercase mt-1 text-center leading-tight px-1">
                                                        {activeMission.rewardLabel || 'Completed'}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 min-h-[300px]">
                            <ListPlus className="w-16 h-16 mb-4 opacity-20" />
                            <p>เลือกภารกิจทางซ้ายเพื่อแก้ไข หรือกดปุ่ม + เพื่อสร้างใหม่</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PassportSettings;
