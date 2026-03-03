import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { SurveyResponse } from '../types';
import { Info, BookOpen, AlertTriangle, TrendingUp } from 'lucide-react';

interface Props {
  data: SurveyResponse[];
}

// Colors for the Gap Analysis
const AFFORD_COLOR = '#ef4444'; // Red for "Can't Afford"
const AVAIL_COLOR = '#0ea5e9'; // Blue for "Can't Find"
const EDU_COLOR = '#1b4332'; // Valley Verde Green

const NEED_DEFINITIONS = [
  { id: 'produce', label: 'Produce', source: 'Fresh fruits/vegetables', color: '#16a34a' },
  { id: 'meatDairy', label: 'Meat/Dairy', source: 'Meat/eggs/milk', color: '#15803d' },
  { id: 'cultural', label: 'Cultural Foods', source: 'Foods from my culture', color: '#0ea5e9' },
  { id: 'organic', label: 'Organic', source: 'Organic food', color: '#f59e0b' },
  { id: 'healthFood', label: 'Health-Specific', source: 'Food for my health problem (like diabetes)', color: '#ef4444' },
  { id: 'babyFood', label: 'Baby Food', source: 'Baby food/formula', color: '#7c3aed' }
];

// Outlook Colors
const OUTLOOK_COLORS: Record<string, string> = {
    'More concerned about getting food or getting the right type of food': '#ef4444',
    'Equally concerned about getting food or getting the right type of food': '#f59e0b',
    'Less concerned about getting food or getting the right type of food': '#10b981',
    'Unsure': '#9ca3af'
};

