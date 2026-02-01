
import React, { useState, useEffect } from 'react';
import { User, AppData } from '../types';
import { User as UserIcon, Save, School, Shield, Mail, Phone, Loader2, Link as LinkIcon, CheckCircle, AlertCircle, LogIn, LayoutGrid, Share, MoreVertical, PlusSquare, Smartphone, Check, Globe, Copy, ExternalLink } from 'lucide-react';
import { linkLineAccount, registerUser, updateUser } from '../services/api';
import { initLiff, loginLiff } from '../services/liff';
import SearchableSelect from './SearchableSelect';

interface ProfileViewProps {
  user: User;
  data: AppData;
  onUpdateUser: (updatedUser: User) => void;
  isRegistrationMode?: boolean;
}

const PDPA_TEXT = `
1. **การเก็บรวบรวมข้อมูล**: ระบบจะจัดเก็บข้อมูลส่วนบุคคลของท่าน ได้แก่ ชื่อ-นามสกุล, เบอร์โทรศัพท์, ข้อมูลโรงเรียน/สังกัด และบัญชี LINE (หากมีการเชื่อมต่อ) เพื่อใช้ในการยืนยันตัวตนและบันทึกประวัติการเข้าร่วมกิจกรรม
2. **วัตถุประสงค์**: ข้อมูลของท่านจะถูกใช้สำหรับการบริหารจัดการโครงการโรงเรียนสุจริต การออกเกียรติบัตร และการติดตามผลการดำเนินงานเท่านั้น ไม่มีการนำไปใช้เพื่อการพาณิชย์
3. **การเปิดเผยข้อมูล**: ข้อมูลของท่านอาจถูกแสดงผลในรูปแบบสถิติภาพรวม หรือรายชื่อผู้เข้าร่วมกิจกรรมภายในระบบนี้
4. **สิทธิ์ของท่าน**: ท่านสามารถขอแก้ไข หรือลบข้อมูลของท่านออกจากระบบได้โดยติดต่อผู้ดูแลระบบ
`;

