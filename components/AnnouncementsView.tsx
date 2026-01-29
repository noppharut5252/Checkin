
import React, { useState, useEffect, useRef } from 'react';
import { AppData, User, Announcement, Attachment } from '../types';
import { Megaphone, Calendar, User as UserIcon, Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Upload, FileText, Download, Loader2, Heart, MessageCircle, Send, MoreHorizontal } from 'lucide-react';
import { addAnnouncement, updateAnnouncement, deleteAnnouncement, uploadImage, uploadFile, toggleLikeAnnouncement, addComment } from '../services/api';
import { resizeImage } from '../services/utils';

interface AnnouncementsViewProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ data, user, onDataUpdate }) => {
  const [activeTab, setActiveTab] = useState<'news' | 'manual'>('news');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  
  // Admin States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Announcement>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Comment State
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.Role === 'admin';

  // --- Handlers: Admin CRUD ---

  const handleCreate = () => {
      setEditForm({
          title: '', content: '', type: activeTab, link: '', 
          attachments: [], images: [], coverImage: ''
      });
      setIsEditing(true);
  };

  const handleEdit = (ann: Announcement) => {
      setEditForm({ ...ann });
      setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
      if (!confirm('ยืนยันการลบข่าวนี้?')) return;
      await deleteAnnouncement(id);
      onDataUpdate();
      setSelectedAnnouncement(null);
  };

  const handleSave = async () => {
      if (!editForm.title || !editForm.content) return alert('กรุณากรอกหัวข้อและเนื้อหา');
      
      setIsSaving(true);
      try {
          if (editForm.id) {
              await updateAnnouncement(editForm);
          } else {
              await addAnnouncement(
                  editForm.title!, editForm.content!, editForm.type || 'news', 
                  editForm.link || '', user?.Name || 'Admin', '', 
                  editForm.attachments || [],
                  editForm.coverImage,
                  editForm.images
              );
          }
          onDataUpdate();
          setIsEditing(false);
      } catch (e) {
          alert('เกิดข้อผิดพลาด');
      } finally {
          setIsSaving(false);
      }
  };

