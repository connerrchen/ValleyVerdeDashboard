import React from 'react';
import { SurveyResponse } from '../types';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface TimelineViewProps {
  data: SurveyResponse[];
}

interface TimelineEvent {
  date: string;
  month: string;
  respondents: number;
  avgWorry: number;
  criticalAlerts: number;
  topConcern: string;
  percentWorried: number;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ data }) => {
  // Group data by month
  const timelineData = React.useMemo(() => {
    const grouped: { [key: string]: SurveyResponse[] } = {};
    
    data.forEach(response => {
      const date = new Date(response.timestamp);
      const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!grouped[month]) {
        grouped[month] = [];
      }
      grouped[month].push(response);
    });

    // Convert to timeline events
    return Object.entries(grouped).map(([month, responses]) => {
      const worryLevels = responses.map(r => r.worryLevel || 0).filter(w => w > 0);
      const avgWorry = worryLevels.length > 0 ? (worryLevels.reduce((a, b) => a + b, 0) / worryLevels.length) : 0;
      const criticalAlerts = responses.filter(r => r.crisisAlert).length;
      
      // Find top concern
      const allBarriers = responses.flatMap(r => r.affordabilityBarriers || []);
      const barrierCounts: { [key: string]: number } = {};
      allBarriers.forEach(b => {
        barrierCounts[b] = (barrierCounts[b] || 0) + 1;
      });
      const topConcern = Object.entries(barrierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No barriers reported';
      
      const percentWorried = Math.round((responses.filter(r => r.worryLevel >= 7).length / responses.length) * 100);

      return {
        date: month,
        month,
        respondents: responses.length,
        avgWorry: Math.round(avgWorry * 10) / 10,
        criticalAlerts,
        topConcern,
        percentWorried
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  if (timelineData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-stone-200 p-12 text-center">
        <p className="text-stone-500">No timeline data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <div className="bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] text-white rounded-lg p-6">
        <h3 className="text-2xl font-bold mb-2">Community Response Timeline</h3>
        <p className="text-green-100">Track how community food security concerns have evolved over time</p>
      </div>

      {/* Main Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-[#84cc16] to-[#4D7C0F]" />

        {/* Timeline Events */}
        <div className="space-y-8">
          {timelineData.map((event, idx) => (
            <div key={idx} className="ml-24 relative">
              {/* Timeline Dot */}
              <div className="absolute -left-20 top-2 w-6 h-6 bg-[#84cc16] border-4 border-white rounded-full shadow-lg" />
              
              {/* Event Card */}
              <div className="bg-white border border-stone-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                {/* Month Header */}
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-stone-100">
                  <div>
                    <h4 className="text-lg font-bold text-[#1b4332]">{event.month}</h4>
                    <p className="text-sm text-stone-500">{event.respondents} respondent{event.respondents !== 1 ? 's' : ''}</p>
                  </div>
                  {event.criticalAlerts > 0 && (
                    <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg">
                      <AlertCircle className="text-red-600" size={18} />
                      <span className="text-sm font-semibold text-red-600">{event.criticalAlerts} Critical</span>
                    </div>
                  )}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Worry Level */}
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-xs text-orange-700 font-semibold uppercase mb-1">Avg Worry Level</p>
                    <p className="text-3xl font-bold text-orange-600">{event.avgWorry}</p>
                    <p className="text-xs text-orange-600 mt-1">/10</p>
                  </div>

                  {/* Percent Worried */}
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-xs text-red-700 font-semibold uppercase mb-1">Highly Worried</p>
                    <p className="text-3xl font-bold text-red-600">{event.percentWorried}%</p>
                    <p className="text-xs text-red-600 mt-1">7+ concern level</p>
                  </div>

                  {/* Critical Alerts */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-xs text-purple-700 font-semibold uppercase mb-1">Crisis Cases</p>
                    <p className="text-3xl font-bold text-purple-600">{event.criticalAlerts}</p>
                    <p className="text-xs text-purple-600 mt-1">immediate need</p>
                  </div>

                  {/* Respondents */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-xs text-blue-700 font-semibold uppercase mb-1">Survey Count</p>
                    <p className="text-3xl font-bold text-blue-600">{event.respondents}</p>
                    <p className="text-xs text-blue-600 mt-1">responses</p>
                  </div>
                </div>

                {/* Top Concern */}
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-600 font-semibold uppercase mb-2">Top Barrier</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#84cc16]" />
                    <p className="text-sm text-stone-700">{event.topConcern}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="bg-gradient-to-br from-green-50 to-lime-50 rounded-lg p-6 border border-green-200">
          <p className="text-sm text-green-700 font-semibold uppercase mb-2">Total Period</p>
          <p className="text-2xl font-bold text-[#1b4332]">{timelineData.length} months</p>
          <p className="text-xs text-green-600 mt-2">of tracking data</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-6 border border-orange-200">
          <p className="text-sm text-orange-700 font-semibold uppercase mb-2">Total Responses</p>
          <p className="text-2xl font-bold text-orange-600">{data.length}</p>
          <p className="text-xs text-orange-600 mt-2">survey responses collected</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-6 border border-red-200">
          <p className="text-sm text-red-700 font-semibold uppercase mb-2">Average Worry</p>
          <p className="text-2xl font-bold text-red-600">
            {(data.reduce((sum, r) => sum + (r.worryLevel || 0), 0) / data.filter(r => r.worryLevel).length).toFixed(1)}
          </p>
          <p className="text-xs text-red-600 mt-2">across all time</p>
        </div>
      </div>
    </div>
  );
};
