
import QRCode from 'qrcode';
import { CheckInActivity, CheckInLocation } from '../types';

export const generatePosterHTML = async (
    activitiesToPrint: CheckInActivity[], 
    locations: CheckInLocation[],
    customNote: string
) => {
    const qrCodePromises = activitiesToPrint.map(async (act) => {
        const checkInUrl = `${window.location.origin}${window.location.pathname}#/checkin/${act.ActivityID}`;
        const qr = await QRCode.toDataURL(checkInUrl, { width: 400, margin: 1 });
        const loc = locations.find(l => l.LocationID === act.LocationID);
        return { act, loc, qr };
    });
    const pages = await Promise.all(qrCodePromises);
    return `
        <html>
            <head>
                <title>Print QR Posters</title>
                <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600;800&display=swap" rel="stylesheet">
                <style>
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 0; font-family: 'Kanit', sans-serif; background: #eee; -webkit-print-color-adjust: exact; }
                    .page { width: 209mm; height: 296mm; background: white; position: relative; overflow: hidden; page-break-after: always; display: flex; flex-direction: column; align-items: center; text-align: center; margin: 0 auto; }
                    .page:last-child { page-break-after: avoid; }
                    .header { background: #2563eb; width: 100%; padding: 40px 20px; color: white; clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%); }
                    .header h1 { margin: 0; font-size: 32pt; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }
                    .header p { margin: 10px 0 0; font-size: 14pt; opacity: 0.9; }
                    .content { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 20px; }
                    .activity-name { font-size: 24pt; font-weight: bold; color: #1e3a8a; margin-bottom: 20px; line-height: 1.2; max-width: 90%; }
                    .qr-container { border: 4px dashed #cbd5e1; border-radius: 20px; padding: 20px; background: white; margin: 20px 0; }
                    .qr-img { width: 100mm; height: 100mm; object-fit: contain; }
                    .loc-badge { background: #f1f5f9; color: #475569; padding: 10px 30px; border-radius: 50px; font-size: 16pt; font-weight: bold; display: flex; align-items: center; margin-top: 20px; }
                    .custom-note { margin-top: 20px; font-size: 18pt; color: #d97706; font-weight: bold; border: 2px solid #fbbf24; padding: 10px 20px; border-radius: 10px; background-color: #fffbeb; }
                    .footer { width: 100%; padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; margin-top: auto; }
                    .footer-text { font-size: 12pt; color: #64748b; }
                    .no-print { position: fixed; top: 10px; right: 10px; z-index: 999; }
                    button { padding: 10px 20px; background: blue; color: white; border: none; border-radius: 5px; cursor: pointer; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="no-print"><button onclick="window.print()">Print Posters</button></div>
                ${pages.map(p => `
                    <div class="page">
                        <div class="header"><h1>Check-In Point</h1><p>จุดลงทะเบียนเข้าร่วมกิจกรรม</p></div>
                        <div class="content">
                            <div class="activity-name">${p.act.Name}</div>
                            <div class="qr-container"><img src="${p.qr}" class="qr-img" /></div>
                            <p style="font-size: 14pt; color: #ef4444; font-weight: bold;">สแกนเพื่อลงทะเบียน</p>
                            <div class="loc-badge">📍 ${p.loc?.Name || 'ไม่ระบุสถานที่'}</div>
                            ${customNote ? `<div class="custom-note">Note: ${customNote}</div>` : ''}
                        </div>
                        <div class="footer"><div class="footer-text">ระบบเช็คอิน UprightSchool • ID: ${p.act.ActivityID}</div></div>
                    </div>
                `).join('')}
            </body>
        </html>
    `;
};