export const CommunityNeedsView: React.FC<Props> = ({ data }) => {

  // 0. Need Trends Over Time (line chart)
  const monthlyNeedTrend = useMemo(() => {
    const grouped: Record<string, SurveyResponse[]> = {};

    data.forEach((response) => {
      const date = new Date(response.timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      grouped[key] = grouped[key] || [];
      grouped[key].push(response);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, responses]) => {
        const [year, month] = key.split('-').map(Number);
        const labelDate = new Date(year, month - 1, 1);
        const row: Record<string, string | number> = {
          month: labelDate.toLocaleString('default', { month: 'short' }),
          monthFull: labelDate.toLocaleString('default', { month: 'long', year: 'numeric' })
        };

        NEED_DEFINITIONS.forEach((need) => {
          const count = responses.filter(
            (response) =>
              response.affordabilityBarriers.includes(need.source) ||
              response.availabilityBarriers.includes(need.source)
          ).length;
          row[need.id] = count;
        });

        return row;
      });
  }, [data]);

  const needRanking = useMemo(() => {
    return NEED_DEFINITIONS.map((need) => {
      const count = data.filter(
        (response) =>
          response.affordabilityBarriers.includes(need.source) ||
          response.availabilityBarriers.includes(need.source)
      ).length;

      return {
        ...need,
        count,
        share: data.length > 0 ? Math.round((count / data.length) * 100) : 0
      };
    }).sort((a, b) => b.count - a.count);
  }, [data]);

  const trendNeeds = useMemo(() => needRanking.slice(0, 4), [needRanking]);
  
  // 1. Gap Analysis: Affordability vs Availability
  const gapData = useMemo(() => {
    const categories = [
      'Fresh fruits/vegetables',
      'Meat/eggs/milk',
      'Foods from my culture',
      'Organic food',
      'Food for my health problem (like diabetes)',
      'Baby food/formula'
    ];

    return categories.map(cat => {
      const cantAfford = data.filter(d => d.affordabilityBarriers.includes(cat)).length;
      const cantFind = data.filter(d => d.availabilityBarriers.includes(cat)).length;
      
      // Shorten names for chart
      let shortName = cat;
      if (cat.includes('health problem')) shortName = 'Health/Diabetes';
      if (cat.includes('culture')) shortName = 'Cultural Foods';
      if (cat.includes('fruits')) shortName = 'Produce';
      if (cat.includes('Meat')) shortName = 'Meat/Dairy';
      if (cat.includes('Baby')) shortName = 'Baby Food';
      if (cat.includes('Organic')) shortName = 'Organic';

      return {
        name: shortName,
        fullName: cat,
        "Can't Afford": cantAfford,
        "Can't Find": cantFind
      };
    }).sort((a, b) => b["Can't Afford"] - a["Can't Afford"]);
  }, [data]);

  // 2. Education Interests
  const educationData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(d => {
      d.knowledgeInterests.forEach(topic => {
        counts[topic] = (counts[topic] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, val]) => ({ name, value: val }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // 3. Outlook Data
  const outlookData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(d => {
        counts[d.futureOutlook] = (counts[d.futureOutlook] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ 
        name, 
        value,
        shortName: name.split(' ')[0] + '...' // "More...", "Less..."
    }));
  }, [data]);

  return (
    <div className="space-y-6">

      {/* Row 1: Needs trend + info + ranking */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-6 bg-white p-6 rounded-xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-[#1b4332] mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#2E7D32]" />
            Community Needs Over Time
          </h3>
          <p className="text-sm text-stone-500 mb-4">
            X-axis shows months; Y-axis shows number of respondents reporting each need.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyNeedTrend} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fill: '#57534e', fontSize: 12 }} />
                <YAxis tick={{ fill: '#57534e', fontSize: 12 }} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => [value, trendNeeds.find((need) => need.id === name)?.label || name]}
                  labelFormatter={(label, payload) => {
                    const monthFull = payload?.[0]?.payload?.monthFull;
                    return monthFull || label;
                  }}
                />
                {trendNeeds.map((need) => (
                  <Line
                    key={need.id}
                    type="monotone"
                    dataKey={need.id}
                    stroke={need.color}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name={need.id}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-[#1b4332] mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#2E7D32]" />
            Need Trend Guide
          </h3>
          <p className="text-sm text-stone-600 leading-relaxed mb-4">
            This panel highlights how top needs change month-to-month. Hover any point to see exact counts for that month.
          </p>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Legend</p>
          <div className="space-y-2">
            {trendNeeds.map((need) => (
              <div key={need.id} className="flex items-center gap-2 text-sm text-stone-700">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: need.color }} />
                <span>{need.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600">
            Ranking on the right reflects the current selected time filter.
          </div>
        </div>

        <div className="xl:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-[#1b4332] mb-4">Need Ranking</h3>
          <div className="space-y-3">
            {needRanking.map((need, index) => (
              <div key={need.id} className="border border-stone-200 rounded-lg p-3 bg-stone-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-500">#{index + 1}</span>
                    <span className="text-sm font-semibold text-[#1b4332]">{need.label}</span>
                  </div>
                  <span className="text-sm font-bold text-stone-700">{need.count}</span>
                </div>
                <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${need.share}%`, backgroundColor: need.color }}
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">{need.share}% of respondents</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Gap Analysis */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-[#1b4332] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Gap Analysis: Affordability vs. Physical Access
          </h3>
          <p className="text-stone-500 text-sm">
            Comparing what residents <span className="text-red-500 font-bold">cannot afford</span> vs. what they <span className="text-sky-500 font-bold">cannot find</span> in local stores.
          </p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gapData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fill: '#44403c', fontSize: 12 }} />
              <YAxis label={{ value: 'Respondents', angle: -90, position: 'insideLeft' }} />
              <RechartsTooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f5f5f4' }}
              />
              <Legend />
              <Bar dataKey="Can't Afford" fill={AFFORD_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Can't Find" fill={AVAIL_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Education Wishlist */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-[#1b4332] mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-700" />
            Community Education Interests
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={educationData} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB"/>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 11, fill: '#44403c'}} interval={0} />
                <RechartsTooltip cursor={{fill: '#F5F5F4'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill={EDU_COLOR} radius={[0, 4, 4, 0]} barSize={24} name="Interested Households" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Future Outlook Donut */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 flex flex-col">
            <h3 className="text-lg font-bold text-[#1b4332] mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-700" />
                Outlook: Next 3 Months
            </h3>
            <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={outlookData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {outlookData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={OUTLOOK_COLORS[entry.name] || '#ccc'} />
                            ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend 
                            layout="vertical" 
                            verticalAlign="middle" 
                            align="right"
                            wrapperStyle={{ fontSize: '11px', maxWidth: '40%' }} 
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};