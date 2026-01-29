
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { loginStandardUser } from '../services/api';
import { loginLiff } from '../services/liff';
import { Trophy, User as UserIcon, Lock, Loader2, CheckCircle, ArrowRight, AlertCircle, LogIn } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<'line' | 'standard'>('line');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Login State Machine
  const [loginStatus, setLoginStatus] = useState<'idle' | 'verifying' | 'success' | 'redirecting'>('idle');

  const handleLineLogin = () => {
    loginLiff();
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginStatus('verifying');
    
    try {
        // Step 1: Verify
        const user = await loginStandardUser(username, password);
        
        if (user) {
            // Step 2: Success UI
            setLoginStatus('success');
            
            // Step 3: Redirect logic
            setTimeout(() => {
                setLoginStatus('redirecting');
                onLoginSuccess(user);
                
                // Force navigation to Dashboard
                setTimeout(() => {
                    navigate('/home', { replace: true });
                }, 500);
            }, 800);
        } else {
            setLoginStatus('idle');
            setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
    } catch (err) {
        setLoginStatus('idle');
        setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // --- Render Loading/Success Overlay ---
  if (loginStatus !== 'idle') {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 font-kanit animate-in fade-in duration-300">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border-t-8 border-[#00247D]">
                  <div className="mb-6 relative h-20 w-20 mx-auto flex items-center justify-center">
                      {/* Animated Circle Background */}
                      <div className={`absolute inset-0 rounded-full opacity-20 ${loginStatus === 'success' || loginStatus === 'redirecting' ? 'bg-[#00247D]' : 'bg-[#EF3340] animate-ping'}`}></div>
                      
                      {/* Icon */}
                      <div className={`relative z-10 bg-white p-4 rounded-full shadow-sm border-2 transition-all duration-500 ${loginStatus === 'success' || loginStatus === 'redirecting' ? 'border-[#00247D]' : 'border-red-100'}`}>
                          {loginStatus === 'verifying' && <Loader2 className="w-10 h-10 text-[#00247D] animate-spin" />}
                          {(loginStatus === 'success' || loginStatus === 'redirecting') && <CheckCircle className="w-10 h-10 text-[#00247D] animate-in zoom-in duration-300" />}
                      </div>
                  </div>

                  <h3 className="text-xl font-bold text-[#00247D] mb-2">
                      {loginStatus === 'verifying' && 'กำลังตรวจสอบข้อมูล...'}
                      {loginStatus === 'success' && 'เข้าสู่ระบบสำเร็จ!'}
                      {loginStatus === 'redirecting' && 'กำลังเข้าสู่ Dashboard...'}
                  </h3>
                  
                  <p className="text-gray-500 text-sm mb-6">
                      {loginStatus === 'verifying' && 'กรุณารอสักครู่ ระบบกำลังยืนยันตัวตน'}
                      {loginStatus === 'success' && 'ยินดีต้อนรับกลับเข้าสู่ระบบ'}
                      {loginStatus === 'redirecting' && 'เตรียมพร้อมจัดการข้อมูลการแข่งขัน'}
                  </p>
              </div>
          </div>
      );
  }

  // --- Render Login Form ---
  return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center px-4 font-kanit relative overflow-hidden">
        
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#00247D] to-slate-100 opacity-10 pointer-events-none"></div>

        <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 relative z-10">
            
            {/* Thai Flag Header Design */}
            <div className="flex h-2 w-full">
                <div className="flex-1 bg-[#EF3340]"></div>
                <div className="flex-1 bg-white"></div>
                <div className="flex-[2] bg-[#00247D]"></div>
                <div className="flex-1 bg-white"></div>
                <div className="flex-1 bg-[#EF3340]"></div>
            </div>

            <div className="bg-[#00247D] p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="absolute -right-6 -top-6 text-white/5 transform rotate-12">
                    <Trophy className="w-40 h-40" />
                </div>

                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg relative z-10 border-4 border-[#EF3340]">
                    <Trophy className="w-10 h-10 text-[#FFC107]" /> {/* Gold Trophy */}
                </div>
                <h1 className="text-2xl font-bold text-white relative z-10 tracking-wide">CompManager</h1>
                <p className="text-blue-100 text-sm mt-1 relative z-10 font-light">ระบบบริหารจัดการการแข่งขันวิชาการ</p>
            </div>

            <div className="p-8">
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button 
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMethod === 'line' ? 'bg-white text-[#06C755] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setLoginMethod('line')}
                    >
                        LINE Login
                    </button>
                    <button 
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMethod === 'standard' ? 'bg-white text-[#00247D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setLoginMethod('standard')}
                    >
                        สำหรับ Admin
                    </button>
                </div>

                {loginMethod === 'line' ? (
                    <div className="text-center py-6 animate-in fade-in">
                        <p className="text-gray-600 mb-6 text-sm">เข้าใช้งานสะดวกรวดเร็วสำหรับผู้ใช้งานทั่วไป<br/>ครู และ นักเรียน</p>
                        <button 
                            onClick={handleLineLogin}
                            className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg active:scale-95 group"
                        >
                            <span className="mr-2 text-lg">เข้าสู่ระบบด้วย LINE</span>
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleStandardLogin} className="space-y-5 animate-in fade-in">
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-600 ml-1">ชื่อผู้ใช้งาน (Username)</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
                                    <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-[#00247D]" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="block w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00247D] focus:border-transparent outline-none transition-all bg-white"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-600 ml-1">รหัสผ่าน (Password)</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
                                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#00247D]" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00247D] focus:border-transparent outline-none transition-all bg-white"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {loginError && (
                            <div className="flex items-center justify-center p-3 bg-red-50 text-[#EF3340] rounded-lg text-xs font-medium animate-in slide-in-from-top-2 border border-red-100">
                                <AlertCircle className="w-4 h-4 mr-1.5" />
                                {loginError}
                            </div>
                        )}

                        <button 
                            type="submit"
                            className="w-full bg-[#00247D] hover:bg-[#001b5e] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-900/20 active:scale-95 mt-4"
                        >
                            <LogIn className="w-5 h-5 mr-2" /> เข้าสู่ระบบ
                        </button>
                    </form>
                )}
                
                <div className="mt-8 text-center">
                    <button onClick={() => { navigate('/home'); }} className="text-xs text-gray-400 hover:text-[#00247D] hover:underline transition-colors">
                        เข้าใช้งานแบบบุคคลทั่วไป (Guest Mode)
                    </button>
                </div>
            </div>
            
            {/* Footer Stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#EF3340] via-[#00247D] to-[#EF3340]"></div>
        </div>
      </div>
  );
};

export default LoginScreen;
