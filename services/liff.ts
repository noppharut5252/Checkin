
// Wrapper for LINE LIFF SDK

const LIFF_ID = "2006369866-W1AicZ72";

let liffInitPromise: Promise<void> | null = null;

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  email?: string;
}

const ensureLiffInitialized = async () => {
    if (!liffInitPromise) {
        liffInitPromise = (async () => {
            try {
                // @ts-ignore
                if (typeof liff === 'undefined') {
                    console.warn("LIFF SDK not loaded");
                    return;
                }
                // @ts-ignore
                await liff.init({ liffId: LIFF_ID });
            } catch (error) {
                console.error("LIFF Initialization failed", error);
            }
        })();
    }
    await liffInitPromise;
};

export const initLiff = async (): Promise<LiffProfile | null> => {
  await ensureLiffInitialized();
  try {
    // @ts-ignore
    if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
      // @ts-ignore
      const profile = await liff.getProfile();
      // @ts-ignore
      const email = liff.getDecodedIDToken()?.email;
      return { ...profile, email };
    }
    return null;
  } catch (error) {
    console.error("Error getting LIFF profile", error);
    return null;
  }
};

export const loginLiff = () => {
  // @ts-ignore
  if (typeof liff !== 'undefined' && !liff.isLoggedIn()) {
    // @ts-ignore
    liff.login();
  }
};

export const logoutLiff = async () => {
  await ensureLiffInitialized();
  try {
      // @ts-ignore
      if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
        // @ts-ignore
        liff.logout();
      }
  } catch (e) {
      console.warn("LIFF logout error", e);
  }
  // Always reload to clear app state
  window.location.reload();
};

// --- Helper: Check sharing capability ---
const isShareTargetPickerSupported = () => {
    // @ts-ignore
    return typeof liff !== 'undefined' && liff.isApiAvailable('shareTargetPicker');
};

// Helper: General Share Logic
const shareContent = async (flexMessage: any, altText: string, fallbackText: string) => {
    await ensureLiffInitialized();
    // @ts-ignore
    const isLoggedIn = liff.isLoggedIn();

    if (isShareTargetPickerSupported() && isLoggedIn) {
        try {
            // @ts-ignore
            const res = await liff.shareTargetPicker([flexMessage]);
            if (res) return { success: true, method: 'line' };
        } catch (error) {
            console.error("LINE Share failed", error);
        }
    }

    if (navigator.share) {
        try {
            await navigator.share({ title: altText, text: fallbackText });
            return { success: true, method: 'share' };
        } catch (error) { }
    }

    try {
        await navigator.clipboard.writeText(fallbackText);
        return { success: true, method: 'copy' };
    } catch (err) {
        return { success: false, method: 'error' };
    }
};

