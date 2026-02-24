import React, { useMemo } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { SurveyResponse } from '../types';

interface Props {
  data: SurveyResponse[];
}

const HEATMAP_COLORS = ['#f0fdf4', '#dcfce7', '#86efac', '#22c55e', '#15803d']; 

const ETHNICITY_COLOR_MAP: Record<string, string> = {
  'Asian / Pacific Islander': '#43a047',
  'Black or African American': '#455a64',
  'Hispanic or Latine': '#e91e63',
  'Middle Eastern': '#00897b',
  'Mixed Race': '#558b2f',
  'Native American or American Indian': '#795548',
  'White': '#fdd835',
  'Prefer not to say': '#9e9e9e'
};
const DEFAULT_COLOR = '#9e9e9e';

export const DemographicsView: React.FC<Props> = ({ data }) => {

  // 1. Zip Code Heatmap
  const zipData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(d => {
        counts[d.zipCode] = (counts[d.zipCode] || 0) + 1;
    });
    const max = Math.max(...Object.values(counts));
    return Object.keys(counts).sort().map(zip => ({
        zip,
        count: counts[zip],
        intensity: Math.min(4, Math.floor((counts[zip] / max) * 5))
    }));
  }, [data]);

  // 2. Correlation Data (Income vs Worry)
  const correlationData = useMemo(() => {
      // Map new string income ranges to numeric approximations for scatter plot
      const incomeMap: Record<string, number> = {
          'Under $50,000': 25,
          '$50,000 - $99,000': 75,
          '$100,000 - $150,000': 125,
          '$150,000 - $200,000': 175,
          '$200,000 or more': 225,
          'Prefer not to say': 0
      };
      
      return data
        .filter(d => d.incomeRange !== 'Prefer not to say') // Filter out unknown for scatter
        .map(d => ({
            x: incomeMap[d.incomeRange] || 0, 
            y: d.worryLevel, // 1-5
            z: d.householdSize * 50,
            rawIncome: d.incomeRange,
            household: d.householdSize
        }));
  }, [data]);

  // 3. Ethnicity Breakdown
  const ethnicityData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(d => {
        d.ethnicity.forEach(eth => {
             counts[eth] = (counts[eth] || 0) + 1;
        });
    });
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [data]);

  // 4. Age Breakdown
  const ageData = useMemo(() => {
    const counts: Record<string, number> = {};
    const order = ['Under 20', '20-39', '40-59', 'Over 60', 'Prefer not to say'];
    data.forEach(d => counts[d.ageRange] = (counts[d.ageRange] || 0) + 1);
    
    return order.map(k => ({ name: k, value: counts[k] || 0 }));
  }, [data]);

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Vulnerability Correlation */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
            <h3 className="text-lg font-bold text-[#1b4332] mb-2">Income vs. Food Worry</h3>
            <p className="text-sm text-stone-500 mb-4">Are lower income households more worried? (Bubble size = Family Size)</p>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          type="number" 
                          dataKey="x" 
                          name="Est. Income" 
                          domain={[0, 250]} 
                          ticks={[25, 75, 125, 175, 225]}
                          tickFormatter={(value) => `${value}k`}
                          tick={{fill: '#57534e', fontSize: 12}} 
                        />
                        <YAxis 
                          type="number" 
                          dataKey="y" 
                          name="Worry Level" 
                          domain={[0, 6]} 
                          tickCount={6}
                          tick={{fill: '#57534e', fontSize: 12}} 
                          label={{ value: 'Worry (1-5)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-white p-3 border border-stone-200 shadow-lg rounded-lg text-xs">
                                        <p className="font-bold text-[#1b4332] mb-1">Household Data</p>
                                        <div className="space-y-1">
                                            <p className="text-stone-600">Income: <span className="font-semibold">{d.rawIncome}</span></p>
                                            <p className="text-stone-600">Worry Level: <span className="font-semibold text-red-500">{d.y}/5</span></p>
                                            <p className="text-stone-600">Household Size: <span className="font-semibold">{d.household}</span></p>
                                        </div>
                                    </div>
                                );
                                }
                                return null;
                            }}
                        />
                        <Scatter name="Households" data={correlationData} fill="#2E7D32" fillOpacity={0.65} />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Ethnicity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
            <h3 className="text-lg font-bold text-[#1b4332] mb-4">Demographic Breakdown</h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={ethnicityData}
                            cx="40%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                        >
                            {ethnicityData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={ETHNICITY_COLOR_MAP[entry.name] || DEFAULT_COLOR} 
                                />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend 
                           layout="vertical" 
                           verticalAlign="middle" 
                           align="right"
                           wrapperStyle={{ fontSize: '11px', color: '#44403c', maxWidth: '40%' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Age Distribution */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-stone-200">
            <h3 className="text-lg font-bold text-[#1b4332] mb-4">Age Distribution</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData} layout="vertical" margin={{ left: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        <Bar dataKey="value" fill="#65a30d" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Zip Code Simulation Grid */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-stone-200">
            <h3 className="text-lg font-bold text-[#1b4332] mb-4">Service Area Intensity (Santa Clara County)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {zipData.map((z) => (
                    <div 
                    key={z.zip} 
                    style={{ backgroundColor: HEATMAP_COLORS[z.intensity] }}
                    className={`p-6 rounded-lg border border-stone-100 flex flex-col items-center justify-center transition-transform hover:scale-105 shadow-sm`}
                    >
                        <span className={`text-xl font-bold ${z.intensity > 2 ? 'text-white' : 'text-[#1b4332]'}`}>{z.zip}</span>
                        <span className={`text-sm ${z.intensity > 2 ? 'text-green-50' : 'text-stone-700'}`}>{z.count} Responses</span>
                    </div>
                ))}
            </div>
            <p className="text-xs text-stone-500 mt-4 text-center">Darker shades indicate higher response volume from that Zip Code.</p>
        </div>
      </div>

    </div>
  );
};