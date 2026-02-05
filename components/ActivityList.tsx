
import React, { useState, useMemo, useEffect } from 'react';
import { AppData } from '../types';
import { Users, MapPin, Search, Filter, Clock, ChevronRight, GraduationCap, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActivityListProps {
  data: AppData;
}

const ActivitySkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col animate-pulse">
    {/* Image Placeholder */}
    <div className="h-40 bg-gray-200 w-full relative">
        <div className="absolute top-3 left-3 w-16 h-6 bg-gray-300 rounded-lg"></div>
    </div>
    {/* Content */}
    <div className="p-5 flex-1 flex flex-col space-y-3">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
        </div>
    </div>
  </div>
);

const ActivityListSkeleton = () => (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
        {/* Header Skeleton */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 h-10 bg-gray-200 rounded-xl"></div>
                <div className="w-full md:w-64 h-10 bg-gray-200 rounded-xl"></div>
            </div>
        </div>
        
        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <ActivitySkeleton key={i} />)}
        </div>
    </div>
);

const ActivityList: React.FC<ActivityListProps> = ({ data }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      // Simulate loading delay for better UX transition
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
  }, []);

  // Helper for safe date parsing
  const isValidDate = (d: any) => {
      return d && !isNaN(new Date(d).getTime());
  };

  // Merge Data
  const enrichedActivities = useMemo(() => {
    return data.activities.map(act => {
      const checkInInfo = data.checkInActivities.find(c => c.ActivityID === act.id);
      const location = data.checkInLocations.find(l => l.LocationID === checkInInfo?.LocationID);
      
      return {
        ...act,
        checkInInfo,
        location
      };
    });
  }, [data.activities, data.checkInActivities, data.checkInLocations]);

  // Filter
  const filtered = enrichedActivities.filter(act => {
    const matchesSearch = act.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (act.location?.Name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || act.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...Array.from(new Set(data.activities.map(a => a.category)))];

  const getStatus = (act: any) => {
      if (!act.checkInInfo) return null;
      const now = new Date();
      const startStr = act.checkInInfo.StartDateTime;
      const endStr = act.checkInInfo.EndDateTime;

      if (isValidDate(startStr)) {
          const start = new Date(startStr);
          if (start > now) return { label: 'ยังไม่เริ่ม', color: 'bg-blue-100 text-blue-700' };
      }
      
      if (isValidDate(endStr)) {
          const end = new Date(endStr);
          if (end < now) return { label: 'จบแล้ว', color: 'bg-gray-100 text-gray-500' };
      }
      
      return { label: 'กำลังแข่งขัน', color: 'bg-green-100 text-green-700' };
  };

  if (isLoading) {
      return <ActivityListSkeleton />;
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header & Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center font-kanit">
                    <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                    รายการแข่งขัน (Competition List)
                </h2>
                <p className="text-gray-500 text-sm mt-1">ค้นหารายการแข่งขันและดูรายละเอียดสถานที่จัดงาน</p>
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="ค้นหากิจกรรม..." 
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="w-full md:w-64">
                <div className="relative">
                    <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <select 
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none bg-white cursor-pointer"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'ทุกหมวดหมู่' : c}</option>)}
                    </select>
                </div>
            </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((act) => {
            const status = getStatus(act);
            const image = act.checkInInfo?.Image;
            const startTime = act.checkInInfo?.StartDateTime;
            
            return (
                <div key={act.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group flex flex-col h-full">
                    {/* Image / Header */}
                    <div className="h-40 bg-gray-100 relative overflow-hidden">
                        {image ? (
                            <img src={image} alt={act.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${act.mode === 'Team' ? 'from-blue-500 to-indigo-600' : 'from-orange-400 to-red-500'} flex items-center justify-center`}>
                                <Trophy className="w-16 h-16 text-white/20" />
                            </div>
                        )}
                        <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/90 backdrop-blur-sm text-gray-800 shadow-sm border border-white/20">
                                {act.category}
                            </span>
                        </div>
                        {status && (
                            <div className="absolute top-3 right-3">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm ${status.color}`}>
                                    {status.label}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                            {act.name}
                        </h3>
                        
                        <div className="space-y-2 mt-2 mb-4">
                            {act.location && (
                                <div className="flex items-start text-xs text-gray-500">
                                    <MapPin className="w-3.5 h-3.5 mr-2 text-red-500 shrink-0 mt-0.5" />
                                    <span className="line-clamp-1">{act.location.Name}</span>
                                </div>
                            )}
                            <div className="flex items-center text-xs text-gray-500">
                                <Users className="w-3.5 h-3.5 mr-2 text-blue-500 shrink-0" />
                                <span>{act.mode === 'Team' ? 'ประเภททีม' : 'ประเภทเดี่ยว'} ({act.reqStudents} คน)</span>
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                                <GraduationCap className="w-3.5 h-3.5 mr-2 text-green-500 shrink-0" />
                                <span className="truncate">{(act.levels || '').replace(/[\[\]"]/g, '').replace(/,/g, ', ')}</span>
                            </div>
                            {isValidDate(startTime) && (
                                <div className="flex items-center text-xs text-gray-500">
                                    <Clock className="w-3.5 h-3.5 mr-2 text-orange-500 shrink-0" />
                                    <span>
                                        {new Date(startTime).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})} 
                                        {' '}{new Date(startTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                                {act.checkInInfo?.Capacity ? `รับ ${act.checkInInfo.Capacity} ทีม` : 'ไม่จำกัด'}
                            </span>
                            <button 
                                onClick={() => navigate(`/activity-dashboard/${act.id}`)}
                                className="flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
                            >
                                รายละเอียด <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>

      {filtered.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">ไม่พบกิจกรรมที่ค้นหา</p>
          </div>
      )}
    </div>
  );
};

export default ActivityList;
