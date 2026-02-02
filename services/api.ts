
import { AppData, User, CheckInLocation, CheckInActivity, PassportConfig, Announcement, Venue, CertificateTemplate, School, Team } from '../types';

// Replace with your actual Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbxyS_GG5snXmt2YTcMCMMYgfQZmzTynb-esxe8N2NBAdC1uGdIGGnPh7W0PuId4r4OF/exec";

// Helper: Sleep function for delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const apiRequest = async (action: string, params: any = {}, retries = 3, backoff = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            // GAS Web App often requires text/plain to avoid CORS preflight issues with application/json
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action, ...params }),
            });
            
            const data = await response.json();

            // Handle GAS LockService Timeout specifically or generic error
            if (data.status === 'error') {
                const msg = data.message?.toLowerCase() || '';
                // If server is busy or locked, throw to trigger retry
                if (msg.includes('server busy') || msg.includes('lock') || msg.includes('timeout')) {
                    throw new Error('Server busy');
                }
                // If it's a logic error (e.g., user not found), return immediately, don't retry
                return data; 
            }

            return data;
        } catch (error) {
            // Check if it's the last retry
            if (i === retries - 1) {
                console.error(`API Error (${action}) after ${retries} attempts:`, error);
                throw error;
            }
            
            // Wait with exponential backoff + jitter before retrying
            // e.g. 1000ms -> 2000ms -> 4000ms (with small random jitter)
            const jitter = Math.random() * 200;
            const waitTime = (backoff * Math.pow(2, i)) + jitter;
            console.warn(`Attempt ${i + 1} failed. Retrying in ${Math.round(waitTime)}ms...`);
            await sleep(waitTime);
        }
    }
};

export const fetchData = async (): Promise<AppData> => {
    // Retry fetching init data more aggressively as it's critical
    const res = await apiRequest('getInitData', {}, 3, 1500);
    if (res.status === 'success') {
        // Compatibility fix: Map 'locations' to 'checkInLocations' if the backend returns the old format
        if (!res.checkInLocations && res.locations) {
            res.checkInLocations = res.locations;
        }
        return res;
    }
    throw new Error(res.message || 'Failed to fetch data');
};

export const checkUserRegistration = async (lineId: string): Promise<User | null> => {
    const res = await apiRequest('checkUser', { lineId });
    if (res.status === 'success' && res.exists) {
        return res.user;
    }
    return null;
};

export const loginStandardUser = async (username: string, password: string): Promise<User | null> => {
    const res = await apiRequest('login', { username, password });
    if (res.status === 'success') {
        return res.user;
    }
    return null;
};

export const registerUser = async (userData: Partial<User>) => {
    return await apiRequest('registerUser', userData);
};

export const updateUser = async (userData: Partial<User>) => {
    const res = await apiRequest('updateUser', userData);
    return res.status === 'success';
};

export const saveUserAdmin = async (userData: Partial<User>) => {
    return await apiRequest('saveUserAdmin', userData);
};

export const deleteUser = async (userId: string) => {
    const res = await apiRequest('deleteUser', { userId });
    return res.status === 'success';
};

export const getAllUsers = async (): Promise<User[]> => {
    const res = await apiRequest('getAllUsers');
    return res.status === 'success' ? res.users : [];
};

export const linkLineAccount = async (userId: string, lineId: string) => {
    const res = await apiRequest('linkLineAccount', { userId, lineId });
    return res.status === 'success';
};

export const saveLocation = async (location: Partial<CheckInLocation>) => {
    return await apiRequest('saveLocation', location);
};

export const deleteLocation = async (id: string) => {
    const res = await apiRequest('deleteLocation', { id });
    return res.status === 'success';
};

export const saveActivity = async (activity: Partial<CheckInActivity>) => {
    return await apiRequest('saveActivity', activity);
};

export const deleteActivity = async (id: string) => {
    const res = await apiRequest('deleteActivity', { id });
    return res.status === 'success';
};

export const performCheckIn = async (data: any) => {
    // Check-in is high priority, try 3 times
    return await apiRequest('checkIn', data, 3, 1000);
};

export const getCheckInLogs = async () => {
    const res = await apiRequest('getCheckInLogs');
    return res.status === 'success' ? res.logs : [];
};

export const getUserCheckInHistory = async (userId: string) => {
    const res = await apiRequest('getUserCheckIns', { userId });
    return res.status === 'success' ? res.logs : [];
};

export const deleteCheckInLog = async (id: string) => {
    const res = await apiRequest('deleteCheckInLog', { id });
    return res.status === 'success';
};

// New: Update Survey Status
export const updateCheckInSurveyStatus = async (checkInId: string, status: string) => {
    const res = await apiRequest('updateCheckInSurveyStatus', { checkInId, status });
    return res.status === 'success';
};