// 1. Share Digital ID Card
export const shareIdCard = async (
    teamName: string,
    schoolName: string,
    memberName: string,
    role: string,
    teamId: string,
    imageUrl: string,
    levelText: string,
    viewLevel: string = 'cluster'
): Promise<{ success: boolean; method: 'line' | 'share' | 'copy' | 'error' }> => {
    
    const appUrl = `${window.location.origin}${window.location.pathname}#/idcards?id=${teamId}&level=${viewLevel}`;
    const roleText = role === 'Teacher' ? 'ครูผู้ฝึกสอน (Trainer)' : 'ผู้เข้าแข่งขัน (Competitor)';
    const headerColor = role === 'Teacher' ? '#4F46E5' : '#10B981'; 

    const flexMessage = {
        type: "flex",
        altText: `Digital ID: ${memberName}`,
        contents: {
            "type": "bubble",
            "size": "mega",
            "header": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                { "type": "text", "text": "DIGITAL ID CARD", "color": "#ffffff", "align": "start", "size": "xs", "gravity": "center", "weight": "bold", "letterSpacing": "2px" },
                { "type": "text", "text": levelText, "color": "#ffffff", "align": "start", "size": "xxs", "gravity": "center", "alpha": 0.8 }
              ],
              "backgroundColor": headerColor,
              "paddingTop": "15px",
              "paddingAll": "15px",
              "paddingBottom": "35px"
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "box",
                  "layout": "horizontal",
                  "contents": [
                    {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        { "type": "image", "url": imageUrl, "aspectMode": "cover", "size": "full" }
                      ],
                      "cornerRadius": "100px",
                      "width": "80px",
                      "height": "80px",
                      "borderWidth": "3px",
                      "borderColor": "#ffffff"
                    }
                  ],
                  "justifyContent": "center",
                  "offsetTop": "-60px"
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    { "type": "text", "text": memberName, "align": "center", "weight": "bold", "size": "xl", "color": "#111111", "wrap": true },
                    { "type": "text", "text": roleText, "align": "center", "size": "xs", "color": "#999999", "margin": "xs" }
                  ],
                  "offsetTop": "-45px"
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        { "type": "text", "text": "โรงเรียน / School", "size": "xxs", "color": "#aaaaaa" },
                        { "type": "text", "text": schoolName, "size": "sm", "color": "#333333", "wrap": true, "weight": "bold" }
                      ],
                      "margin": "md"
                    },
                    {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        { "type": "text", "text": "ทีม / Team", "size": "xxs", "color": "#aaaaaa" },
                        { "type": "text", "text": teamName, "size": "sm", "color": "#333333", "wrap": true, "weight": "bold" }
                      ],
                      "margin": "md"
                    }
                  ],
                  "paddingAll": "15px",
                  "backgroundColor": "#f7f9fc",
                  "cornerRadius": "10px",
                  "offsetTop": "-20px"
                }
              ],
              "paddingAll": "0px"
            },
            "footer": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "button",
                  "action": { "type": "uri", "label": "เปิดบัตรประจำตัว", "uri": appUrl },
                  "style": "primary",
                  "color": headerColor,
                  "height": "sm"
                }
              ],
              "paddingAll": "15px"
            }
          }
    };

    // @ts-ignore
    return shareContent(flexMessage, `Digital ID: ${memberName}`, `${memberName} - ${teamName}\n${appUrl}`);
}

// 2. Share Check-in Activity (Updated with Floor/Room support)
export const shareCheckInActivity = async (
    activityName: string,
    locationName: string,
    timeText: string,
    activityId: string,
    imageUrl?: string,
    floor?: string,
    room?: string
): Promise<{ success: boolean; method: 'line' | 'share' | 'copy' | 'error' }> => {
    const appUrl = `${window.location.origin}${window.location.pathname}#/checkin/${activityId}`;
    
    // Construct robust details for fallback text
    let detailText = `สถานที่: ${locationName || 'ไม่ระบุ'}`;
    if (floor || room) detailText += ` (${floor ? 'ชั้น ' + floor : ''} ${room ? 'ห้อง ' + room : ''})`;
    const textSummary = `📍 เช็คอินเข้าร่วมกิจกรรม: ${activityName}\n${detailText}\nเวลา: ${timeText}\n\nกดลิงก์เพื่อเช็คอิน: ${appUrl}`;

    // Build contents array dynamically to handle optional fields
    const bodyContents: any[] = [
        {
            "type": "box",
            "layout": "baseline",
            "spacing": "sm",
            "contents": [
                { "type": "text", "text": "สถานที่", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                { "type": "text", "text": locationName || 'ไม่ระบุ', "wrap": true, "color": "#666666", "size": "sm", "flex": 4 }
            ]
        }
    ];

    // Add Floor/Room row if data exists
    if (floor || room) {
        const floorText = floor ? `ชั้น ${floor}` : '';
        const roomText = room ? `ห้อง ${room}` : '';
        const combined = [floorText, roomText].filter(Boolean).join(' / ');
        
        if (combined) {
            bodyContents.push({
                "type": "box",
                "layout": "baseline",
                "spacing": "sm",
                "contents": [
                    { "type": "text", "text": "รายละเอียด", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                    { "type": "text", "text": combined, "wrap": true, "color": "#666666", "size": "sm", "flex": 4 }
                ]
            });
        }
    }

    // Add Time row
    bodyContents.push({
        "type": "box",
        "layout": "baseline",
        "spacing": "sm",
        "contents": [
            { "type": "text", "text": "เวลา", "color": "#aaaaaa", "size": "sm", "flex": 1 },
            { "type": "text", "text": timeText || 'ไม่ระบุ', "wrap": true, "color": "#666666", "size": "sm", "flex": 4 }
        ]
    });

    const flexMessage = {
        type: "flex",
        altText: `Check-in: ${activityName}`,
        contents: {
            "type": "bubble",
            "hero": imageUrl ? {
                "type": "image",
                "url": imageUrl,
                "size": "full",
                "aspectRatio": "20:13",
                "aspectMode": "cover",
                "action": { "type": "uri", "uri": appUrl }
            } : undefined,
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    { "type": "text", "text": "CHECK-IN", "weight": "bold", "color": "#1DB446", "size": "xs", "action": { "type": "uri", "label": "action", "uri": appUrl } },
                    { "type": "text", "text": activityName || 'Activity', "weight": "bold", "size": "xl", "margin": "md", "wrap": true },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "margin": "lg",
                        "spacing": "sm",
                        "contents": bodyContents
                    }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "spacing": "sm",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "height": "sm",
                        "action": { "type": "uri", "label": "กดเพื่อเช็คอิน", "uri": appUrl },
                        "color": "#06C755"
                    }
                ],
                "flex": 0
            }
        }
    };

    // @ts-ignore
    return shareContent(flexMessage, `Check-in: ${activityName}`, textSummary);
};

