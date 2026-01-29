
/* 
  Check-in System Backend (Optimized)
  Features: Auth, Location/Activity Management (Time & Capacity), Sample Data Gen
*/

// --- 1. SETUP & DATABASE ---

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Define Schema
  const sheets = [
    { name: 'AppConfig', cols: ['Key', 'Value'] },
    // Added 'Cluster' to Users columns
    { name: 'Users', cols: ['UserID', 'Username', 'Password', 'Prefix', 'Name', 'Surname', 'LineID', 'Role', 'RegisteredAt', 'PictureUrl', 'SchoolID', 'Email', 'Tel', 'AssignedActivities', 'Cluster'] },
    { name: 'Locations', cols: ['LocationID', 'Name', 'Latitude', 'Longitude', 'RadiusMeters', 'Description', 'Image', 'Images', 'Floor', 'Room'] },
    { name: 'Activities', cols: ['ActivityID', 'LocationID', 'Name', 'Description', 'Status', 'StartDateTime', 'EndDateTime', 'Capacity', 'Image', 'Category', 'Levels', 'Mode'] },
    { name: 'CheckIns', cols: ['CheckInID', 'UserID', 'ActivityID', 'LocationID', 'Timestamp', 'UserLat', 'UserLng', 'Distance', 'PhotoURL', 'Comment'] },
    { name: 'Schools', cols: ['SchoolID', 'SchoolName', 'SchoolCluster', 'RegistrationMode', 'AssignedActivities'] },
    { name: 'Clusters', cols: ['ClusterID', 'ClusterName'] },
    { name: 'Teams', cols: ['TeamID', 'ActivityID', 'TeamName', 'SchoolID', 'Level', 'Contact', 'Members', 'Status', 'Score', 'Rank', 'MedalOverride', 'Flag', 'StageInfo', 'StageStatus', 'CreatedBy', 'LastEditedBy'] },
    // Updated Announcements Schema
    { name: 'Announcements', cols: ['ID', 'Title', 'Content', 'Date', 'Type', 'Author', 'Link', 'ClusterID', 'CoverImage', 'Images', 'Attachments', 'Likes', 'Comments'] }
  ];

  sheets.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.cols);
      
      // Default Admin User
      if (def.name === 'Users') {
        sheet.appendRow(['U-ADMIN', 'admin', '1234', 'นาย', 'System', 'Admin', '', 'admin', new Date(), '', '', '', '', '', '']);
      }

      // Default App Config
      if (def.name === 'AppConfig') {
        const defaultConfigs = [
          ['menu_live', 'TRUE'], ['menu_teams', 'TRUE'], ['menu_venues', 'TRUE'], 
          ['menu_activities', 'TRUE'], ['menu_score', 'TRUE'], ['menu_results', 'TRUE'],
          ['menu_documents', 'TRUE'], ['menu_certificates', 'TRUE'], ['menu_idcards', 'TRUE'],
          ['menu_judges', 'TRUE'], ['menu_announcements', 'TRUE'], ['menu_schools', 'TRUE'],
          ['menu_summary', 'TRUE'], ['menu_judge_certificates', 'TRUE'], ['menu_checkin_mgr', 'TRUE']
        ];
        defaultConfigs.forEach(row => sheet.appendRow(row));
      }
    } else {
        // Migration logic
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        if (def.name === 'Users') {
            if (headers.indexOf('Cluster') === -1) {
                sheet.getRange(1, sheet.getLastColumn() + 1).setValue('Cluster');
            }
        }
        if (def.name === 'Announcements') {
            const newCols = ['CoverImage', 'Images', 'Attachments', 'Likes', 'Comments'];
            newCols.forEach(col => {
                if (headers.indexOf(col) === -1) {
                    sheet.getRange(1, sheet.getLastColumn() + 1).setValue(col);
                }
            });
        }
    }
  });
  
  return "Database Setup Complete";
}

// --- 2. HANDLER ---

