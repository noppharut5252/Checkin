
export interface CheckInLocation {
  LocationID: string;
  Name: string;
  Latitude: string;
  Longitude: string;
  RadiusMeters: string;
  Description: string;
  Image?: string; // Primary thumbnail (URL or ID)
  Images?: string; // JSON string of image IDs e.g. '["id1", "id2"]'
  Floor?: string;
  Room?: string;
}

export interface CheckInActivity {
  ActivityID: string;
  LocationID: string;
  Name: string;
  Description: string;
  Status: string;
  StartDateTime?: string;
  EndDateTime?: string;
  Capacity?: number;
  CurrentCount?: number;
  Image?: string; 
  ManualOverride?: 'OPEN' | 'CLOSED' | ''; 
  // Added fields for extended management
  Category?: string;
  Levels?: string;
  Mode?: string;
  ReqTeachers?: number;
  ReqStudents?: number;
  RequirePhoto?: boolean; // New Field: Enforce photo upload
  IsLocked?: boolean; // Cluster Level Lock
  IsAreaLocked?: boolean; // Area Level Lock
  SurveyLink?: string; // New Field: URL for feedback form
}

export interface CheckInUser {
  UserID: string;
  Username?: string;
  Password?: string;
  Prefix?: string;
  Name: string;
  Surname?: string;
  LineID?: string;
  Role: 'admin' | 'user' | string;
  PictureUrl?: string;
  
  userid?: string;
  username?: string;
  password?: string;
  prefix?: string;
  name?: string;
  surname?: string;
  lineId?: string;
  role?: string;
  pictureUrl?: string;
  
  SchoolID?: string; 
  Cluster?: string; 
  schoolId?: string;
  level?: string;
  isGuest?: boolean;
  assignedActivities?: string[];
  displayName?: string;
  tel?: string;
  email?: string;
  avatarFileId?: string;
  userline_id?: string;
}

export interface CheckInLog {
  CheckInID: string;
  UserID: string;
  ActivityID: string;
  LocationID: string;
  Timestamp: string;
  Status: string;
  PhotoURL?: string;
  Comment?: string;
  UserLat?: number;
  UserLng?: number;
  Distance?: number;
  // Enriched fields
  UserName?: string;
  ActivityName?: string;
  LocationName?: string;
  SurveyStatus?: string; // New Field: 'Pending' | 'Done'
}

export type User = CheckInUser;

export interface Activity {
  id: string;
  category: string;
  name: string;
  levels: string;
  mode: string;
  reqTeachers: number;
  reqStudents: number;
  maxTeams: number;
  registrationDeadline: string;
}

export interface Team {
  teamId: string;
  activityId: string;
  teamName: string;
  schoolId: string;
  level: string;
  contact: string;
  members: string; 
  reqInfo?: string;
  status: string | TeamStatus;
  logoUrl?: string;
  teamPhotoId?: string;
  createdBy?: string;
  statusReason?: string;
  score: number;
  medalOverride?: string;
  rank?: string;
  flag?: string;
  stageInfo?: string; 
  stageStatus?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  clusterRemark?: string;
  areaRemark?: string;
}

export enum TeamStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

export interface AreaStageInfo {
  score?: number;
  rank?: string;
  medal?: string;
  name?: string;
  contact?: string;
  members?: string;
}

export interface School {
  SchoolID: string;
  SchoolName: string;
  SchoolCluster: string;
  RegistrationMode: string | RegistrationMode;
  AssignedActivities?: string[];
}

export enum RegistrationMode {
  SELF = 'Self',
  GROUP_ASSIGNED = 'GroupAssigned'
}

export interface SchoolCluster {
  ClusterID: string;
  ClusterName: string;
}

export interface FileLog {
  FileLogID: string;
  TeamID: string;
  FileType: string;
  Status: string;
  FileUrl: string;
  Remarks?: string;
  FileDriveId?: string;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  id?: string;
}

export interface Comment {
    id: string;
    text: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    date: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'news' | 'manual';
  author?: string;
  link?: string;
  clusterId?: string;
  coverImage?: string;
  images?: string[]; 
  attachments?: Attachment[];
  likes?: string[]; 
  comments?: Comment[];
}

