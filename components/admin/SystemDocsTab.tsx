
import React from 'react';
import { 
    FileText, Database, Server, Code, Layers, CloudLightning, Package, Terminal, 
    AlertTriangle, Workflow, Shield, Globe, FolderTree, GitMerge,
    Share2, Smartphone, Map, HardDrive, Lock, CheckCircle2, XCircle, ArrowRight,
    Palette, BarChart3, Zap, Monitor, Rocket
} from 'lucide-react';

const SystemDocsTab: React.FC = () => {
  const dbSchema = [
    {
      table: 'Users',
      desc: 'เก็บข้อมูลผู้ใช้งานทั้งหมด ทั้ง Admin และ User ทั่วไป',
      cols: ['UserID (PK)', 'Username', 'Password', 'Name', 'Surname', 'Role (admin/user/score)', 'SchoolID', 'LineID', 'PictureUrl']
    },
    {
      table: 'Activities',
      desc: 'เก็บข้อมูลกิจกรรมการแข่งขัน',
      cols: ['ActivityID (PK)', 'Name', 'LocationID (FK)', 'StartDateTime', 'EndDateTime', 'Capacity', 'Category', 'Mode', 'ReqStudents', 'ReqTeachers', 'RequirePhoto', 'IsLocked', 'SurveyLink']
    },
    {
      table: 'CheckIns',
      desc: 'เก็บประวัติการเช็คอิน (Transaction)',
      cols: ['CheckInID (PK)', 'UserID (FK)', 'ActivityID (FK)', 'LocationID (FK)', 'Timestamp', 'UserLat', 'UserLng', 'PhotoURL', 'SurveyStatus']
    },
    {
      table: 'Locations',
      desc: 'เก็บพิกัดสถานที่จัดงาน',
      cols: ['LocationID (PK)', 'Name', 'Latitude', 'Longitude', 'RadiusMeters', 'Image']
    },
    {
      table: 'Teams',
      desc: 'เก็บข้อมูลทีมผู้เข้าแข่งขัน',
      cols: ['TeamID (PK)', 'ActivityID (FK)', 'TeamName', 'SchoolID', 'Members (JSON)', 'Score', 'Rank', 'Status']
    },
    {
      table: 'AppConfig',
      desc: 'เก็บค่าการตั้งค่าระบบ (Key-Value)',
      cols: ['Key', 'Value']
    },
    {
      table: 'SystemFeedback',
      desc: 'เก็บข้อมูลการแจ้งปัญหาและข้อเสนอแนะจากผู้ใช้งาน',
      cols: ['ReportID (PK)', 'UserID', 'Type', 'Subject', 'Detail', 'Image', 'Status', 'Timestamp', 'Priority', 'AdminResponse']
    }
  ];

  const techStack = [
    { name: 'React 18', desc: 'Frontend Library', icon: Code },
    { name: 'Vite', desc: 'Build Tool & Dev Server', icon: CloudLightning },
    { name: 'Tailwind CSS', desc: 'Styling Framework', icon: Palette },
    { name: 'Google Apps Script', desc: 'Backend & API', icon: Server },
    { name: 'Google Sheets', desc: 'Database', icon: Database },
    { name: 'Recharts', desc: 'Data Visualization', icon: BarChart3 },
    { name: 'Lucide React', desc: 'Iconography', icon: Layers },
    { name: 'html2pdf.js', desc: 'PDF Generation', icon: FileText },
  ];

  const rbacData = [
    { feature: 'จัดการผู้ใช้งาน (Manage Users)', admin: true, area: false, group: false, school: false, user: false },
    { feature: 'ตั้งค่าระบบ (System Config)', admin: true, area: true, group: false, school: false, user: false },
    { feature: 'จัดการกิจกรรม/สถานที่', admin: true, area: true, group: false, school: false, user: false },
    { feature: 'บันทึกคะแนน (Score Entry)', admin: true, area: true, group: true, school: false, user: false },
    { feature: 'พิมพ์เกียรติบัตร/บัตรประจำตัว', admin: true, area: true, group: true, school: true, user: false },
    { feature: 'จัดการข้อเสนอแนะ (Feedback)', admin: true, area: true, group: false, school: false, user: false },
    { feature: 'เช็คอินกิจกรรม (Check-in)', admin: true, area: true, group: true, school: true, user: true },
  ];

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-blue-400" />
            System Documentation & Manual
        </h1>
        <p className="text-slate-300">คู่มือสถาปัตยกรรมระบบ โครงสร้างฐานข้อมูล และขั้นตอนการดูแลรักษา (สำหรับผู้ดูแลระบบและนักพัฒนา)</p>
        <div className="flex gap-3 mt-6">
            <span className="bg-blue-500/20 text-blue-200 px-3 py-1 rounded-full text-xs font-mono border border-blue-500/30">Version 1.0.2</span>
            <span className="bg-green-500/20 text-green-200 px-3 py-1 rounded-full text-xs font-mono border border-green-500/30">Status: Stable</span>
        </div>
      </div>

      {/* 1. Architecture */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
            <CloudLightning className="w-6 h-6 mr-2 text-indigo-600" />
            1. สถาปัตยกรรมระบบ (Architecture)
        </h2>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-bold text-slate-700 text-center">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200 w-full md:w-48">
                    <div className="text-blue-600 mb-2"><Monitor className="w-8 h-8 mx-auto"/></div>
                    Client Side<br/>(React / GitHub Pages)
                </div>
                <div className="hidden md:block flex-1 border-t-2 border-dashed border-slate-300 relative top-0 h-0">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-50 px-2 text-slate-400 text-xs">JSON API</span>
                </div>
                <div className="md:hidden">⬇️ JSON API</div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200 w-full md:w-48">
                    <div className="text-green-600 mb-2"><Server className="w-8 h-8 mx-auto"/></div>
                    Server Side<br/>(Google Apps Script)
                </div>
                <div className="hidden md:block flex-1 border-t-2 border-dashed border-slate-300 relative top-0 h-0">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-50 px-2 text-slate-400 text-xs">Read/Write</span>
                </div>
                <div className="md:hidden">⬇️ Read/Write</div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200 w-full md:w-48">
                    <div className="text-green-600 mb-2"><Database className="w-8 h-8 mx-auto"/></div>
                    Database<br/>(Google Sheets)
                </div>
            </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-gray-600 list-disc list-inside">
            <li><strong>Frontend:</strong> ทำงานแบบ SPA (Single Page Application) โฮสต์บน GitHub Pages</li>
            <li><strong>Backend:</strong> ใช้ Google Apps Script (GAS) ทำหน้าที่เป็น API Gateway รับ Request และจัดการ Logic</li>
            <li><strong>Database:</strong> ใช้ Google Sheets เป็นฐานข้อมูลหลัก เพื่อความง่ายในการจัดการและแก้ไขข้อมูลโดยตรง</li>
            <li><strong>Authentication:</strong> ตรวจสอบสิทธิ์ผ่าน LocalStorage และยืนยันกับฐานข้อมูล Users</li>
        </ul>
      </div>

      {/* 2. Database Schema */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
            <Database className="w-6 h-6 mr-2 text-blue-600" />
            2. โครงสร้างฐานข้อมูล (Google Sheets Schema)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dbSchema.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                        <span className="font-bold text-gray-700 flex items-center">
                            <Database className="w-3 h-3 mr-2 text-gray-400"/> {item.table}
                        </span>
                        <span className="text-[10px] bg-white border px-2 py-0.5 rounded text-gray-500">{item.desc}</span>
                    </div>
                    <div className="p-4 bg-white">
                        <div className="flex flex-wrap gap-1">
                            {item.cols.map((col, cIdx) => (
                                <span key={cIdx} className={`text-xs px-2 py-1 rounded border ${col.includes('(PK)') ? 'bg-yellow-50 text-yellow-700 border-yellow-200 font-bold' : col.includes('(FK)') ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                    {col}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* 3. Core System Flows (New) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
            <Workflow className="w-6 h-6 mr-2 text-orange-500" />
            3. กระบวนการทำงานหลัก (Core System Flows)
        </h2>
        <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4 py-1">
                <h3 className="font-bold text-gray-800 text-sm mb-2">3.1 อัลกอริทึมการเช็คอิน (Check-in Logic)</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span className="bg-gray-100 px-3 py-2 rounded-lg">1. สแกน QR Code</span>
                    <ArrowRight className="w-4 h-4 text-gray-400"/>
                    <span className="bg-gray-100 px-3 py-2 rounded-lg">2. ตรวจสอบพิกัด GPS (Haversine Formula)</span>
                    <ArrowRight className="w-4 h-4 text-gray-400"/>
                    <span className="bg-gray-100 px-3 py-2 rounded-lg">3. ตรวจสอบระยะเวลา &amp; ความจุ</span>
                    <ArrowRight className="w-4 h-4 text-gray-400"/>
                    <span className="bg-gray-100 px-3 py-2 rounded-lg">4. ถ่ายรูปยืนยัน (ถ้าบังคับ)</span>
                    <ArrowRight className="w-4 h-4 text-gray-400"/>
                    <span className="bg-green-100 text-green-700 px-3 py-2 rounded-lg border border-green-200 font-bold">5. บันทึกลงฐานข้อมูล</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    * หากระยะห่างเกินรัศมีที่กำหนด (default 100m) ระบบจะปฏิเสธการเช็คอิน
                </p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4 py-1">
                <h3 className="font-bold text-gray-800 text-sm mb-2">3.2 กระบวนการออกเกียรติบัตร (Certificate Generation)</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span className="bg-gray-100 px-3 py-2 rounded-lg">1. ตรวจสอบสถานะทีม (Approved/Ranked)</span>
                    <ArrowRight className="w-4 h-4 text-gray-400"/>
                    <span className="bg-gray-100 px-3 py-2 rounded-lg">2. ดึง Config Template (ตามกลุ่ม/เขต)</span>
                    <ArrowRight className="w-4 h-4 text-gray-400"/>
                    <span className="bg-gray-100 px-3 py-2 rounded-lg">3. สร้าง HTML Canvas</span>
                    <ArrowRight className="w-4 h-4 text-gray-400"/>
                    <span className="bg-gray-100 px-3 py-2 rounded-lg">4. แปลงเป็น PDF (html2pdf)</span>
                </div>
            </div>
        </div>
      </div>

      {/* 4. RBAC Matrix (New) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
            <Shield className="w-6 h-6 mr-2 text-red-500" />
            4. สิทธิ์การใช้งาน (Role-Based Access Control)
        </h2>
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left border rounded-lg">
                <thead className="bg-gray-50 font-bold text-gray-700">
                    <tr>
                        <th className="px-4 py-2 border">Feature / Role</th>
                        <th className="px-4 py-2 border text-center text-purple-600">Admin</th>
                        <th className="px-4 py-2 border text-center text-indigo-600">Area Admin</th>
                        <th className="px-4 py-2 border text-center text-blue-600">Group Admin</th>
                        <th className="px-4 py-2 border text-center text-cyan-600">School Admin</th>
                        <th className="px-4 py-2 border text-center text-gray-600">User</th>
                    </tr>
                </thead>
                <tbody>
                    {rbacData.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 border font-medium text-gray-700">{row.feature}</td>
                            <td className="px-4 py-2 border text-center">{row.admin ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto"/> : <XCircle className="w-4 h-4 text-gray-200 mx-auto"/>}</td>
                            <td className="px-4 py-2 border text-center">{row.area ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto"/> : <XCircle className="w-4 h-4 text-gray-200 mx-auto"/>}</td>
                            <td className="px-4 py-2 border text-center">{row.group ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto"/> : <XCircle className="w-4 h-4 text-gray-200 mx-auto"/>}</td>
                            <td className="px-4 py-2 border text-center">{row.school ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto"/> : <XCircle className="w-4 h-4 text-gray-200 mx-auto"/>}</td>
                            <td className="px-4 py-2 border text-center">{row.user ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto"/> : <XCircle className="w-4 h-4 text-gray-200 mx-auto"/>}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* 5. Integrations (New) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
            <Globe className="w-6 h-6 mr-2 text-blue-500" />
            5. การเชื่อมต่อระบบภายนอก (External Integrations)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-xl bg-green-50 border-green-100 flex flex-col items-center text-center">
                <Smartphone className="w-8 h-8 text-green-600 mb-2"/>
                <h3 className="font-bold text-gray-800 text-sm">LINE LIFF</h3>
                <p className="text-xs text-gray-600 mt-1">Authentication &amp; Sharing</p>
            </div>
            <div className="p-4 border rounded-xl bg-blue-50 border-blue-100 flex flex-col items-center text-center">
                <Database className="w-8 h-8 text-blue-600 mb-2"/>
                <h3 className="font-bold text-gray-800 text-sm">Google Sheets</h3>
                <p className="text-xs text-gray-600 mt-1">Database &amp; API Backend</p>
            </div>
            <div className="p-4 border rounded-xl bg-yellow-50 border-yellow-100 flex flex-col items-center text-center">
                <HardDrive className="w-8 h-8 text-yellow-600 mb-2"/>
                <h3 className="font-bold text-gray-800 text-sm">Google Drive</h3>
                <p className="text-xs text-gray-600 mt-1">Image Storage (Photos)</p>
            </div>
            <div className="p-4 border rounded-xl bg-purple-50 border-purple-100 flex flex-col items-center text-center">
                <Map className="w-8 h-8 text-purple-600 mb-2"/>
                <h3 className="font-bold text-gray-800 text-sm">OpenStreetMap</h3>
                <p className="text-xs text-gray-600 mt-1">Location &amp; GPS Verification</p>
            </div>
        </div>
      </div>

      {/* 6. Project Structure (New) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
            <FolderTree className="w-6 h-6 mr-2 text-slate-600" />
            6. โครงสร้างไฟล์โปรเจกต์ (Project Structure)
        </h2>
        <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-x-auto">
<pre>{`src/
├── components/          # React Components (UI)
│   ├── admin/           # Admin-specific components
│   ├── Dashboard.tsx    # Main Dashboard
│   └── ...
├── services/            # Logic & API
│   ├── api.ts           # Google Apps Script Connection
│   ├── liff.ts          # LINE SDK Integration
│   └── utils.ts         # Helper Functions
├── types.ts             # TypeScript Interfaces (Data Models)
├── App.tsx              # Main Router & Entry Point
└── main.tsx             # ReactDOM Render`}</pre>
        </div>
      </div>

      {/* 7. CI/CD (New) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
            <GitMerge className="w-6 h-6 mr-2 text-pink-500" />
            7. กระบวนการ Deploy อัตโนมัติ (CI/CD)
        </h2>
        <div className="space-y-2 text-sm text-gray-600">
            <p>ระบบใช้ <strong>GitHub Actions</strong> ในการ Build และ Deploy อัตโนมัติเมื่อมีการ Push Code ไปยัง Branch <code>main</code></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Developer Push Code &rarr; GitHub</li>
                <li>Action Trigger: <code>npm install</code> &amp; <code>npm run build</code></li>
                <li>Vite สร้างไฟล์ Static ในโฟลเดอร์ <code>dist/</code></li>
                <li>Deploy ไฟล์ใน <code>dist/</code> ไปยัง Branch <code>gh-pages</code></li>
                <li>เว็บไซต์อัปเดตอัตโนมัติ</li>
            </ol>
        </div>
      </div>

      {/* 8. Installation & Usage */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
            <Terminal className="w-6 h-6 mr-2 text-slate-700" />
            8. การติดตั้งและอัปเดต (Installation)
        </h2>
        <div className="space-y-4">
            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-sm overflow-x-auto">
                <div className="flex gap-2 mb-2 border-b border-slate-700 pb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <p className="text-gray-500"># 1. Clone &amp; Install Dependencies</p>
                <p>$ git clone https://github.com/noppharut5252/Checkin.git</p>
                <p>$ cd Checkin</p>
                <p>$ npm install</p>
                <br/>
                <p className="text-gray-500"># 2. Run Local Development</p>
                <p>$ npm run dev</p>
                <br/>
                <p className="text-gray-500"># 3. Build &amp; Deploy to GitHub Pages</p>
                <p>$ npm run build</p>
                <p>$ git add .</p>
                <p>$ git commit -m "Update system"</p>
                <p>$ git push origin main</p>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                <h4 className="font-bold text-orange-800 flex items-center mb-2">
                    <AlertTriangle className="w-4 h-4 mr-2"/> ข้อควรระวัง (Important Note)
                </h4>
                <p className="text-sm text-orange-700 leading-relaxed">
                    การแก้ไข <strong>code.js</strong> ใน Google Apps Script ต้องทำการ <strong>Deploy New Deployment</strong> ทุกครั้ง และนำ URL ที่ได้มาอัปเดตในไฟล์ <code>services/api.ts</code> (ตัวแปร <code>API_URL</code>) มิฉะนั้น Frontend จะยังคงเรียกใช้เวอร์ชันเก่า
                </p>
            </div>
        </div>
      </div>

      {/* 9. Tech Stack */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
            <Package className="w-6 h-6 mr-2 text-purple-600" />
            9. เทคโนโลยีที่ใช้ (Tech Stack)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {techStack.map((tech, idx) => (
                <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm mr-3 text-gray-700">
                        <tech.icon className="w-5 h-5"/>
                    </div>
                    <div>
                        <div className="font-bold text-gray-800 text-sm">{tech.name}</div>
                        <div className="text-[10px] text-gray-500">{tech.desc}</div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* 10. Roadmap & Limitations (New) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
            <Zap className="w-6 h-6 mr-2 text-yellow-500" />
            10. แผนพัฒนาและข้อจำกัด (Roadmap & Limitations)
        </h2>
        
        <div className="space-y-4">
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-xl">
                <h3 className="font-bold text-orange-800 text-sm flex items-center mb-2">
                    <AlertTriangle className="w-4 h-4 mr-2"/> ข้อจำกัดในเวอร์ชันปัจจุบัน (Current Limitations v1.0.2)
                </h3>
                <ul className="list-disc list-inside text-sm text-orange-700 space-y-1 ml-1">
                    <li><strong>ระบบเกียรติบัตร (Certificates):</strong> ฟังก์ชันการออกเกียรติบัตรอัตโนมัติ (Generate PDF) และการตั้งค่า Template ยังไม่เปิดใช้งานในเวอร์ชันนี้ อยู่ระหว่างการพัฒนา</li>
                    <li><strong>การนำเข้าข้อมูล (Import):</strong> การนำเข้าข้อมูลรายชื่อทีมและผู้เข้าแข่งขันรองรับเฉพาะไฟล์ CSV รูปแบบมาตรฐานเท่านั้น ยังไม่รองรับ Excel (.xlsx) โดยตรง</li>
                    <li><strong>การแจ้งเตือน (Notifications):</strong> ยังไม่มีระบบแจ้งเตือนผ่าน LINE OA อัตโนมัติเมื่อมีการเปลี่ยนแปลงข้อมูล</li>
                </ul>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                <h3 className="font-bold text-blue-800 text-sm flex items-center mb-2">
                    <Rocket className="w-4 h-4 mr-2"/> สิ่งที่จะเพิ่มเติมในเวอร์ชันถัดไป (Future Roadmap v1.1.0+)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                    <div>
                        <ul className="list-disc list-inside space-y-1 ml-1">
                            <li>ระบบออกแบบและพิมพ์เกียรติบัตรออนไลน์ (Certificate Builder)</li>
                            <li>ระบบประเมินผลและให้คะแนนกรรมการผ่านมือถือ (Mobile Scoring)</li>
                            <li>Dashboard สรุปผลการแข่งขันแบบ Real-time แยกตามเขตพื้นที่</li>
                        </ul>
                    </div>
                    <div>
                        <ul className="list-disc list-inside space-y-1 ml-1">
                            <li>รองรับการแนบไฟล์เอกสารหลักฐานการสมัคร (PDF Upload)</li>
                            <li>ระบบจัดการสิทธิ์ผู้ใช้งานที่ละเอียดขึ้น (Granular Permissions)</li>
                            <li>การปรับแต่งธีมสีของแอปพลิเคชัน (Theme Customization)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};

export default SystemDocsTab;