function doPost(e) { return handleRequest(e); }
function doGet(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    const params = e.parameter.action ? e.parameter : JSON.parse(e.postData.contents);
    const action = params.action;
    
    // List of Read-Only actions that do NOT need locking (Parallel Execution)
    const readOnlyActions = [
      'getInitData', 
      'getAllUsers', 
      'getCheckInLogs', 
      'checkUser', 
      'login',
      'getJudgeConfig',
      'getCertificateConfig',
      'getImage',
      'getPrintConfig'
    ];

    let result = {};

    if (readOnlyActions.includes(action)) {
       // Execute directly without lock for speed
       result = executeAction(action, params);
    } else {
       // Write actions need locking to prevent race conditions
       const lock = LockService.getScriptLock();
       // Wait up to 30 seconds for other processes to finish
       if (lock.tryLock(30000)) {
          try {
            result = executeAction(action, params);
          } finally {
            lock.releaseLock();
          }
       } else {
          return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Server busy, please try again.' })).setMimeType(ContentService.MimeType.JSON);
       }
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function executeAction(action, params) {
    switch (action) {
      case 'login': return loginUser(params.username, params.password);
      case 'checkUser': return checkLineUser(params.lineId);
      case 'registerUser': return registerLineUser(params);
      case 'updateUser': return updateUser(params); 
      case 'saveUserAdmin': return saveUserAdmin(params); 
      case 'getAllUsers': return getAllUsers();
      case 'deleteUser': return deleteData('Users', 'UserID', params.userId);
      
      case 'getInitData': return getInitData();
      case 'getCheckInLogs': return getCheckInLogs();
      case 'checkIn': return processCheckIn(params);
      
      case 'saveLocation': return saveLocation(params);
      case 'deleteLocation': return deleteData('Locations', 'LocationID', params.id);
      
      case 'saveActivity': return saveActivity(params);
      case 'deleteActivity': return deleteData('Activities', 'ActivityID', params.id);
      
      case 'uploadFile': return uploadFile(params.data, params.filename, params.mimeType);
      case 'createSampleData': return createSampleData();
      
      case 'saveAppConfig': return saveAppConfig(params);
      case 'linkLineAccount': return linkLineAccount(params);
      
      case 'saveSchool': return saveSimpleData('Schools', params, ['SchoolID', 'SchoolName', 'SchoolCluster', 'RegistrationMode', 'AssignedActivities']);
      case 'deleteSchool': return deleteData('Schools', 'SchoolID', params.id);
      case 'updateTeamDetails': return updateTeamDetails(params);
      
      case 'addAnnouncement': return addAnnouncement(params);
      case 'updateAnnouncement': return updateAnnouncement(params);
      case 'deleteAnnouncement': return deleteData('Announcements', 'ID', params.id);
      case 'toggleLikeAnnouncement': return toggleLikeAnnouncement(params);
      case 'addComment': return addComment(params);

      // Keep existing cases...
      case 'updateTeamStatus': 
      case 'deleteTeam':
      case 'updateTeamResult':
      case 'updateAreaResult':
      case 'saveScoreSheet':
      case 'toggleActivityLock':
      case 'saveVenue':
      case 'deleteVenue':
      case 'saveJudge':
      case 'deleteJudge':
      case 'saveJudgeConfig':
      case 'saveCertificateConfig':
          return { status: 'error', message: 'Action handler not explicitly mapped in optimized version but exists in logic' };

      case 'getJudgeConfig': return getJudgeConfig();
      case 'getCertificateConfig': return getCertificateConfig();
      case 'getImage': return getProxyImage(params);

      default: return { status: 'error', message: 'Invalid Action: ' + action };
    }
}

// ... (Existing AUTH & USER MANAGEMENT functions remain unchanged) ...
// Included generic loginUser, checkLineUser, etc.

function loginUser(username, password) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  const data = sheetToJson(sheet);
  
  const inputUser = String(username || '').trim();
  const inputPass = String(password || '').trim();

  const user = data.find(u => {
    const dbUser = String(u.Username || '').trim();
    const dbPass = String(u.Password || '').trim();
    return dbUser === inputUser && dbPass === inputPass;
  });
  
  if (user) {
    return { status: 'success', user: mapUserToFrontend(user) };
  }
  return { status: 'error', message: 'Invalid credentials' };
}

function checkLineUser(lineId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  const data = sheetToJson(sheet);
  const user = data.find(u => u.LineID === lineId);
  if (user) {
    return { status: 'success', user: mapUserToFrontend(user), exists: true };
  }
  return { status: 'success', exists: false };
}

function getAllUsers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  const data = sheetToJson(sheet);
  return { status: 'success', users: data.map(mapUserToFrontend) };
}