export interface VenueSchedule {
  activityId: string;
  activityName: string;
  building?: string;
  floor?: string;
  room: string;
  date: string;
  timeRange: string;
  note?: string;
  level?: 'cluster' | 'area';
  imageUrl?: string;
}

export interface Venue {
  id: string;
  name: string;
  description?: string;
  locationUrl?: string;
  facilities?: string[];
  imageUrl?: string;
  contactInfo?: string;
  scheduledActivities?: VenueSchedule[];
}

export interface Judge {
  id: string;
  activityId: string;
  clusterKey: string;
  clusterLabel: string;
  schoolId: string;
  schoolName: string;
  judgeName: string;
  role: string;
  phone?: string;
  email?: string;
  importedBy?: string;
  importedAt?: string;
  photoUrl?: string;
  stageScope: 'cluster' | 'area';
  originalId?: string;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  backgroundUrl: string;
  headerText: string;
  subHeaderText: string;
  eventName: string;
  frameStyle: string;
  logoLeftUrl: string;
  logoRightUrl: string;
  signatories: { name: string; position: string; signatureUrl: string }[];
  showSignatureLine: boolean;
  dateText: string;
  showRank: boolean;
  serialFormat: string;
  serialStart: number;
  contentTop: number;
  footerBottom: number;
  logoHeight: number;
  signatureSpacing: number;
  signatureImgHeight?: number;
  signatureImgWidth?: number;
  serialTop: number;
  serialRight: number;
  qrBottom: number;
  qrRight: number;
  fontFamily?: string;
  enableTextShadow?: boolean;
  fontHeader?: string;
  fontSubHeader?: string;
  fontName?: string;
  fontDesc?: string;
  fontDate?: string;
  fontSignatures?: string;
}

// --- Passport & Gamification Types ---

export type PassportConditionType = 'specific_activity' | 'total_count' | 'category_count';

export interface PassportRequirement {
    id: string;
    type: PassportConditionType;
    label: string; // Description shown to user
    targetId?: string; // ActivityID or Category Name
    targetValue: number; // e.g. 1 (for specific) or 10 (for count)
}

export interface PassportMission {
    id: string;
    date: string; // YYYY-MM-DD
    title: string;
    description?: string;
    requirements: PassportRequirement[];
    rewardColor: string; // Hex color or class
    rewardLabel: string; // e.g. "Gold Stamp"
    stampImage?: string; // Optional custom stamp URL
    dateScope?: 'specific_date' | 'all_time'; // Default: specific_date
    // New Fields
    maxRedemptions?: number; // 0 or undefined = unlimited
    isVisible?: boolean; // Default true
    conditionLogic?: 'AND' | 'OR'; // Default AND
}

export interface PassportConfig {
    missions: PassportMission[];
}

export interface RedemptionLog {
    UserID: string;
    MissionID: string;
    Timestamp: string;
}

export interface JudgeConfig extends CertificateTemplate {
  officeName?: string;
  commandNumber?: string;
  subject?: string;
  preamble?: string;
  signerName?: string;
  signerPosition?: string;
  margins?: { top: number; bottom: number; left: number; right: number };
  logoUrl?: string;
}

export interface AppConfig {
  menu_live?: boolean;
  menu_teams?: boolean;
  menu_venues?: boolean;
  menu_activities?: boolean;
  menu_score?: boolean;
  menu_results?: boolean;
  menu_documents?: boolean;
  menu_certificates?: boolean;
  menu_judge_certificates?: boolean;
  menu_idcards?: boolean;
  menu_judges?: boolean;
  menu_announcements?: boolean;
  menu_schools?: boolean;
  menu_users?: boolean;
  menu_summary?: boolean;
  menu_passport?: boolean; // New Menu
  [key: string]: boolean | undefined;
}

export interface PrintConfig {}

export interface AppData {
  checkInLocations: CheckInLocation[];
  checkInActivities: CheckInActivity[];
  activities: Activity[];
  teams: Team[];
  schools: School[];
  clusters: SchoolCluster[];
  files: FileLog[];
  announcements: Announcement[];
  venues: Venue[];
  judges: Judge[];
  activityStatus?: any[];
  appConfig?: AppConfig;
  passportConfig?: PassportConfig; 
}