// 3. Share Score Result (Individual/Team Result)
export const shareScoreResult = async (
    teamName: string, 
    schoolName: string, 
    activityName: string, 
    score: string | number, 
    medal: string, 
    rank: string, 
    teamId: string = ''
) => {
    const resultUrl = `${window.location.origin}${window.location.pathname}#/share-result?id=${teamId}`;
    let medalColor = "#999999";
    let medalText = "เข้าร่วม";
    if (medal.includes('Gold')) { medalColor = "#FFD700"; medalText = "เหรียญทอง"; }
    else if (medal.includes('Silver')) { medalColor = "#C0C0C0"; medalText = "เหรียญเงิน"; }
    else if (medal.includes('Bronze')) { medalColor = "#CD7F32"; medalText = "เหรียญทองแดง"; }

    const flexMessage = {
        type: "flex",
        altText: `ผลการแข่งขัน: ${teamName}`,
        contents: {
            "type": "bubble",
            "size": "giga",
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                { "type": "text", "text": "RESULT ANNOUNCEMENT", "weight": "bold", "color": "#1DB446", "size": "xs" },
                { "type": "text", "text": activityName, "weight": "bold", "size": "xl", "margin": "md", "wrap": true },
                { "type": "separator", "margin": "xxl" },
                {
                  "type": "box",
                  "layout": "vertical",
                  "margin": "xxl",
                  "spacing": "sm",
                  "contents": [
                    { "type": "text", "text": teamName, "size": "lg", "weight": "bold", "wrap": true, "color": "#333333" },
                    { "type": "text", "text": schoolName, "size": "sm", "color": "#666666", "wrap": true }
                  ]
                },
                { "type": "separator", "margin": "xxl" },
                {
                  "type": "box",
                  "layout": "horizontal",
                  "margin": "xxl",
                  "contents": [
                    {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        { "type": "text", "text": "คะแนน", "size": "xs", "color": "#aaaaaa" },
                        { "type": "text", "text": `${score}`, "size": "xl", "weight": "bold", "color": "#333333" }
                      ]
                    },
                    {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        { "type": "text", "text": "รางวัล", "size": "xs", "color": "#aaaaaa" },
                        { "type": "text", "text": medalText, "size": "xl", "weight": "bold", "color": medalColor }
                      ]
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                          { "type": "text", "text": "ลำดับที่", "size": "xs", "color": "#aaaaaa" },
                          { "type": "text", "text": rank || "-", "size": "xl", "weight": "bold", "color": "#333333" }
                        ]
                    }
                  ]
                }
              ]
            },
            "footer": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "button",
                  "action": { "type": "uri", "label": "ดูรายละเอียดเพิ่มเติม", "uri": resultUrl },
                  "style": "primary",
                  "color": "#1DB446"
                }
              ]
            }
          }
    };

    // @ts-ignore
    return shareContent(flexMessage, `ผลการแข่งขัน: ${teamName}`, `ผลการแข่งขัน ${activityName}\nทีม: ${teamName}\nคะแนน: ${score} (${medalText})\nดูผล: ${resultUrl}`);
};