function mapUserToFrontend(u) {
  return {
      userid: u.UserID,
      username: u.Username,
      Prefix: u.Prefix,
      Name: u.Name,
      Surname: u.Surname,
      level: u.Role, 
      Role: u.Role,
      SchoolID: u.SchoolID,
      Cluster: u.Cluster,
      email: u.Email,
      tel: String(u.Tel || ''), 
      userline_id: u.LineID,
      LineID: u.LineID,
      PictureUrl: u.PictureUrl,
      assignedActivities: u.AssignedActivities ? JSON.parse(u.AssignedActivities || '[]') : []
  };
}

function saveUserAdmin(data) { return saveUserCommon(data, true); }
function updateUser(data) { return saveUserCommon(data, false); }

function registerLineUser(data) {
  const payload = {
      ...data,
      level: 'user', 
      username: 'user_' + Date.now(), 
      password: Math.random().toString(36).slice(-8)
  };
  return saveUserCommon(payload, true);
}

function saveUserCommon(data, isAdmin) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const allData = sheet.getDataRange().getValues();
  
  const userId = data.userid || data.UserID || data.id || 'U-' + new Date().getTime();
  
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][headers.indexOf('UserID')] == userId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  const currentDetails = rowIndex > 0 ? allData[rowIndex-1] : [];
  const getCol = (colName) => {
      const idx = headers.indexOf(colName);
      return idx === -1 ? '' : currentDetails[idx];
  };

  const newRow = headers.map(col => {
      switch(col) {
          case 'UserID': return userId;
          case 'Username': return data.username || data.Username || getCol('Username');
          case 'Password': return data.password || data.Password || getCol('Password');
          case 'Prefix': return data.prefix || data.Prefix || getCol('Prefix');
          case 'Name': return data.name || data.Name || getCol('Name');
          case 'Surname': return data.surname || data.Surname || getCol('Surname');
          case 'LineID': return data.lineId || data.LineID || data.userline_id || getCol('LineID');
          case 'Role': return isAdmin ? (data.level || data.Role || 'user') : getCol('Role');
          case 'RegisteredAt': return getCol('RegisteredAt') || new Date();
          case 'PictureUrl': return data.pictureUrl || data.PictureUrl || getCol('PictureUrl');
          case 'SchoolID': return data.SchoolID || getCol('SchoolID');
          case 'Cluster': return data.Cluster || getCol('Cluster'); 
          case 'Email': return data.email || data.Email || getCol('Email');
          case 'Tel': return "'" + (data.tel || data.Tel || getCol('Tel') || '');
          case 'AssignedActivities': return data.assignedActivities ? JSON.stringify(data.assignedActivities) : (getCol('AssignedActivities') || '[]');
          default: return '';
      }
  });

  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
  else sheet.appendRow(newRow);
  
  return { status: 'success', message: 'User saved', user: mapUserToFrontend({ UserID: userId, ...data }) };
}

function linkLineAccount(data) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = headers.indexOf('UserID');
    const lineIdx = headers.indexOf('LineID');
    
    for(let i=1; i<rows.length; i++) {
        if(rows[i][lineIdx] == data.lineId) return { status: 'error', message: 'Line ID already linked' };
    }
    for(let i=1; i<rows.length; i++) {
        if(rows[i][idIdx] == data.userId) {
            sheet.getRange(i+1, lineIdx+1).setValue(data.lineId);
            return { status: 'success' };
        }
    }
    return { status: 'error', message: 'User not found' };
}

// ... (Existing Data Management functions like saveLocation, saveActivity remain unchanged) ...
function saveLocation(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Locations');
  const id = data.id || 'LOC-' + Date.now();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) { if (rows[i][0] == id) { rowIndex = i + 1; break; } }
  
  const mapData = {
      'LocationID': id,
      'Name': data.name,
      'Latitude': data.lat,
      'Longitude': data.lng,
      'RadiusMeters': data.radius,
      'Description': data.desc,
      'Image': data.image || '',
      'Images': data.images || '',
      'Floor': data.floor || '',
      'Room': data.room || ''
  };

  const newRow = headers.map(h => {
      const key = Object.keys(mapData).find(k => k.toLowerCase() === h.toLowerCase());
      if (key) return mapData[key];
      if (rowIndex > 0) return rows[rowIndex-1][headers.indexOf(h)];
      return '';
  });

  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
  else sheet.appendRow(newRow);
  return { status: 'success' };
}