const InstallGuideModal = ({ isOpen, onClose, platform }: { isOpen: boolean, onClose: () => void, platform: 'ios' | 'android' | 'desktop' }) => {
    // Check if running in LINE Browser
    const isLineBrowser = /Line/i.test(navigator.userAgent);
    
    // Initial step: If LINE -> 'switch_browser', Else -> 'install_guide'
    const [step, setStep] = useState<'switch_browser' | 'install_guide'>(isLineBrowser ? 'switch_browser' : 'install_guide');
    const [activeTab, setActiveTab] = useState<'ios' | 'android'>(platform === 'ios' ? 'ios' : 'android');
    const [copyStatus, setCopyStatus] = useState('');

    if (!isOpen) return null;

    const handleOpenExternal = () => {
        const url = window.location.href;
        try {
            // Attempt to use LIFF to open external browser
            // @ts-ignore
            if (typeof liff !== 'undefined') {
                // @ts-ignore
                liff.openWindow({ url: url, external: true });
            } else {
                window.open(url, '_blank');
            }
        } catch (e) {
            window.open(url, '_blank');
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopyStatus('คัดลอกแล้ว!');
        setTimeout(() => setCopyStatus(''), 2000);
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className={`p-6 text-center text-white shrink-0 ${step === 'switch_browser' ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-gradient-to-r from-blue-600 to-indigo-700'}`}>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md border-2 border-white/30">
                        {step === 'switch_browser' ? <Globe className="w-8 h-8 text-white" /> : <Check className="w-8 h-8 text-white" />}
                    </div>
                    <h3 className="text-xl font-bold">{step === 'switch_browser' ? 'เปิดในเบราว์เซอร์หลัก' : 'ลงทะเบียนสำเร็จ!'}</h3>
                    <p className="text-white/90 text-sm mt-1">
                        {step === 'switch_browser' ? 'เพื่อติดตั้งแอปและใช้งานเต็มรูปแบบ' : 'เพื่อความสะดวก กรุณาเพิ่มแอปไว้ที่หน้าจอหลัก'}
                    </p>
                </div>

                {step === 'switch_browser' ? (
                    <div className="p-6 flex-1 bg-gray-50 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm w-full">
                            <p className="text-gray-600 text-sm mb-4">
                                ขณะนี้คุณใช้งานผ่าน <strong>LINE Browser</strong> ซึ่งมีข้อจำกัดในการติดตั้งแอป<br/>กรุณากดปุ่มด้านล่างเพื่อเปิดใน <strong>Chrome</strong> หรือ <strong>Safari</strong>
                            </p>
                            
                            <button 
                                onClick={handleOpenExternal}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 mb-3 active:scale-95 transition-all"
                            >
                                <ExternalLink className="w-5 h-5" /> เปิดใน Chrome / Safari
                            </button>

                            <button 
                                onClick={handleCopyLink}
                                className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-95 transition-all"
                            >
                                <Copy className="w-5 h-5" /> {copyStatus || 'คัดลอกลิงก์'}
                            </button>
                        </div>

                        <button 
                            onClick={() => setStep('install_guide')}
                            className="text-xs text-gray-400 underline hover:text-gray-600"
                        >
                            ข้ามไปดูวิธีติดตั้ง (สำหรับผู้ที่รู้วิธีแล้ว)
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 shrink-0">
                            <button 
                                onClick={() => setActiveTab('ios')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'ios' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="text-lg">🍎</span> iOS (iPhone)
                            </button>
                            <button 
                                onClick={() => setActiveTab('android')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'android' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="text-lg">🤖</span> Android
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                            {activeTab === 'ios' ? (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                        <div className="bg-gray-100 p-2 rounded-lg shrink-0"><Share className="w-6 h-6 text-blue-500" /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">1. กดปุ่มแชร์ (Share)</h4>
                                            <p className="text-xs text-gray-500">ที่แถบเมนูด้านล่างของ Safari</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <div className="h-8 w-0.5 bg-gray-300"></div>
                                    </div>
                                    <div className="flex items-start gap-4 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                        <div className="bg-gray-100 p-2 rounded-lg shrink-0"><PlusSquare className="w-6 h-6 text-gray-600" /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">2. เพิ่มไปยังหน้าจอโฮม</h4>
                                            <p className="text-xs text-gray-500">เลื่อนหาเมนู "Add to Home Screen"</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                        <div className="bg-gray-100 p-2 rounded-lg shrink-0"><MoreVertical className="w-6 h-6 text-gray-600" /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">1. กดเมนู 3 จุด</h4>
                                            <p className="text-xs text-gray-500">ที่มุมขวาบนของ Chrome</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <div className="h-8 w-0.5 bg-gray-300"></div>
                                    </div>
                                    <div className="flex items-start gap-4 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                        <div className="bg-gray-100 p-2 rounded-lg shrink-0"><Smartphone className="w-6 h-6 text-green-600" /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">2. ติดตั้งแอป / เพิ่มลงหน้าจอ</h4>
                                            <p className="text-xs text-gray-500">เลือก "Install App" หรือ "Add to Home screen"</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                            <button 
                                onClick={onClose}
                                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center"
                            >
                                เริ่มใช้งานทันที <div className="ml-2">🚀</div>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const ProfileView: React.FC<ProfileViewProps> = ({ user, data, onUpdateUser, isRegistrationMode = false }) => {
  const [prefix, setPrefix] = useState(user.Prefix || '');
  const [name, setName] = useState(user.Name || '');
  const [surname, setSurname] = useState(user.Surname || '');
  const [tel, setTel] = useState(user.tel || '');
  const [email, setEmail] = useState(user.email || '');
  const [schoolName, setSchoolName] = useState(user.SchoolID || '');
  const [cluster, setCluster] = useState(user.Cluster || '');
  
  // PDPA State
  const [acceptedPdpa, setAcceptedPdpa] = useState(false);
  
  // Install Guide State
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [tempSavedUser, setTempSavedUser] = useState<User | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Detect OS for Guide
  const getMobileOS = () => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    return 'desktop';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRegistrationMode && !acceptedPdpa) {
        setMessage({ type: 'error', text: 'กรุณายอมรับนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)' });
        return;
    }

    if (!cluster) {
        setMessage({ type: 'error', text: 'กรุณาเลือกสังกัด/สำนักงานเขต' });
        return;
    }
    if (!schoolName) {
        setMessage({ type: 'error', text: 'กรุณาระบุชื่อโรงเรียน' });
        return;
    }
    if (!name || !surname) {
        setMessage({ type: 'error', text: 'กรุณาระบุชื่อและนามสกุล' });
        return;
    }

    setIsSaving(true);
    setMessage(null);

    const userData = { 
        ...user, 
        Prefix: prefix, 
        Name: name, 
        Surname: surname, 
        tel, 
        email, 
        SchoolID: schoolName, 
        Cluster: cluster,
        username: user.username,
        lineId: user.LineID || user.userline_id
    };

    try {
       let resultUser = null;
       let success = false;

       if (isRegistrationMode) {
           const res = await registerUser(userData);
           success = res.status === 'success';
           if(success) resultUser = res.user;
       } else {
           success = await updateUser(userData);
           if (success) resultUser = userData;
       }
       
       if (success && resultUser) {
           if (isRegistrationMode) {
               // Show Install Guide first, hold off on onUpdateUser
               setTempSavedUser(resultUser);
               setShowInstallGuide(true);
           } else {
               onUpdateUser(resultUser);
               setMessage({ type: 'success', text: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
           }
       } else {
           setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก' });
       }
    } catch (err) {
       setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
       setIsSaving(false);
    }
  };

  const finishInstallGuide = () => {
      setShowInstallGuide(false);
      if (tempSavedUser) {
          onUpdateUser(tempSavedUser);
      }
  };

  const handleLinkLine = async () => {
      setIsLinking(true);
      setMessage(null);
      try {
          const liffProfile = await initLiff();
          if (!liffProfile) {
              loginLiff(); 
              return;
          }
          const success = await linkLineAccount(user.userid!, liffProfile.userId);
          if (success) {
              const updatedUser = { ...user, userline_id: liffProfile.userId };
              onUpdateUser(updatedUser);
              setMessage({ type: 'success', text: 'เชื่อมต่อบัญชี LINE เรียบร้อยแล้ว' });
          } else {
              setMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อบัญชีได้ หรือบัญชีนี้ถูกใช้ไปแล้ว' });
          }
      } catch (e) {
          setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE' });
      } finally {
          setIsLinking(false);
      }
  };

  const clusterOptions = data.clusters.map(c => ({ label: c.ClusterName, value: c.ClusterID }));
  const prefixOptions = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'ว่าที่ร้อยตรี'];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24">
      
      {/* Install Guide Modal */}
      <InstallGuideModal 
          isOpen={showInstallGuide} 
          onClose={finishInstallGuide} 
          platform={getMobileOS()}
      />

      {/* Registration Mode Header */}
      {isRegistrationMode && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
                  <UserIcon className="w-6 h-6" />
              </div>
              <div>
                  <h3 className="font-bold text-blue-800 text-lg">ลงทะเบียนสมาชิกใหม่</h3>
                  <p className="text-sm text-blue-600 mt-1">ยินดีต้อนรับสู่ UprightSchool! กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วนเพื่อเริ่มใช้งาน</p>
              </div>
          </div>
      )}

      {!isRegistrationMode && (
        <div>
            <h2 className="text-2xl font-bold text-gray-800">ข้อมูลส่วนตัว (Profile)</h2>
            <p className="text-gray-500">จัดการข้อมูลผู้ใช้งานและตรวจสอบสถานะบัญชี</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Summary */}
        <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <div className="relative mb-4 group">
                    {user.PictureUrl || user.avatarFileId ? (
                        <img 
                            src={user.PictureUrl || `https://drive.google.com/thumbnail?id=${user.avatarFileId}`} 
                            alt="Profile" 
                            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                    ) : (
                        <div className="w-32 h-32 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-300 border-4 border-white shadow-lg">
                            <UserIcon className="w-16 h-16" />
                        </div>
                    )}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{name ? `${prefix}${name} ${surname}` : user.username}</h3>
                
                {user.username && user.username !== name && (
                    <p className="text-sm text-gray-500 mb-4 flex items-center justify-center gap-1">
                        <span className="text-green-600 font-bold">LINE Name:</span> {user.username}
                    </p>
                )}
                
                {!isRegistrationMode && (
                    <div className="w-full pt-4 mt-2 border-t border-gray-100">
                        <div className="mb-2 text-xs text-gray-400 font-medium uppercase tracking-wider text-left">LINE Connection</div>
                        {user.LineID || user.userline_id ? (
                            <div className="flex items-center justify-center p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                เชื่อมต่อแล้ว
                            </div>
                        ) : (
                            <button 
                                onClick={handleLinkLine}
                                disabled={isLinking}
                                className="w-full flex items-center justify-center p-3 bg-[#06C755] text-white rounded-lg text-sm font-medium hover:bg-[#05b34c] transition-colors disabled:opacity-70 shadow-sm active:scale-95"
                            >
                                {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                                เชื่อมต่อกับ LINE
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Right Column: Form */}
        <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800">{isRegistrationMode ? 'กรอกข้อมูลส่วนตัว' : 'แก้ไขข้อมูล'}</h3>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
                                <select 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    value={prefix}
                                    onChange={(e) => setPrefix(e.target.value)}
                                >
                                    <option value="">เลือก...</option>
                                    {prefixOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อจริง (Formal Name) *</label>
                                <input 
                                    type="text" required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={name} onChange={(e) => setName(e.target.value)}
                                    placeholder="ชื่อภาษาไทย"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล (Surname) *</label>
                                <input 
                                    type="text" required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={surname} onChange={(e) => setSurname(e.target.value)}
                                    placeholder="นามสกุลภาษาไทย"
                                />
                            </div>
                        </div>

                        {/* Cluster and School Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">สังกัด/สำนักงานเขต *</label>
                                <SearchableSelect 
                                    options={clusterOptions} 
                                    value={cluster} 
                                    onChange={setCluster} 
                                    placeholder="ค้นหาและเลือกสังกัด..." 
                                    icon={<LayoutGrid className="h-4 w-4" />} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">โรงเรียน / หน่วยงาน *</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <School className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input 
                                        type="text"
                                        required
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="ระบุชื่อโรงเรียน..."
                                        value={schoolName}
                                        onChange={(e) => setSchoolName(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                                <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                                <input 
                                    type="tel"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                    value={tel} 
                                    onChange={(e) => setTel(e.target.value.replace(/[^0-9]/g, ''))} 
                                />
                            </div>
                        </div>

                        {/* PDPA Section - Only show for registration */}
                        {isRegistrationMode && (
                            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                                <h4 className="font-bold text-gray-800 flex items-center mb-2">
                                    <Shield className="w-4 h-4 mr-2 text-green-600" />
                                    นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
                                </h4>
                                <div className="bg-white border border-gray-200 rounded-lg p-3 h-32 overflow-y-auto text-xs text-gray-600 leading-relaxed mb-3 shadow-inner custom-scrollbar">
                                    <pre className="whitespace-pre-wrap font-sans">{PDPA_TEXT.trim()}</pre>
                                </div>
                                <label className="flex items-start cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={acceptedPdpa}
                                            onChange={(e) => setAcceptedPdpa(e.target.checked)}
                                        />
                                        <div className="w-5 h-5 border-2 border-gray-300 rounded bg-white peer-checked:bg-green-500 peer-checked:border-green-500 transition-colors"></div>
                                        <Check className="w-3.5 h-3.5 text-white absolute left-0.5 top-0.5 opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="ml-2 text-sm text-gray-700 select-none group-hover:text-gray-900">
                                        ข้าพเจ้ายอมรับข้อตกลงและยินยอมให้ใช้ข้อมูลเพื่อวัตถุประสงค์ดังกล่าว
                                    </span>
                                </label>
                            </div>
                        )}

                        {message && (
                            <div className={`p-4 rounded-lg text-sm flex items-start shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-800 border-l-4 border-green-500' : 'bg-red-50 text-red-800 border-l-4 border-red-500'}`}>
                                {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 text-green-600" /> : <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-red-600" />}
                                <div><p className="font-semibold">{message.type === 'success' ? 'สำเร็จ' : 'ข้อผิดพลาด'}</p><p className="mt-1 text-xs opacity-90">{message.text}</p></div>
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={isSaving || (isRegistrationMode && !acceptedPdpa)} 
                                className="flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : (isRegistrationMode ? <CheckCircle className="w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />)}
                                {isRegistrationMode ? 'ยืนยันการลงทะเบียน' : 'บันทึกการเปลี่ยนแปลง'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
