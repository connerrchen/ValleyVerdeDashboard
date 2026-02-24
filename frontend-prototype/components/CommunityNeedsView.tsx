import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell
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

// Outlook Colors
const OUTLOOK_COLORS: Record<string, string> = {
    'More concerned about getting food or getting the right type of food': '#ef4444',
    'Equally concerned about getting food or getting the right type of food': '#f59e0b',
    'Less concerned about getting food or getting the right type of food': '#10b981',
    'Unsure': '#9ca3af'
};

export const CommunityNeedsView: React.FC<Props> = ({ data }) => {
  
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
      
      {/* Row 1: The Gap Analysis (Grouped Bar Chart) */}
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
                    <XAxis dataKey="name" tick={{fill: '#44403c', fontSize: 12}} />
                    <YAxis label={{ value: 'Respondents', angle: -90, position: 'insideLeft' }} />
                    <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{fill: '#f5f5f4'}}
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