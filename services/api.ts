
import { AppData, CheckInUser, CheckInLocation, CheckInActivity } from '../types';

const API_URL = "https://script.google.com/macros/s/AKfycbxyS_GG5snXmt2YTcMCMMYgfQZmzTynb-esxe8N2NBAdC1uGdIGGnPh7W0PuId4r4OF/exec";

// --- Retry Logic Helper ---
const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<any> => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        if (retries > 0) {
            console.warn(`Request failed, retrying in ${backoff}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2); // Exponential backoff
        }
        throw error;
    }
};

const apiRequest = async (action: string, payload: any = {}) => {
    try {
        // Use fetchWithRetry instead of direct fetch
        const response = await fetchWithRetry(`${API_URL}`, {
            method: 'POST',
            mode: 'cors', // Ensure CORS is handled
            body: JSON.stringify({ action, ...payload })
        });
        return response;
    } catch (e) {
        console.error(`API Error (${action}):`, e);
        return { status: 'error', message: 'Network connection failed or timed out.' };
    }
};

export const fetchData = async (): Promise<AppData> => {
    const res = await apiRequest('getInitData');
    if (res.status === 'error') {
        throw new Error(res.message);
    }
    return {
        checkInLocations: res.locations || [],
        checkInActivities: res.checkInActivities || [],
        activities: res.activities || [],
        teams: res.teams || [],
        schools: res.schools || [],
        clusters: res.clusters || [],
        files: res.files || [],
        announcements: res.announcements || [],
        venues: res.venues || [],
        judges: res.judges || [],
        activityStatus: res.activityStatus || [],
        appConfig: res.appConfig
    };
};

export const getCheckInLogs = async () => {
    const res = await apiRequest('getCheckInLogs');
    return res.logs || [];
};

// --- Auth ---

export const loginStandardUser = async (username: string, password: string): Promise<CheckInUser | null> => {
    const res = await apiRequest('login', { username, password });
    return res.status === 'success' ? res.user : null;
};

export const checkUserRegistration = async (lineId: string): Promise<CheckInUser | null> => {
    const res = await apiRequest('checkUser', { lineId });
    return res.exists ? res.user : null;
};

export const registerCheckInUser = async (user: { name: string, lineId: string, pictureUrl: string }) => {
    return await apiRequest('registerUser', user);
};

// --- Check In ---

export const performCheckIn = async (payload: { userId: string, activityId: string, locationId: string, userLat: number, userLng: number, photoUrl: string, comment: string }) => {
    return await apiRequest('checkIn', payload);
};

export const uploadCheckInImage = async (base64: string) => {
     return await apiRequest('uploadFile', { data: base64, filename: `checkin_${Date.now()}.jpg`, mimeType: 'image/jpeg' });
};

// --- Admin Management ---

export const saveLocation = async (location: Partial<CheckInLocation>) => {
    return await apiRequest('saveLocation', { 
        id: location.LocationID,
        name: location.Name,
        lat: location.Latitude,
        lng: location.Longitude,
        radius: location.RadiusMeters,
        desc: location.Description,
        image: location.Image, // Keep for backward compat
        images: location.Images, // New JSON array string
        floor: location.Floor,
        room: location.Room
    });
};

export const deleteLocation = async (id: string) => {
    return await apiRequest('deleteLocation', { id });
};

export const saveActivity = async (activity: Partial<CheckInActivity>) => {
    return await apiRequest('saveActivity', {
        id: activity.ActivityID,
        locationId: activity.LocationID,
        name: activity.Name,
        desc: activity.Description,
        status: activity.Status,
        startDateTime: activity.StartDateTime, // Include Start Time
        endDateTime: activity.EndDateTime,     // Include End Time
        capacity: activity.Capacity,           // Include Capacity
        image: activity.Image                  // Include Image
    });
};

export const deleteActivity = async (id: string) => {
    return await apiRequest('deleteActivity', { id });
};

// --- Competition Manager API ---

export const updateTeamStatus = async (teamId: string, status: string, reason: string) => {
    return await apiRequest('updateTeamStatus', { teamId, status, reason });
};

export const deleteTeam = async (teamId: string) => {
    return await apiRequest('deleteTeam', { teamId });
};

export const addAnnouncement = async (
    title: string, 
    content: string, 
    type: 'news'|'manual', 
    link: string, 
    author: string, 
    clusterId: string, 
    attachments: any[],
    coverImage?: string,
    images?: string[]
) => {
    return await apiRequest('addAnnouncement', { 
        title, content, type, link, author, clusterId, attachments, coverImage, images 
    });
};

export const updateAnnouncement = async (announcement: any) => {
    return await apiRequest('updateAnnouncement', announcement);
};

export const deleteAnnouncement = async (id: string) => {
    return await apiRequest('deleteAnnouncement', { id });
};

export const toggleLikeAnnouncement = async (id: string, userId: string) => {
    return await apiRequest('toggleLikeAnnouncement', { id, userId });
};

export const addComment = async (announcementId: string, text: string, userId: string, userName: string, userAvatar?: string) => {
    return await apiRequest('addComment', { announcementId, text, user: userId, userName, userAvatar });
};

export const updateTeamDetails = async (data: any) => {
    return await apiRequest('updateTeamDetails', data);
};

export const uploadImage = async (base64: string, filename: string) => {
    return await apiRequest('uploadFile', { data: base64, filename, mimeType: 'image/jpeg' });
};

export const uploadFile = async (base64: string, filename: string, mimeType: string) => {
    return await apiRequest('uploadFile', { data: base64, filename, mimeType });
};

export const linkLineAccount = async (userId: string, lineId: string) => {
    return await apiRequest('linkLineAccount', { userId, lineId });
};

export const registerUser = async (user: any) => {
    return await apiRequest('registerUser', user);
};

export const updateUser = async (user: any) => {
    return await apiRequest('updateUser', user);
};

export const getAllUsers = async () => {
    const res = await apiRequest('getAllUsers');
    return res.users || [];
};

export const saveUserAdmin = async (user: any) => {
    return await apiRequest('saveUserAdmin', user);
};

export const deleteUser = async (userId: string) => {
    return await apiRequest('deleteUser', { userId });
};

export const updateTeamResult = async (teamId: string, score: number, rank: string, medal: string, flag: string, stage: string, remark: string) => {
    return await apiRequest('updateTeamResult', { teamId, score, rank, medal, flag, stage, remark });
};

export const updateAreaResult = async (teamId: string, score: number, rank: string, medal: string, remark: string) => {
    return await apiRequest('updateAreaResult', { teamId, score, rank, medal, remark });
};

export const saveScoreSheet = async (data: any) => {
    return await apiRequest('saveScoreSheet', data);
};

export const toggleActivityLock = async (activityId: string, scope: string, isLocked: boolean) => {
    return await apiRequest('toggleActivityLock', { activityId, scope, isLocked });
};

export const saveVenue = async (venue: any) => {
    return await apiRequest('saveVenue', venue);
};

export const deleteVenue = async (id: string) => {
    return await apiRequest('deleteVenue', { id });
};

export const saveJudge = async (judge: any) => {
    return await apiRequest('saveJudge', judge);
};

export const deleteJudge = async (id: string) => {
    return await apiRequest('deleteJudge', { id });
};

export const getJudgeConfig = async () => {
    const res = await apiRequest('getJudgeConfig');
    return res.configs || {};
};

export const saveJudgeConfig = async (config: any) => {
    return await apiRequest('saveJudgeConfig', config);
};

export const saveSchool = async (school: any) => {
    return await apiRequest('saveSchool', school);
};

export const deleteSchool = async (id: string) => {
    return await apiRequest('deleteSchool', { id });
};

export const getCertificateConfig = async () => {
    const res = await apiRequest('getCertificateConfig');
    return res.configs || {};
};

export const saveCertificateConfig = async (id: string, config: any) => {
    return await apiRequest('saveCertificateConfig', { id, config });
};

export const getProxyImage = async (fileId: string) => {
    const res = await apiRequest('getImage', { id: fileId });
    return res.base64;
};

export const saveAppConfig = async (config: any) => {
    return await apiRequest('saveAppConfig', { config });
};

export const getPrintConfig = async () => {
    return {};
};

export const savePrintConfig = async (config: any) => {
    return { status: 'success' };
};
