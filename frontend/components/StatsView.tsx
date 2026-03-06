import React from 'react';
import { SurveyResponse } from '../types';
import { Users, CheckCircle, HeartPulse, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Props {
  data: SurveyResponse[];
  prevData?: SurveyResponse[];
}

function getDeltaPct(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
}

function getAvgWorry(data: SurveyResponse[]) {
  if (!data.length) return 0;
  return data.reduce((acc, curr) => acc + curr.worryLevel, 0) / data.length;
}

// No longer needed, prevData is passed in

export const StatsView: React.FC<Props> = ({ data, prevData = [] }) => {
  const total = data.length;
  const verified = data.filter(d => d.verified).length;
  const anonymous = total - verified;

  // Previous period calculations for Total and Verified
  const prevTotal = prevData.length;
  const prevVerified = prevData.filter(d => d.verified).length;
  const totalDiff = total - prevTotal;
  const totalDiffPct = getDeltaPct(total, prevTotal);
  const totalDiffPctDisplay = `${totalDiff > 0 ? '+' : ''}${totalDiffPct.toFixed(1)}%`;
  const totalIsUp = totalDiff > 0;
  const totalIsDown = totalDiff < 0;

  const verifiedDiff = verified - prevVerified;
  const verifiedDiffPct = getDeltaPct(verified, prevVerified);
  const verifiedDiffPctDisplay = `${verifiedDiff > 0 ? '+' : ''}${verifiedDiffPct.toFixed(1)}%`;
  const verifiedIsUp = verifiedDiff > 0;
  const verifiedIsDown = verifiedDiff < 0;

  // Calculate Avg Worry Level (1-5)
  const avgWorry = getAvgWorry(data);
  const avgWorryDisplay = avgWorry.toFixed(1);

  // Calculate previous period's average worry
  const prevAvgWorry = getAvgWorry(prevData);
  const diff = avgWorry - prevAvgWorry;
  const diffPct = getDeltaPct(avgWorry, prevAvgWorry);
  const diffPctDisplay = `${diff > 0 ? '+' : ''}${diffPct.toFixed(1)}%`;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Total Responses - Green */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between relative overflow-hidden group">
        <div className="relative z-10">
            <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Total Responses</p>
            <div className="flex items-end gap-2">
              <h2 className="text-3xl font-bold text-[#1b4332] mt-1">{total}</h2>
              <span className={`flex items-center text-sm font-bold ml-2 ${totalIsUp ? 'text-red-600' : totalIsDown ? 'text-green-600' : 'text-stone-500'}`}>
                {totalIsUp && <ArrowUpRight className="w-4 h-4 mr-0.5 text-red-600" />}
                {totalIsDown && <ArrowDownRight className="w-4 h-4 mr-0.5 text-green-600" />}
                {(!totalIsUp && !totalIsDown) && <span className="w-4 h-4 mr-0.5"></span>}
                {totalDiffPctDisplay}
              </span>
            </div>
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
            <div className="flex items-end gap-2">
              <h2 className="text-3xl font-bold text-[#1b4332] mt-1">{verified}</h2>
              <span className={`flex items-center text-sm font-bold ml-2 ${verifiedIsUp ? 'text-red-600' : verifiedIsDown ? 'text-green-600' : 'text-stone-500'}`}>
                {verifiedIsUp && <ArrowUpRight className="w-4 h-4 mr-0.5 text-red-600" />}
                {verifiedIsDown && <ArrowDownRight className="w-4 h-4 mr-0.5 text-green-600" />}
                {(!verifiedIsUp && !verifiedIsDown) && <span className="w-4 h-4 mr-0.5"></span>}
                {verifiedDiffPctDisplay}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">{anonymous} Anonymous</p>
        </div>
        <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
            <CheckCircle className="text-blue-500 w-6 h-6" />
        </div>
         <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500"></div>
      </div>

      {/* Avg Worry Level - Orange/Red with highlight */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between relative overflow-hidden group">
        <div className="relative z-10">
            <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Avg Worry Level (1-5)</p>
            <div className="flex items-end gap-2">
              <h2 className="text-3xl font-bold text-[#1b4332] mt-1">{avgWorryDisplay}</h2>
                <span className={`flex items-center text-sm font-bold ml-2 ${isUp ? 'text-red-600' : isDown ? 'text-green-600' : 'text-stone-500'}`}>
                  {diffPctDisplay}
                </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">1=Low, 5=Extreme</p>
        </div>
          <div className="bg-red-50 p-3 rounded-full group-hover:bg-red-100 transition-colors flex items-center justify-center">
              <HeartPulse className="text-red-500 w-6 h-6" />
              <span className="ml-2 flex items-center">
                {isUp && <ArrowUpRight className="w-4 h-4 text-red-600" />}
                {isDown && <ArrowDownRight className="w-4 h-4 text-green-600" />}
                {(!isUp && !isDown) && <span className="w-4 h-4"></span>}
              </span>
          </div>
         <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500"></div>
      </div>

    </div>
  );
};