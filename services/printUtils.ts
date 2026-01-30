
import QRCode from 'qrcode';
import { CheckInActivity, CheckInLocation } from '../types';

interface PrintConfig {
    layout?: string; // 'poster', 'half', 'card'
    theme?: string; // 'blue', 'red', 'green', 'orange', 'black'
    note?: string;
    // New Configs
    fontFamily?: string;
    margins?: { top: number; bottom: number; left: number; right: number };
    fontSizes?: { header: number; name: number; note: number };
}

export const generatePosterHTML = async (
    activitiesToPrint: CheckInActivity[], 
    locations: CheckInLocation[],
    config: PrintConfig
) => {
    const { 
        layout = 'poster', 
        theme = 'blue', 
        note = '',
        fontFamily = 'Kanit',
        margins = { top: 0, bottom: 0, left: 0, right: 0 },
        fontSizes = { header: 42, name: 32, note: 18 }
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
        const checkInUrl = `${window.location.origin}${window.location.pathname}#/checkin/${act.ActivityID}`;
        const qr = await QRCode.toDataURL(checkInUrl, { width: 600, margin: 1 });
        const loc = locations.find(l => l.LocationID === act.LocationID);
        return { act, loc, qr };
    });
    
    const items = await Promise.all(qrCodePromises);

    // CSS Definitions
    const baseCSS = `
        @page { size: A4; margin: 0; }
        body { 
            margin: 0; 
            padding: 0; 
            font-family: '${fontFamily}', sans-serif; 
            background: #fff; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
        }
        
        /* 
           Crucial Fix for Blank Pages:
           1. Height 296mm instead of 297mm to prevent slight overflow triggering new page.
           2. Overflow hidden to clip any excess content.
           3. Padding handles the custom margins.
        */
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
        
        /* Container inside the page (respects margins) */
        .page-content-wrapper {
            width: 100%;
            height: 100%;
            border: 1px dashed #e2e8f0; /* Helper border to see print area, can be removed */
            border: none;
            display: flex;
            flex-direction: column;
        }

        .card { 
            background: white; 
            border: 2px solid #e2e8f0; 
            display: flex; flex-direction: column; align-items: center; text-align: center; 
            position: relative; overflow: hidden;
            flex: 1; /* Take available space */
        }
        
        /* Header Style */
        .header { background: ${t.primary}; width: 100%; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; }
        .header h1 { margin: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .header p { margin: 5px 0 0; opacity: 0.9; font-weight: 300; }
        
        /* Content Style */
        .content { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 10px; box-sizing: border-box; }
        .act-name { font-weight: 800; color: ${t.secondary}; line-height: 1.2; margin-bottom: 10px; }
        .qr-box { border: 4px dashed ${t.primary}40; border-radius: 20px; padding: 10px; background: white; margin: 10px 0; }
        .qr-img { object-fit: contain; display: block; }
        .scan-text { color: ${t.primary}; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }
        
        .badge { background: ${t.badge}; color: ${t.secondary}; padding: 8px 20px; border-radius: 50px; font-weight: bold; display: inline-flex; align-items: center; margin-top: 10px; }
        .note { margin-top: 10px; font-weight: bold; color: #d97706; border: 2px solid #fbbf24; padding: 5px 15px; border-radius: 8px; background-color: #fffbeb; font-size: 0.8em; }
        
        .footer { width: 100%; background: ${t.bg}; border-top: 1px solid ${t.badge}; padding: 10px; font-size: 0.7em; color: ${t.secondary}aa; }
        
        .no-print { position: fixed; top: 10px; right: 10px; z-index: 9999; }
    `;

    // Layout Specific CSS
    let layoutCSS = '';
    let pagesHTML = '';

    if (layout === 'poster') {
        // 1 per Page (A4)
        layoutCSS = `
            .page-content-wrapper { display: flex; }
            .card { width: 100%; height: 100%; border: none; }
            .header { height: 20%; clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%); }
            .header h1 { font-size: ${fontSizes.header}pt; }
            .header p { font-size: ${fontSizes.header * 0.45}pt; }
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
                        <div class="header"><h1>Check-In Point</h1><p>จุดลงทะเบียนเข้าร่วมกิจกรรม</p></div>
                        <div class="content">
                            <div class="act-name">${item.act.Name}</div>
                            <div class="qr-box"><img src="${item.qr}" class="qr-img" /></div>
                            <div class="scan-text">SCAN ME</div>
                            <div class="badge">📍 ${item.loc?.Name || 'Location'}</div>
                            ${note ? `<div class="note">${note}</div>` : ''}
                        </div>
                        <div class="footer">UprightSchool Check-in System • ID: ${item.act.ActivityID}</div>
                    </div>
                </div>
            </div>
        `).join('');

    } else if (layout === 'half') {
        // 2 per Page (A5 Landscape x 2)
        // Adjust for margins: Use grid gap or flex
        layoutCSS = `
            .page-content-wrapper { display: grid; grid-template-rows: 1fr 1fr; gap: 5mm; }
            .card { border: 1px dashed #ccc; border-radius: 8px; }
            .header { height: 18%; clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%); }
            .header h1 { font-size: ${fontSizes.header * 0.6}pt; }
            .header p { font-size: ${fontSizes.header * 0.3}pt; }
            .act-name { font-size: ${fontSizes.name * 0.7}pt; }
            .qr-img { width: 65mm; height: 65mm; }
            .scan-text { font-size: 14pt; }
            .badge { font-size: ${fontSizes.note}pt; }
            .note { font-size: ${fontSizes.note * 0.8}pt; }
        `;
        
        // Chunk by 2
        for (let i = 0; i < items.length; i += 2) {
            const chunk = items.slice(i, i + 2);
            pagesHTML += `<div class="page"><div class="page-content-wrapper">`;
            chunk.forEach(item => {
                pagesHTML += `
                    <div class="card">
                        <div class="header"><h1>Check-In Point</h1><p>จุดลงทะเบียน</p></div>
                        <div class="content">
                            <div class="act-name">${item.act.Name}</div>
                            <div class="qr-box"><img src="${item.qr}" class="qr-img" /></div>
                            <div class="scan-text">SCAN ME</div>
                            <div class="badge">📍 ${item.loc?.Name || 'Location'}</div>
                            ${note ? `<div class="note">${note}</div>` : ''}
                        </div>
                        <div class="footer">ID: ${item.act.ActivityID}</div>
                    </div>
                `;
            });
            pagesHTML += `</div></div>`;
        }

    } else if (layout === 'card') {
        // 4 per Page (A6 x 4)
        layoutCSS = `
            .page-content-wrapper { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 5mm; }
            .card { border-radius: 15px; border: 1px solid #ddd; box-shadow: none; }
            .header { height: 45px; border-radius: 0 0 50% 50% / 10px; }
            .header h1 { font-size: 14pt; }
            .header p { display: none; }
            .act-name { font-size: ${fontSizes.name * 0.5}pt; margin-bottom: 5px; height: 40px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            .qr-box { padding: 5px; border-width: 2px; margin: 5px 0; }
            .qr-img { width: 45mm; height: 45mm; }
            .scan-text { font-size: 10pt; }
            .badge { font-size: 9pt; padding: 4px 10px; margin-top: 5px; max-width: 90%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .note { font-size: 8pt; padding: 2px 8px; margin-top: 5px; }
            .footer { padding: 5px; font-size: 8pt; }
        `;

        // Chunk by 4
        for (let i = 0; i < items.length; i += 4) {
            const chunk = items.slice(i, i + 4);
            pagesHTML += `<div class="page"><div class="page-content-wrapper">`;
            chunk.forEach(item => {
                pagesHTML += `
                    <div class="card">
                        <div class="header"><h1>CHECK-IN</h1></div>
                        <div class="content">
                            <div class="act-name">${item.act.Name}</div>
                            <div class="qr-box"><img src="${item.qr}" class="qr-img" /></div>
                            <div class="badge">📍 ${item.loc?.Name || 'Location'}</div>
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
                <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600;800&family=Sarabun:wght@400;700&family=Chakra+Petch:wght@400;700&family=Mali:wght@400;700&display=swap" rel="stylesheet">
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