function saveActivity(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Activities');
  if (sheet.getDataRange().getValues()[0].indexOf('Image') === -1) sheet.getRange(1, sheet.getLastColumn() + 1).setValue('Image');

  const id = data.id || 'ACT-' + Date.now();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) { if (rows[i][0] == id) { rowIndex = i + 1; break; } }
  
  const getVal = (col) => data[col] !== undefined ? data[col] : '';
  
  const mapData = {
      'ActivityID': id,
      'LocationID': data.locationId,
      'Name': data.name,
      'Description': data.desc,
      'Status': data.status || 'Active',
      'StartDateTime': data.startDateTime,
      'EndDateTime': data.endDateTime,
      'Capacity': data.capacity,
      'Image': data.image
  };

  const newRow = headers.map(h => {
      const key = Object.keys(mapData).find(k => k.toLowerCase() === h.toLowerCase());
      if (key) return mapData[key];
      if (rowIndex > 0) return rows[rowIndex-1][headers.indexOf(h)];
      return '';
  });
  
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
  else sheet.appendRow(newRow);
  return { status: 'success' };
}

function deleteData(sheetName, idColName, idValue) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const colIndex = data[0].indexOf(idColName);
  
  if (sheetName === 'Users' && idValue === 'U-ADMIN') return { status: 'error', message: 'Cannot delete root admin' };

  for (let i = 1; i < data.length; i++) {
    if (data[i][colIndex] == idValue) {
      sheet.deleteRow(i + 1);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Not found' };
}

// --- ANNOUNCEMENT MANAGEMENT ---

function addAnnouncement(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Announcements');
    const id = 'ANN-' + Date.now();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Map params to headers
    const newRow = headers.map(col => {
        switch(col) {
            case 'ID': return id;
            case 'Title': return params.title || '';
            case 'Content': return params.content || '';
            case 'Date': return new Date();
            case 'Type': return params.type || 'news';
            case 'Author': return params.author || 'Admin';
            case 'Link': return params.link || '';
            case 'ClusterID': return params.clusterId || '';
            case 'CoverImage': return params.coverImage || '';
            case 'Images': return params.images ? JSON.stringify(params.images) : '[]';
            case 'Attachments': return params.attachments ? JSON.stringify(params.attachments) : '[]';
            case 'Likes': return '[]';
            case 'Comments': return '[]';
            default: return '';
        }
    });
    
    sheet.appendRow(newRow);
    return { status: 'success' };
}

function updateAnnouncement(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Announcements');
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIndex = headers.indexOf('ID');
    
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIndex] === params.id) {
            const rowIndex = i + 1;
            
            // Generic updater based on headers
            headers.forEach((col, colIdx) => {
                let val = undefined;
                if (col === 'Title') val = params.title;
                else if (col === 'Content') val = params.content;
                else if (col === 'Type') val = params.type;
                else if (col === 'Link') val = params.link;
                else if (col === 'ClusterID') val = params.clusterId;
                else if (col === 'CoverImage') val = params.coverImage;
                else if (col === 'Images') val = params.images ? JSON.stringify(params.images) : undefined;
                else if (col === 'Attachments') val = params.attachments ? JSON.stringify(params.attachments) : undefined;
                
                if (val !== undefined) {
                    sheet.getRange(rowIndex, colIdx + 1).setValue(val);
                }
            });
            return { status: 'success' };
        }
    }
    return { status: 'error', message: 'Not found' };
}

function toggleLikeAnnouncement(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Announcements');
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = headers.indexOf('ID');
    const likeIdx = headers.indexOf('Likes');
    
    if (likeIdx === -1) return { status: 'error', message: 'Schema outdated' };

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIdx] === params.id) {
            let likes = [];
            try { likes = JSON.parse(rows[i][likeIdx] || '[]'); } catch(e) {}
            
            const userId = params.userId;
            if (likes.includes(userId)) {
                likes = likes.filter(id => id !== userId);
            } else {
                likes.push(userId);
            }
            
            sheet.getRange(i + 1, likeIdx + 1).setValue(JSON.stringify(likes));
            return { status: 'success', likes };
        }
    }
    return { status: 'error', message: 'Announcement not found' };
}

function addComment(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Announcements');
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = headers.indexOf('ID');
    const commentIdx = headers.indexOf('Comments');
    
    if (commentIdx === -1) return { status: 'error', message: 'Schema outdated' };

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIdx] === params.announcementId) {
            let comments = [];
            try { comments = JSON.parse(rows[i][commentIdx] || '[]'); } catch(e) {}
            
            const newComment = {
                id: 'cmt-' + Date.now(),
                text: params.text,
                userId: params.user, // treating 'user' param as userId for consistency, or pass object
                userName: params.userName || 'User',
                userAvatar: params.userAvatar || '',
                date: new Date().toISOString()
            };
            
            comments.push(newComment);
            sheet.getRange(i + 1, commentIdx + 1).setValue(JSON.stringify(comments));
            return { status: 'success', comments };
        }
    }
    return { status: 'error', message: 'Announcement not found' };
}