  // --- Handlers: Upload ---

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      try {
          const base64 = await resizeImage(file, 800, 450, 0.9);
          const res = await uploadImage(base64, `cover_${Date.now()}.jpg`);
          if (res.status === 'success') {
              setEditForm(prev => ({ ...prev, coverImage: res.fileUrl }));
          }
      } catch (e) { console.error(e); } finally { setIsUploading(false); }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      setIsUploading(true);
      try {
          const newImages: string[] = [];
          for (let i = 0; i < files.length; i++) {
              const base64 = await resizeImage(files[i], 800, 800, 0.8);
              const res = await uploadImage(base64, `img_${Date.now()}_${i}.jpg`);
              if (res.status === 'success') newImages.push(res.fileUrl);
          }
          setEditForm(prev => ({ ...prev, images: [...(prev.images || []), ...newImages] }));
      } catch (e) { console.error(e); } finally { setIsUploading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      setIsUploading(true);
      try {
          const newAtt: Attachment[] = [];
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              // Convert to base64 generic
              const reader = new FileReader();
              const base64 = await new Promise<string>((resolve) => {
                  reader.onload = () => resolve(reader.result as string);
                  reader.readAsDataURL(file);
              });
              
              const res = await uploadFile(base64, file.name, file.type);
              if (res.status === 'success') {
                  newAtt.push({ name: file.name, url: res.fileUrl, type: file.type, id: res.fileId });
              }
          }
          setEditForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...newAtt] }));
      } catch (e) { console.error(e); } finally { setIsUploading(false); }
  };

  // --- Handlers: Interaction ---

  const handleLike = async (ann: Announcement) => {
      if (!user) return alert('กรุณาเข้าสู่ระบบก่อน');
      
      // Optimistic Update
      const currentLikes = ann.likes || [];
      const isLiked = currentLikes.includes(user.userid!);
      const newLikes = isLiked ? currentLikes.filter(id => id !== user.userid) : [...currentLikes, user.userid!];
      
      // Update local state immediately for responsiveness
      const updatedAnn = { ...ann, likes: newLikes };
      if (selectedAnnouncement?.id === ann.id) setSelectedAnnouncement(updatedAnn);
      
      // In a real app with Redux/Context, we'd update global state here too. 
      // For now, we rely on refetch but user sees immediate change in modal.
      
      await toggleLikeAnnouncement(ann.id, user.userid!);
      onDataUpdate();
  };

  const handleComment = async () => {
      if (!user || !selectedAnnouncement || !commentText.trim()) return;
      setIsSendingComment(true);
      try {
          await addComment(selectedAnnouncement.id, commentText, user.userid!, user.Name || 'User', user.PictureUrl);
          setCommentText('');
          onDataUpdate();
          // Update local view
          const newComment = {
              id: 'temp-' + Date.now(),
              text: commentText,
              userId: user.userid!,
              userName: user.Name || 'User',
              userAvatar: user.PictureUrl,
              date: new Date().toISOString()
          };
          setSelectedAnnouncement(prev => prev ? ({ ...prev, comments: [...(prev.comments || []), newComment] }) : null);
      } catch (e) {
          alert('ส่งคอมเมนต์ไม่สำเร็จ');
      } finally {
          setIsSendingComment(false);
      }
  };

  // --- Filtered List ---
  const list = data.announcements.filter(a => a.type === activeTab).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Megaphone className="w-6 h-6 mr-2 text-blue-600" />
                    ข่าวสารและคู่มือ
                </h2>
                <p className="text-sm text-gray-500">ติดตามข่าวสารล่าสุดและคู่มือการใช้งานระบบ</p>
            </div>
            <div className="flex gap-2">
                <div className="bg-gray-100 p-1 rounded-lg flex">
                    <button 
                        onClick={() => setActiveTab('news')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'news' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        ข่าวประชาสัมพันธ์
                    </button>
                    <button 
                        onClick={() => setActiveTab('manual')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'manual' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        คู่มือการใช้งาน
                    </button>
                </div>
                {isAdmin && (
                    <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center shadow-md hover:bg-blue-700">
                        <Plus className="w-5 h-5 mr-1" /> เพิ่มข่าว
                    </button>
                )}
            </div>
        </div>

        {/* List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map(ann => {
                const liked = user && ann.likes?.includes(user.userid!);
                return (
                    <div 
                        key={ann.id} 
                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
                        onClick={() => setSelectedAnnouncement(ann)}
                    >
                        {/* Cover Image */}
                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                            {ann.coverImage ? (
                                <img src={ann.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gradient-to-br from-gray-50 to-gray-200">
                                    <ImageIcon className="w-12 h-12 opacity-50" />
                                </div>
                            )}
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-gray-600 shadow-sm">
                                {new Date(ann.date).toLocaleDateString('th-TH')}
                            </div>
                        </div>
                        
                        <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-lg text-gray-800 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                                {ann.title}
                            </h3>
                            <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">
                                {ann.content}
                            </p>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                    <span className="flex items-center"><Heart className={`w-3.5 h-3.5 mr-1 ${liked ? 'fill-red-500 text-red-500' : ''}`} /> {ann.likes?.length || 0}</span>
                                    <span className="flex items-center"><MessageCircle className="w-3.5 h-3.5 mr-1" /> {ann.comments?.length || 0}</span>
                                </div>
                                <div className="flex items-center text-xs text-gray-500">
                                    <UserIcon className="w-3 h-3 mr-1" /> {ann.author}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Detail Modal */}
        {selectedAnnouncement && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                        <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-2" /> {new Date(selectedAnnouncement.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                            <span className="mx-2">•</span>
                            <UserIcon className="w-4 h-4 mr-2" /> {selectedAnnouncement.author}
                        </div>
                        <div className="flex gap-2">
                            {isAdmin && (
                                <>
                                    <button onClick={() => { handleEdit(selectedAnnouncement); setSelectedAnnouncement(null); }} className="p-2 hover:bg-blue-100 text-blue-600 rounded-full"><Edit2 className="w-5 h-5"/></button>
                                    <button onClick={() => handleDelete(selectedAnnouncement.id)} className="p-2 hover:bg-red-100 text-red-600 rounded-full"><Trash2 className="w-5 h-5"/></button>
                                </>
                            )}
                            <button onClick={() => setSelectedAnnouncement(null)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-6 h-6 text-gray-600"/></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-0">
                        {/* Cover */}
                        {selectedAnnouncement.coverImage && (
                            <div className="w-full h-64 md:h-80 bg-gray-100 relative">
                                <img src={selectedAnnouncement.coverImage} className="w-full h-full object-cover" />
                            </div>
                        )}
                        
                        <div className="p-6 md:p-8 space-y-6">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{selectedAnnouncement.title}</h1>
                            <div className="prose prose-blue max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {selectedAnnouncement.content}
                            </div>

                            {/* Gallery */}
                            {selectedAnnouncement.images && selectedAnnouncement.images.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <h4 className="font-bold text-gray-800 flex items-center"><ImageIcon className="w-5 h-5 mr-2 text-blue-500"/> รูปภาพเพิ่มเติม</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {selectedAnnouncement.images.map((img, idx) => (
                                            <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90" onClick={() => window.open(img, '_blank')}>
                                                <img src={img} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Attachments */}
                            {selectedAnnouncement.attachments && selectedAnnouncement.attachments.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <h4 className="font-bold text-gray-800 flex items-center"><FileText className="w-5 h-5 mr-2 text-orange-500"/> เอกสารแนบ</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {selectedAnnouncement.attachments.map((file, idx) => (
                                            <a 
                                                key={idx} 
                                                href={file.url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="flex items-center p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                                            >
                                                <div className="p-2 bg-white rounded-lg shadow-sm mr-3">
                                                    <FileText className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-700 truncate text-sm">{file.name}</div>
                                                    <div className="text-xs text-gray-400">คลิกเพื่อดาวน์โหลด</div>
                                                </div>
                                                <Download className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions & Comments */}
                    <div className="bg-gray-50 border-t border-gray-200 flex flex-col">
                        {/* Interaction Bar */}
                        <div className="px-6 py-3 flex items-center gap-4 border-b border-gray-200 bg-white">
                            <button 
                                onClick={() => handleLike(selectedAnnouncement)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${user && selectedAnnouncement.likes?.includes(user.userid!) ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                <Heart className={`w-5 h-5 ${user && selectedAnnouncement.likes?.includes(user.userid!) ? 'fill-current' : ''}`} />
                                {selectedAnnouncement.likes?.length || 0}
                            </button>
                            <div className="text-sm text-gray-500 font-medium">
                                {selectedAnnouncement.comments?.length || 0} ความคิดเห็น
                            </div>
                        </div>

                        {/* Comments Area */}
                        <div className="flex-1 max-h-[300px] overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {selectedAnnouncement.comments && selectedAnnouncement.comments.length > 0 ? (
                                selectedAnnouncement.comments.map((cmt, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                                            {cmt.userAvatar ? <img src={cmt.userAvatar} className="w-full h-full object-cover"/> : <UserIcon className="w-4 h-4 text-blue-600"/>}
                                        </div>
                                        <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 max-w-[85%]">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-xs text-gray-800">{cmt.userName}</span>
                                                <span className="text-[10px] text-gray-400">{new Date(cmt.date).toLocaleString('th-TH')}</span>
                                            </div>
                                            <p className="text-sm text-gray-700">{cmt.text}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-400 text-sm py-4">ยังไม่มีความคิดเห็น</div>
                            )}
                        </div>

                        {/* Comment Input */}
                        <div className="p-3 bg-white border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <input 
                                    className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="เขียนความคิดเห็น..."
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleComment()}
                                    disabled={isSendingComment || !user}
                                />
                                <button 
                                    onClick={handleComment}
                                    disabled={!commentText.trim() || isSendingComment || !user}
                                    className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSendingComment ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                                </button>
                            </div>
                            {!user && <p className="text-xs text-red-400 mt-2 text-center">กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Edit Modal */}
        {isEditing && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white w-full max-w-2xl h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg text-gray-800">{editForm.id ? 'แก้ไขข่าว' : 'เพิ่มข่าวใหม่'}</h3>
                        <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-6 h-6 text-gray-500"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <input 
                            className="w-full text-lg font-bold border-b-2 border-gray-200 px-2 py-2 focus:border-blue-500 outline-none" 
                            placeholder="หัวข้อข่าว..."
                            value={editForm.title}
                            onChange={e => setEditForm({...editForm, title: e.target.value})}
                        />
                        
                        <textarea 
                            className="w-full h-40 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            placeholder="รายละเอียดเนื้อหา..."
                            value={editForm.content}
                            onChange={e => setEditForm({...editForm, content: e.target.value})}
                        />

                        {/* Image Managers */}
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">รูปปก (Cover Image)</label>
                                <div className="flex gap-4 items-center">
                                    <div 
                                        className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200"
                                        onClick={() => coverInputRef.current?.click()}
                                    >
                                        {editForm.coverImage ? <img src={editForm.coverImage} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-400"/>}
                                    </div>
                                    <button onClick={() => coverInputRef.current?.click()} className="text-sm text-blue-600 font-medium hover:underline">เปลี่ยนรูป</button>
                                </div>
                                <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">อัลบั้มภาพ (Gallery)</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {editForm.images?.map((img, idx) => (
                                        <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                                            <img src={img} className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setEditForm(prev => ({...prev, images: prev.images?.filter((_, i) => i !== idx)}))}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <div 
                                        onClick={() => galleryInputRef.current?.click()}
                                        className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500"
                                    >
                                        <Plus className="w-6 h-6 mb-1"/>
                                        <span className="text-[10px]">Add</span>
                                    </div>
                                </div>
                                <input type="file" ref={galleryInputRef} multiple className="hidden" accept="image/*" onChange={handleGalleryUpload} />
                            </div>

                            {/* File Attachments */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">ไฟล์แนบ (Attachments)</label>
                                <div className="space-y-2">
                                    {editForm.attachments?.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center overflow-hidden">
                                                <FileText className="w-4 h-4 mr-2 text-gray-500 shrink-0"/>
                                                <span className="text-sm truncate">{file.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => setEditForm(prev => ({...prev, attachments: prev.attachments?.filter((_, i) => i !== idx)}))}
                                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center"
                                    >
                                        <Upload className="w-4 h-4 mr-2"/> อัปโหลดไฟล์
                                    </button>
                                    <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileUpload} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">ยกเลิก</button>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving || isUploading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center shadow-sm hover:bg-blue-700 disabled:opacity-70"
                        >
                            {isSaving || isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                            บันทึก
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AnnouncementsView;