// 4. Share Top 3 Result (Leaderboard)
export const shareTop3Result = async (activityName: string, winners: any[], activityId?: string) => {
    const rows = winners.map((w, idx) => {
        let rankColor = "#333333";
        if (idx === 0) rankColor = "#FFD700";
        if (idx === 1) rankColor = "#C0C0C0";
        if (idx === 2) rankColor = "#CD7F32";

        return {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": `${w.rank || idx+1}`, "size": "sm", "color": rankColor, "weight": "bold", "flex": 1, "align": "center" },
              { 
                  "type": "box", "layout": "vertical", "flex": 6,
                  "contents": [
                      { "type": "text", "text": w.name, "size": "sm", "color": "#333333", "weight": "bold", "wrap": true },
                      { "type": "text", "text": w.school, "size": "xxs", "color": "#888888", "wrap": true }
                  ]
              },
              { "type": "text", "text": `${w.score}`, "size": "sm", "color": "#111111", "flex": 2, "align": "end", "weight": "bold" }
            ],
            "margin": "sm"
        };
    });

    const flexMessage = {
        type: "flex",
        altText: `สรุปผล: ${activityName}`,
        contents: {
            "type": "bubble",
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                { "type": "text", "text": "TOP 3 LEADERBOARD", "weight": "bold", "color": "#1DB446", "size": "xs" },
                { "type": "text", "text": activityName, "weight": "bold", "size": "lg", "margin": "md", "wrap": true },
                { "type": "separator", "margin": "lg" },
                {
                  "type": "box",
                  "layout": "horizontal",
                  "margin": "md",
                  "contents": [
                    { "type": "text", "text": "#", "size": "xs", "color": "#aaaaaa", "flex": 1, "align": "center" },
                    { "type": "text", "text": "TEAM", "size": "xs", "color": "#aaaaaa", "flex": 6 },
                    { "type": "text", "text": "PTS", "size": "xs", "color": "#aaaaaa", "flex": 2, "align": "end" }
                  ]
                },
                ...rows
              ]
            }
          }
    };

    // @ts-ignore
    return shareContent(flexMessage, `สรุปผล: ${activityName}`, `สรุปผลการแข่งขัน ${activityName}\n1. ${winners[0]?.name} (${winners[0]?.score})\n2. ${winners[1]?.name} (${winners[1]?.score})\n3. ${winners[2]?.name} (${winners[2]?.score})`);
};

// 5. Share Venue Location
export const shareVenue = async (venue: any) => {
    const mapUrl = venue.locationUrl || '';
    const flexMessage = {
        type: "flex",
        altText: `สถานที่: ${venue.name}`,
        contents: {
            "type": "bubble",
            "hero": venue.imageUrl ? {
                "type": "image",
                "url": venue.imageUrl,
                "size": "full",
                "aspectRatio": "20:13",
                "aspectMode": "cover",
                "action": { "type": "uri", "uri": mapUrl }
            } : undefined,
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    { "type": "text", "text": venue.name, "weight": "bold", "size": "xl" },
                    { "type": "text", "text": venue.description || '', "size": "sm", "color": "#666666", "wrap": true, "margin": "md" },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "margin": "lg",
                        "contents": [
                            { "type": "text", "text": "สิ่งอำนวยความสะดวก", "size": "xs", "color": "#aaaaaa" },
                            { "type": "text", "text": (venue.facilities || []).join(', '), "size": "sm", "color": "#333333", "wrap": true }
                        ]
                    }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "action": { "type": "uri", "label": "นำทาง (Google Maps)", "uri": mapUrl }
                    }
                ]
            }
        }
    };
    // @ts-ignore
    return shareContent(flexMessage, `สถานที่: ${venue.name}`, `สถานที่จัดงาน: ${venue.name}\n${mapUrl}`);
};