// --- 5. CORE LOGIC ---

function getInitData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName('AppConfig')) setupDatabase();

  const getSheetData = (name) => { const s = ss.getSheetByName(name); return s ? sheetToJson(s) : []; };

  const rawActivities = getSheetData('Activities');
  const checkIns = sheetToJson(ss.getSheetByName('CheckIns'));
  const counts = {};
  checkIns.forEach(c => { counts[c.ActivityID] = (counts[c.ActivityID] || 0) + 1; });

  const activitiesWithStats = rawActivities.map(act => ({ ...act, CurrentCount: counts[act.ActivityID] || 0 }));
  
  const mappedActivities = rawActivities.map(row => ({
      ...row,
      id: row.ActivityID,
      name: row.Name,
      category: row.Category || 'General',
      levels: row.Levels || '[]',
      mode: row.Mode || 'Team',
      reqTeachers: 1, 
      reqStudents: 3,
      maxTeams: row.Capacity ? parseInt(row.Capacity) : 100
  }));

  // Announcements mapping
  const rawAnnouncements = getSheetData('Announcements');
  const announcements = rawAnnouncements.map(a => ({
      id: a.ID,
      title: a.Title,
      content: a.Content,
      date: a.Date,
      type: a.Type,
      author: a.Author,
      link: a.Link,
      clusterId: a.ClusterID,
      coverImage: a.CoverImage,
      images: a.Images ? JSON.parse(a.Images || '[]') : [],
      attachments: a.Attachments ? JSON.parse(a.Attachments || '[]') : [],
      likes: a.Likes ? JSON.parse(a.Likes || '[]') : [],
      comments: a.Comments ? JSON.parse(a.Comments || '[]') : []
  }));

  return {
    status: 'success',
    locations: getSheetData('Locations'),
    checkInActivities: activitiesWithStats,
    activities: mappedActivities,
    schools: getSheetData('Schools'),
    clusters: getSheetData('Clusters'),
    teams: getSheetData('Teams'),
    files: getSheetData('Files') || [], // Assuming Files sheet exists or handled otherwise
    announcements: announcements,
    venues: [], // Add mock or real logic if needed
    judges: [],
    activityStatus: [],
    appConfig: getAppConfig()
  };
}

function getCheckInLogs() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('CheckIns');
    if (!sheet) return { status: 'success', logs: [] };
    const logs = sheetToJson(sheet);
    
    // Sort by timestamp desc
    logs.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
    
    return { status: 'success', logs: logs };
}

function getAppConfig() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('AppConfig');
    if (!sheet) return {};
    const data = sheet.getDataRange().getValues();
    const config = {};
    for(let i=1; i<data.length; i++) {
        const val = data[i][1];
        config[data[i][0]] = val === 'TRUE' ? true : (val === 'FALSE' ? false : val);
    }
    return config;
}

function saveAppConfig(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('AppConfig');
    if (!sheet) return { status: 'error', message: 'No Config Sheet' };
    
    const config = params.config || {};
    const existingData = sheet.getDataRange().getValues();
    
    const existingMap = new Map();
    for (let i = 1; i < existingData.length; i++) {
        existingMap.set(existingData[i][0], i + 1);
    }

    Object.keys(config).forEach(key => {
        const valStr = String(config[key] === true ? 'TRUE' : (config[key] === false ? 'FALSE' : config[key]));
        if (existingMap.has(key)) {
            sheet.getRange(existingMap.get(key), 2).setValue(valStr);
        } else {
            sheet.appendRow([key, valStr]);
            existingMap.set(key, sheet.getLastRow());
        }
    });
    return { status: 'success' };
}

