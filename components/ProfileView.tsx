
import React, { useState, useEffect } from 'react';
import { User, AppData } from '../types';
import { User as UserIcon, Save, School, Shield, Loader2, Link as LinkIcon, CheckCircle, AlertCircle, LayoutGrid, Check, Download } from 'lucide-react';
import { linkLineAccount, registerUser, updateUser } from '../services/api';
import { initLiff, loginLiff } from '../services/liff';
import SearchableSelect from './SearchableSelect';
import { useNavigate } from 'react-router-dom';

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

const ProfileView: React.FC<ProfileViewProps> = ({ user, data, onUpdateUser, isRegistrationMode = false }) => {
  const navigate = useNavigate();
  const [prefix, setPrefix] = useState(user.Prefix || '');
  const [name, setName] = useState(user.Name || '');
  const [surname, setSurname] = useState(user.Surname || '');
  const [tel, setTel] = useState(user.tel || '');
  const [email, setEmail] = useState(user.email || '');
  const [schoolName, setSchoolName] = useState(user.SchoolID || '');
  const [cluster, setCluster] = useState(user.Cluster || '');
  
  // PDPA State
  const [acceptedPdpa, setAcceptedPdpa] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
           onUpdateUser(resultUser);
           setMessage({ type: 'success', text: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
       } else {
           setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก' });
       }
    } catch (err) {
       setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
       setIsSaving(false);
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
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">ข้อมูลส่วนตัว (Profile)</h2>
                <p className="text-gray-500">จัดการข้อมูลผู้ใช้งานและตรวจสอบสถานะบัญชี</p>
            </div>
            <button 
                onClick={() => navigate('/install-guide')}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center text-sm font-medium shadow-sm"
            >
                <Download className="w-4 h-4 mr-2" /> ติดตั้งแอป
            </button>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
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