// 6. Share Schedule Item
export const shareSchedule = async (
    activityName: string, 
    venueName: string, 
    room: string, 
    date: string, 
    time: string, 
    locationUrl: string = '',
    imageUrl: string = ''
) => {
    const flexMessage = {
        type: "flex",
        altText: `กำหนดการ: ${activityName}`,
        contents: {
            "type": "bubble",
            "hero": imageUrl ? {
                "type": "image",
                "url": imageUrl,
                "size": "full",
                "aspectRatio": "20:13",
                "aspectMode": "cover"
            } : undefined,
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    { "type": "text", "text": "SCHEDULE", "weight": "bold", "color": "#1DB446", "size": "xs" },
                    { "type": "text", "text": activityName, "weight": "bold", "size": "lg", "margin": "md", "wrap": true },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "margin": "lg",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "box", "layout": "baseline", "spacing": "sm",
                                "contents": [
                                    { "type": "text", "text": "เวลา", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                    { "type": "text", "text": `${date} | ${time}`, "wrap": true, "color": "#666666", "size": "sm", "flex": 4 }
                                ]
                            },
                            {
                                "type": "box", "layout": "baseline", "spacing": "sm",
                                "contents": [
                                    { "type": "text", "text": "สถานที่", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                    { "type": "text", "text": `${venueName} ${room}`, "wrap": true, "color": "#666666", "size": "sm", "flex": 4 }
                                ]
                            }
                        ]
                    }
                ]
            },
            "footer": locationUrl ? {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    { "type": "button", "style": "secondary", "action": { "type": "uri", "label": "ดูแผนที่", "uri": locationUrl } }
                ]
            } : undefined
        }
    };
    // @ts-ignore
    return shareContent(flexMessage, `กำหนดการ: ${activityName}`, `กิจกรรม: ${activityName}\nเวลา: ${date} ${time}\nสถานที่: ${venueName} ${room}`);
};

// 7. Share Announcement
export const shareAnnouncement = async (
    id: string, 
    title: string, 
    content: string, 
    type: string, 
    date: string, 
    imageUrl: string | null, 
    link: string
) => {
    const appUrl = `${window.location.origin}${window.location.pathname}#/announcements`;
    const flexMessage = {
        type: "flex",
        altText: `ประกาศ: ${title}`,
        contents: {
            "type": "bubble",
            "hero": imageUrl ? {
                "type": "image",
                "url": imageUrl,
                "size": "full",
                "aspectRatio": "20:13",
                "aspectMode": "cover",
                "action": { "type": "uri", "uri": link || appUrl }
            } : undefined,
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    { "type": "text", "text": type === 'news' ? "NEWS" : "ANNOUNCEMENT", "weight": "bold", "color": type === 'news' ? "#E11D48" : "#1DB446", "size": "xs" },
                    { "type": "text", "text": title, "weight": "bold", "size": "xl", "margin": "md", "wrap": true },
                    { "type": "text", "text": new Date(date).toLocaleDateString('th-TH'), "size": "xs", "color": "#aaaaaa", "margin": "sm" },
                    { "type": "text", "text": content, "size": "sm", "color": "#666666", "wrap": true, "margin": "md", "maxLines": 3 }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "action": { "type": "uri", "label": "อ่านเพิ่มเติม", "uri": link || appUrl }
                    }
                ]
            }
        }
    };
    // @ts-ignore
    return shareContent(flexMessage, `ประกาศ: ${title}`, `${title}\n${content}\nอ่านต่อ: ${link || appUrl}`);
};
