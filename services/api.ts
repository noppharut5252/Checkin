
import { AppData, User, CheckInLocation, CheckInActivity, PassportConfig, Announcement, Venue, CertificateTemplate } from '../types';

// Replace with your actual Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbxyS_GG5snXmt2YTcMCMMYgfQZmzTynb-esxe8N2NBAdC1uGdIGGnPh7W0PuId4r4OF/exec";

const apiRequest = async (action: string, params: any = {}) => {
    try {
        // GAS Web App often requires text/plain to avoid CORS preflight issues with application/json
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, ...params }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`API Error (${action}):`, error);
        throw error;
    }
};

export const fetchData = async (): Promise<AppData> => {
    const res = await apiRequest('getInitData');
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
    return await apiRequest('checkIn', data);
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

export const uploadImage = async (base64Data: string, filename: string) => {
    return await apiRequest('uploadFile', { data: base64Data, filename, mimeType: 'image/jpeg' });
};

export const uploadFile = async (base64Data: string, filename: string, mimeType: string) => {
    return await apiRequest('uploadFile', { data: base64Data, filename, mimeType });
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
