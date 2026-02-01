
import QRCode from 'qrcode';
import { CheckInActivity, CheckInLocation } from '../types';

interface PrintConfig {
    layout?: string; // 'poster', 'half', 'card'
    theme?: string; // 'blue', 'red', 'green', 'orange', 'black'
    note?: string;
    // New Configs
    margins?: { top: number; bottom: number; left: number; right: number };
    fonts?: {
        header: string;
        subheader: string;
        name: string;
        note: string;
    };
    fontSizes?: { 
        header: number; 
        subheader: number; 
        name: number; 
        note: number; 
    };
    qrType?: 'checkin' | 'registration'; // Added qrType
}

// LIFF URL Base
const LIFF_BASE_ID = "2006369866-W1AicZ72";
const LIFF_URL = `https://liff.line.me/${LIFF_BASE_ID}`;

export const generatePosterHTML = async (
    activitiesToPrint: CheckInActivity[], 
    locations: CheckInLocation[],
    config: PrintConfig
) => {
    const { 
        layout = 'poster', 
        theme = 'blue', 
        note = '',
        margins = { top: 0, bottom: 0, left: 0, right: 0 },
        fonts = { header: 'Kanit', subheader: 'Kanit', name: 'Kanit', note: 'Kanit' },
        fontSizes = { header: 42, subheader: 18, name: 32, note: 18 },
        qrType = 'checkin'
    } = config;

    // Theme Colors
    const colors: Record<string, any> = {
        blue: { primary: '#2563eb', secondary: '#1e3a8a', bg: '#eff6ff', badge: '#dbeafe' },
        red: { primary: '#dc2626', secondary: '#991b1b', bg: '#fef2f2', badge: '#fee2e2' },
        green: { primary: '#16a34a', secondary: '#14532d', bg: '#f0fdf4', badge: '#dcfce7' },
        orange: { primary: '#d97706', secondary: '#78350f', bg: '#fffbeb', badge: '#fef3c7' },
        black: { primary: '#1f2937', secondary: '#000000', bg: '#f9fafb', badge: '#e5e7eb' },
    };
    const t = colors[theme] || colors.blue;

    const qrCodePromises = activitiesToPrint.map(async (act) => {
        let url = '';
        let headerTitle = '';
        let headerSub = '';
        let mainName = '';
        let badgeText = '';
        
        if (qrType === 'registration') {
            // Registration Mode: Link to LIFF Root
            url = LIFF_URL;
            headerTitle = "REGISTRATION";
            headerSub = "ลงทะเบียน / เข้าสู่ระบบ";
            mainName = "UprightSchool Check-in";
            badgeText = "📱 สแกนด้วย LINE";
        } else {
            // Activity Check-in Mode: LIFF Deep Link
            // Construct URL: https://liff.line.me/<ID>/#/checkin/<ACT_ID>
            // This ensures opening inside LINE context -> App.tsx handles routing
            url = `${LIFF_URL}/#/checkin/${act.ActivityID}`;
            
            headerTitle = "Check-In Point";
            headerSub = "จุดลงทะเบียนเข้าร่วมกิจกรรม";
            mainName = act.Name;
            const loc = locations.find(l => l.LocationID === act.LocationID);
            badgeText = `📍 ${loc?.Name || 'Location'}`;
        }

        const qr = await QRCode.toDataURL(url, { width: 600, margin: 1 });
        return { act, qr, headerTitle, headerSub, mainName, badgeText };
    });
    
    const items = await Promise.all(qrCodePromises);

    // CSS Definitions
    const baseCSS = `
        @page { size: A4; margin: 0; }
        body { 
            margin: 0; 
            padding: 0; 
            background: #fff; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
        }
        
        .page { 
            width: 210mm; 
            height: 296mm; 
            position: relative; 
            overflow: hidden; 
            page-break-after: always; 
            box-sizing: border-box; 
            background: white;
            padding-top: ${margins.top}mm;
            padding-bottom: ${margins.bottom}mm;
            padding-left: ${margins.left}mm;
            padding-right: ${margins.right}mm;
        }
        
        .page:last-child { page-break-after: avoid; }
        
        .page-content-wrapper {
            width: 100%;
            height: 100%;
            border: none;
            display: flex;
            flex-direction: column;
        }

        .card { 
            background: white; 
            border: 2px solid #e2e8f0; 
            display: flex; flex-direction: column; align-items: center; text-align: center; 
            position: relative; overflow: hidden;
            flex: 1; 
        }
        
        /* Header Style */
        .header { background: ${t.primary}; width: 100%; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; }
        
        /* Specific Font Application */
        .header h1 { 
            margin: 0; 
            font-weight: 800; 
            text-transform: uppercase; 
            letter-spacing: 1px;
            font-family: '${fonts.header}', sans-serif;
        }
        .header p { 
            margin: 5px 0 0; 
            opacity: 0.9; 
            font-weight: 300;
            font-family: '${fonts.subheader}', sans-serif;
        }
        
        /* Content Style */
        .content { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 10px; box-sizing: border-box; }
        
        .act-name { 
            font-weight: 800; 
            color: ${t.secondary}; 
            line-height: 1.2; 
            margin-bottom: 10px;
            font-family: '${fonts.name}', sans-serif;
        }
        
        .qr-box { border: 4px dashed ${t.primary}40; border-radius: 20px; padding: 10px; background: white; margin: 10px 0; }
        .qr-img { object-fit: contain; display: block; }
        
        .scan-text { 
            color: ${t.primary}; 
            font-weight: 800; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
            margin-top: 5px;
            font-family: '${fonts.note}', sans-serif;
        }
        
        .badge { 
            background: ${t.badge}; 
            color: ${t.secondary}; 
            padding: 8px 20px; 
            border-radius: 50px; 
            font-weight: bold; 
            display: inline-flex; 
            align-items: center; 
            margin-top: 10px;
            font-family: '${fonts.note}', sans-serif;
        }
        
        .note { 
            margin-top: 10px; 
            font-weight: bold; 
            color: #d97706; 
            border: 2px solid #fbbf24; 
            padding: 5px 15px; 
            border-radius: 8px; 
            background-color: #fffbeb; 
            font-size: 0.8em;
            font-family: '${fonts.note}', sans-serif;
        }
        
        .footer { 
            width: 100%; 
            background: ${t.bg}; 
            border-top: 1px solid ${t.badge}; 
            padding: 10px; 
            font-size: 0.7em; 
            color: ${t.secondary}aa; 
            font-family: '${fonts.note}', sans-serif;
        }
        
        .no-print { position: fixed; top: 10px; right: 10px; z-index: 9999; }
    `;

    let layoutCSS = '';
    let pagesHTML = '';

    if (layout === 'poster') {
        layoutCSS = `
            .page-content-wrapper { display: flex; }
            .card { width: 100%; height: 100%; border: none; }
            .header { height: 20%; clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%); }
            .header h1 { font-size: ${fontSizes.header}pt; }
            .header p { font-size: ${fontSizes.subheader}pt; }
            .act-name { font-size: ${fontSizes.name}pt; margin-bottom: 20px; }
            .qr-box { padding: 20px; border-width: 6px; }
            .qr-img { width: 120mm; height: 120mm; }
            .scan-text { font-size: ${fontSizes.name * 0.75}pt; margin-top: 15px; }
            .badge { font-size: ${fontSizes.note * 1.2}pt; padding: 15px 40px; margin-top: 30px; }
            .note { font-size: ${fontSizes.note}pt; padding: 10px 30px; margin-top: 20px; }
            .footer { height: 50px; display: flex; align-items: center; justify-content: center; font-size: 14pt; }
        `;
        pagesHTML = items.map(item => `
            <div class="page">
                <div class="page-content-wrapper">
                    <div class="card">
                        <div class="header"><h1>${item.headerTitle}</h1><p>${item.headerSub}</p></div>
                        <div class="content">
                            <div class="act-name">${item.mainName}</div>
                            <div class="qr-box"><img src="${item.qr}" class="qr-img" /></div>
                            <div class="scan-text">SCAN ME</div>
                            <div class="badge">${item.badgeText}</div>
                            ${note ? `<div class="note">${note}</div>` : ''}
                        </div>
                        <div class="footer">UprightSchool System • ${item.act.ActivityID || 'REG'}</div>
                    </div>
                </div>
            </div>
        `).join('');

    } else if (layout === 'half') {
        layoutCSS = `
            .page-content-wrapper { display: grid; grid-template-rows: 1fr 1fr; gap: 5mm; }
            .card { border: 1px dashed #ccc; border-radius: 8px; }
            .header { height: 18%; clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%); }
            .header h1 { font-size: ${fontSizes.header * 0.6}pt; }
            .header p { font-size: ${fontSizes.subheader * 0.7}pt; }
            .act-name { font-size: ${fontSizes.name * 0.7}pt; }
            .qr-img { width: 65mm; height: 65mm; }
            .scan-text { font-size: ${fontSizes.name * 0.5}pt; }
            .badge { font-size: ${fontSizes.note}pt; }
            .note { font-size: ${fontSizes.note * 0.8}pt; }
        `;
        
        for (let i = 0; i < items.length; i += 2) {
            const chunk = items.slice(i, i + 2);
            pagesHTML += `<div class="page"><div class="page-content-wrapper">`;
            chunk.forEach(item => {
                pagesHTML += `
                    <div class="card">
                        <div class="header"><h1>${item.headerTitle}</h1><p>${item.headerSub}</p></div>
                        <div class="content">
                            <div class="act-name">${item.mainName}</div>
                            <div class="qr-box"><img src="${item.qr}" class="qr-img" /></div>
                            <div class="scan-text">SCAN ME</div>
                            <div class="badge">${item.badgeText}</div>
                            ${note ? `<div class="note">${note}</div>` : ''}
                        </div>
                        <div class="footer">ID: ${item.act.ActivityID || 'REG'}</div>
                    </div>
                `;
            });
            pagesHTML += `</div></div>`;
        }

    } else if (layout === 'card') {
        layoutCSS = `
            .page-content-wrapper { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 5mm; }
            .card { border-radius: 15px; border: 1px solid #ddd; box-shadow: none; }
            .header { height: 45px; border-radius: 0 0 50% 50% / 10px; }
            .header h1 { font-size: ${fontSizes.header * 0.4}pt; }
            .header p { display: none; }
            .act-name { font-size: ${fontSizes.name * 0.5}pt; margin-bottom: 5px; height: 40px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            .qr-box { padding: 5px; border-width: 2px; margin: 5px 0; }
            .qr-img { width: 45mm; height: 45mm; }
            .scan-text { font-size: 10pt; }
            .badge { font-size: ${fontSizes.note * 0.8}pt; padding: 4px 10px; margin-top: 5px; max-width: 90%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .note { font-size: 8pt; padding: 2px 8px; margin-top: 5px; }
            .footer { padding: 5px; font-size: 8pt; }
        `;

        for (let i = 0; i < items.length; i += 4) {
            const chunk = items.slice(i, i + 4);
            pagesHTML += `<div class="page"><div class="page-content-wrapper">`;
            chunk.forEach(item => {
                pagesHTML += `
                    <div class="card">
                        <div class="header"><h1>${item.headerTitle}</h1></div>
                        <div class="content">
                            <div class="act-name">${item.mainName}</div>
                            <div class="qr-box"><img src="${item.qr}" class="qr-img" /></div>
                            <div class="badge">${item.badgeText}</div>
                            ${note ? `<div class="note">${note}</div>` : ''}
                        </div>
                    </div>
                `;
            });
            pagesHTML += `</div></div>`;
        }
    }

    return `
        <html>
            <head>
                <title>Print QR Posters</title>
                <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600;800&family=Sarabun:wght@400;700&family=Chakra+Petch:wght@400;700&family=Mali:wght@400;700&family=Charmonman:wght@400;700&family=Srisakdi:wght@400;700&family=Bai+Jamjuree:wght@400;600&family=Kodchasan:wght@400;600&family=Thasadith:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    ${baseCSS}
                    ${layoutCSS}
                </style>
            </head>
            <body>
                <div class="no-print"><button onclick="window.print()" style="padding: 10px 20px; background: ${t.primary}; color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Kanit'; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">🖨️ พิมพ์ / บันทึก PDF</button></div>
                ${pagesHTML}
            </body>
        </html>
    `;
};