export const uploadImage = async (base64Data: string, filename: string) => {
    // Uploads might take time, give it a bit more initial delay on retry
    return await apiRequest('uploadFile', { data: base64Data, filename, mimeType: 'image/jpeg' }, 2, 2000);
};

export const uploadFile = async (base64Data: string, filename: string, mimeType: string) => {
    return await apiRequest('uploadFile', { data: base64Data, filename, mimeType }, 2, 2000);
};

// Alias for uploadImage as used in some components
export const uploadCheckInImage = async (base64Data: string) => {
    return uploadImage(base64Data, `checkin_${Date.now()}.jpg`);
};

export const saveAppConfig = async (config: any) => {
    const res = await apiRequest('saveAppConfig', { config });
    return res.status === 'success';
};

export const getCertificateConfig = async (): Promise<Record<string, CertificateTemplate>> => {
    const res = await apiRequest('getCertificateConfig');
    return res.status === 'success' ? res.configs : {};
};

export const saveCertificateConfig = async (id: string, config: CertificateTemplate) => {
    const res = await apiRequest('saveCertificateConfig', { id, config });
    return res.status === 'success';
};

export const getProxyImage = async (fileId: string): Promise<string | null> => {
    const res = await apiRequest('getImage', { id: fileId });
    return res.status === 'success' ? res.base64 : null;
};

// New functions for venues
export const saveVenue = async (venue: Partial<Venue>) => {
    const res = await apiRequest('saveVenue', venue);
    return res.status === 'success';
};

export const deleteVenue = async (id: string) => {
    const res = await apiRequest('deleteVenue', { id });
    return res.status === 'success';
};

// Announcement functions
export const addAnnouncement = async (title: string, content: string, type: string, link: string, author: string, clusterId: string, attachments: any[], coverImage: string, images: string[]) => {
    return await apiRequest('addAnnouncement', { title, content, type, link, author, clusterId, attachments, coverImage, images });
};

export const updateAnnouncement = async (announcement: Partial<Announcement>) => {
    return await apiRequest('updateAnnouncement', announcement);
};

export const deleteAnnouncement = async (id: string) => {
    const res = await apiRequest('deleteAnnouncement', { id });
    return res.status === 'success';
};

export const toggleLikeAnnouncement = async (id: string, userId: string) => {
    return await apiRequest('toggleLikeAnnouncement', { id, userId });
};

export const addComment = async (announcementId: string, text: string, userId: string, userName: string, userAvatar?: string) => {
    return await apiRequest('addComment', { announcementId, text, user: userId, userName, userAvatar });
};

export const getPrintConfig = async () => {
    const res = await apiRequest('getPrintConfig');
    return res.configs || {};
};

export const savePrintConfig = async (config: any) => {
    return await apiRequest('savePrintConfig', { key: 'posterConfig', config });
};

export const savePassportConfig = async (config: PassportConfig) => {
    return await apiRequest('savePassportConfig', { data: config });
};

// --- Missing Functions Added Below ---

// School functions
export const saveSchool = async (school: Partial<School>) => {
    return await apiRequest('saveSchool', school);
};

export const deleteSchool = async (id: string) => {
    const res = await apiRequest('deleteSchool', { id });
    return res.status === 'success';
};

// Team & Scoring functions
export const updateTeamStatus = async (teamId: string, status: string, reason: string = '') => {
    return await apiRequest('updateTeamStatus', { teamId, status, reason });
};

export const deleteTeam = async (teamId: string) => {
    const res = await apiRequest('deleteTeam', { teamId });
    return res.status === 'success';
};

export const updateTeamDetails = async (team: Partial<Team>) => {
    return await apiRequest('updateTeamDetails', team);
};

export const updateTeamResult = async (params: any) => {
    return await apiRequest('updateTeamResult', params);
};

export const updateAreaResult = async (params: any) => {
    return await apiRequest('updateAreaResult', params);
};

export const saveScoreSheet = async (data: any[]) => {
    return await apiRequest('saveScoreSheet', { data });
};

export const toggleActivityLock = async (activityId: string, isLocked: boolean, scope: 'cluster' | 'area') => {
    return await apiRequest('toggleActivityLock', { activityId, isLocked, scope });
};

// Judge functions
export const saveJudge = async (judge: any) => {
    return await apiRequest('saveJudge', judge);
};

export const deleteJudge = async (id: string) => {
    const res = await apiRequest('deleteJudge', { id });
    return res.status === 'success';
};

export const getJudgeConfig = async () => {
    const res = await apiRequest('getJudgeConfig');
    return res.status === 'success' ? res.configs : {};
};

export const saveJudgeConfig = async (id: string, config: any) => {
    const res = await apiRequest('saveJudgeConfig', { id, config });
    return res.status === 'success';
};

// System
export const createSampleData = async () => {
    return await apiRequest('createSampleData');
};