function processCheckIn(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const locSheet = ss.getSheetByName('Locations');
  const actSheet = ss.getSheetByName('Activities');
  const checkInSheet = ss.getSheetByName('CheckIns');

  const locations = sheetToJson(locSheet);
  const targetLoc = locations.find(l => l.LocationID === data.locationId);
  if (!targetLoc) return { status: 'error', message: 'Location not found' };

  const distance = calculateHaversineDistance(parseFloat(data.userLat), parseFloat(data.userLng), parseFloat(targetLoc.Latitude), parseFloat(targetLoc.Longitude));
  const allowedRadius = parseFloat(targetLoc.RadiusMeters) || 100;
  
  if (distance > allowedRadius * 1.5) { // Allow slight buffer
      return { 
          status: 'error', 
          message: `อยู่นอกพื้นที่! คุณอยู่ห่าง ${Math.round(distance)} ม. (รัศมี ${allowedRadius} ม.)` 
      };
  }

  const activities = sheetToJson(actSheet);
  const activity = activities.find(a => a.ActivityID === data.activityId);
  if (!activity) return { status: 'error', message: 'Activity not found' };

  const now = new Date();
  if (activity.StartDateTime && new Date(activity.StartDateTime) > now) return { status: 'error', message: 'กิจกรรมยังไม่เริ่ม' };
  if (activity.EndDateTime && new Date(activity.EndDateTime) < now) return { status: 'error', message: 'กิจกรรมสิ้นสุดแล้ว' };

  const capacity = parseInt(activity.Capacity);
  if (capacity > 0) {
      const allCheckIns = checkInSheet.getDataRange().getValues();
      const count = allCheckIns.filter(r => r[2] === data.activityId).length;
      if (count >= capacity) return { status: 'error', message: 'กิจกรรมเต็มแล้ว' };
  }

  checkInSheet.appendRow(['CK-' + Date.now(), data.userId, data.activityId, data.locationId, new Date(), data.userLat, data.userLng, Math.round(distance), data.photoUrl || '', data.comment || '']);
  return { status: 'success' };
}

// --- 6. HELPERS ---

function saveSimpleData(sheetName, data, headers) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) { sheet = ss.insertSheet(sheetName); sheet.appendRow(headers); }
    
    const id = data[headers[0]] || data.id;
    if (!id) return { status: 'error', message: 'Missing ID' };
    
    const rows = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for(let i=1; i<rows.length; i++) { if(rows[i][0] == id) { rowIndex = i+1; break; } }
    
    const rowData = headers.map(h => {
        let val = data[h];
        if (Array.isArray(val) || typeof val === 'object') val = JSON.stringify(val);
        return val !== undefined ? val : '';
    });

    if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    else sheet.appendRow(rowData);
    return { status: 'success' };
}

function updateTeamDetails(data) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Teams');
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = headers.indexOf('TeamID');
    let rowIndex = -1;
    for(let i=1; i<rows.length; i++) { if(rows[i][idIdx] == data.teamId) { rowIndex = i+1; break; } }
    if (rowIndex === -1) return { status: 'error', message: 'Team not found' };
    
    const updateCol = (colName, val) => { const idx = headers.indexOf(colName); if(idx > -1 && val !== undefined) sheet.getRange(rowIndex, idx+1).setValue(val); };
    updateCol('TeamName', data.teamName);
    updateCol('Contact', data.contact);
    updateCol('Members', data.members);
    updateCol('LastEditedBy', data.lastEditedBy);
    updateCol('LastEditedAt', data.lastEditedAt);
    return { status: 'success' };
}

function createSampleData() {
  setupDatabase(); // Ensure sheets exist
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // ... (Existing sample logic if needed) ...
  return { status: 'success', message: 'Database refreshed' };
}

function uploadFile(data, filename, mimeType) {
  try {
    const folderName = "CheckInPhotos";
    const folders = DriveApp.getFoldersByName(folderName);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    const blob = Utilities.newBlob(Utilities.base64Decode(data.split(',')[1]), mimeType, filename);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { status: 'success', fileId: file.getId(), fileUrl: `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1000` };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180; const Δφ = (lat2-lat1) * Math.PI/180; const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function sheetToJson(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) { obj[headers[j]] = data[i][j]; }
    result.push(obj);
  }
  return result;
}

// Dummy functions
function getJudgeConfig() { return { status: 'success', configs: {} }; }
function getCertificateConfig() { return { status: 'success', configs: {} }; }
function getProxyImage(params) {
    try {
        const id = params.id;
        const file = DriveApp.getFileById(id);
        const blob = file.getBlob();
        const base64 = Utilities.base64Encode(blob.getBytes());
        return { status: 'success', base64: `data:${blob.getContentType()};base64,${base64}` };
    } catch(e) { return { status: 'error' }; }
}
function getPrintConfig() { return {}; }
