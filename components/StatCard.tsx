
import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  description?: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, colorClass, description, loading }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-start justify-between hover:shadow-md transition-all duration-300 group">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 min-h-[2rem] flex items-center">
          {loading ? (
            <div className="flex space-x-1.5 p-1">
                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          ) : (
            <span className="animate-in fade-in slide-in-from-bottom-2 duration-500">{value}</span>
          )}
        </h3>
        {description && <p className="text-xs text-gray-400 mt-2">{description}</p>}
      </div>
      <div className={`p-3 rounded-lg ${colorClass} shadow-sm transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105`}>
        {loading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
            <Icon className="w-6 h-6 text-white" />
        )}
      </div>
    </div>
  );
};

export default StatCard;
