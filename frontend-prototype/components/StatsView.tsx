import React from 'react';
import { SurveyResponse } from '../types';
import { Users, CheckCircle, HeartPulse } from 'lucide-react';

interface Props {
  data: SurveyResponse[];
}

export const StatsView: React.FC<Props> = ({ data }) => {
  const total = data.length;
  const verified = data.filter(d => d.verified).length;
  const anonymous = total - verified;
  
  // Calculate Avg Worry Level (1-5)
  const avgWorry = (data.reduce((acc, curr) => acc + curr.worryLevel, 0) / total).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      
      {/* Total Responses - Green */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between relative overflow-hidden group">
        <div className="relative z-10">
            <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Total Responses</p>
            <h2 className="text-3xl font-bold text-[#1b4332] mt-1">{total}</h2>
        </div>
        <div className="bg-green-100 p-3 rounded-full group-hover:bg-green-200 transition-colors">
            <Users className="text-[#2E7D32] w-6 h-6" />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-[#84cc16]"></div>
      </div>

      {/* Verified Emails - Blue */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between relative overflow-hidden group">
        <div className="relative z-10">
            <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Verified Emails</p>
            <h2 className="text-3xl font-bold text-[#1b4332] mt-1">{verified}</h2>
            <p className="text-xs text-stone-400 mt-1">{anonymous} Anonymous</p>
        </div>
        <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
            <CheckCircle className="text-blue-500 w-6 h-6" />
        </div>
         <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500"></div>
      </div>

      {/* Avg Worry Level - Orange/Red */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between relative overflow-hidden group">
        <div className="relative z-10">
            <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Avg Worry Level (1-5)</p>
            <h2 className="text-3xl font-bold text-[#1b4332] mt-1">{avgWorry}</h2>
            <p className="text-xs text-stone-400 mt-1">1=Low, 5=Extreme</p>
        </div>
        <div className="bg-red-50 p-3 rounded-full group-hover:bg-red-100 transition-colors">
            <HeartPulse className="text-red-500 w-6 h-6" />
        </div>
         <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500"></div>
      </div>

    </div>
  );
};