import React, { useState, useEffect } from 'react';
import { MOCK_DATA } from './services/data';
import { TimeFilter, SurveyResponse } from './types';
import { CommunityNeedsView } from './components/CommunityNeedsView';
import { DemographicsView } from './components/DemographicsView';
import { LandingPage } from './components/LandingPage';
import { StatsView } from './components/StatsView';
import { 
  LayoutDashboard, Users, Download, FileText, 
  Info, Home
} from 'lucide-react';

// Custom Corn Logo SVG Component
const CornLogo = () => (
  <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
    {/* Cob Body */}
    <path d="M32 35 C 32 10 68 10 68 35 C 68 65 50 95 50 95 C 50 95 32 65 32 35" fill="#FACC15" />
    
    {/* Kernel Texture */}
    <g fill="#FDE047">
      <circle cx="42" cy="20" r="3.5" />
      <circle cx="50" cy="16" r="3.5" />
      <circle cx="58" cy="20" r="3.5" />
      <circle cx="38" cy="30" r="3.5" />
      <circle cx="50" cy="28" r="3.5" />
      <circle cx="62" cy="30" r="3.5" />
      <circle cx="42" cy="40" r="3.5" />
      <circle cx="50" cy="38" r="3.5" />
      <circle cx="58" cy="40" r="3.5" />
      <circle cx="46" cy="50" r="3.5" />
      <circle cx="54" cy="50" r="3.5" />
    </g>

    {/* Leaves/Husks */}
    {/* Left Leaf - lighter green */}
    <path d="M50 95 C 15 75 5 45 15 20 C 12 45 25 75 50 95" fill="#84CC16" />
    {/* Right Leaf - darker green */}
    <path d="M50 95 C 85 75 95 45 85 20 C 88 45 75 75 50 95" fill="#4D7C0F" />
    {/* Central vein accent */}
    <path d="M50 95 L 50 60" stroke="#3F6212" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
  </svg>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'needs' | 'demographics'>('home');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [filteredData, setFilteredData] = useState<SurveyResponse[]>(MOCK_DATA);
  const [showMethodology, setShowMethodology] = useState(false);

  // Filter Logic
  useEffect(() => {
    let res = MOCK_DATA;
    const now = new Date();
    if (timeFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        res = res.filter(d => new Date(d.timestamp) > weekAgo);
    } else if (timeFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        res = res.filter(d => new Date(d.timestamp) > monthAgo);
    }
    setFilteredData(res);
  }, [timeFilter]);

  const handleDownload = () => {
      alert("System Action: Generating PII-stripped CSV file for download...");
  };

  const handleGenerateReport = () => {
      window.print();
  };

  return (
    <div className="min-h-screen bg-[#f8faf7] flex font-sans text-stone-800">
      
      {/* Sidebar - Using Valley Verde Dark Green */}
      <aside className="w-64 bg-[#1b4332] text-white hidden md:flex flex-col fixed h-full z-10 font-sans">
        <div className="p-6 border-b border-[#2d6a4f] flex flex-col items-start cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="flex items-center gap-3 mb-3">
                <div className="shrink-0 -ml-1">
                   <CornLogo />
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-[#A3D154] font-bold text-3xl tracking-tight lowercase">valley</span>
                    <span className="text-white font-bold text-2xl tracking-[0.2em] uppercase -mt-1">VERDE</span>
                </div>
            </div>
             <p className="text-[#FACC15] text-[0.65rem] font-bold tracking-[0.2em] uppercase pl-1">Plant • Eat • Share</p>
             <p className="text-[#a7f3d0]/70 text-[0.6rem] pl-1 mt-1 uppercase tracking-wider">Community Insights</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
            <button 
                onClick={() => setActiveTab('home')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'home' ? 'bg-[#2d6a4f] text-white border-l-4 border-[#84cc16]' : 'text-green-100 hover:bg-[#2d6a4f]/50'}`}
            >
                <Home size={20} />
                Home
            </button>
            <button 
                onClick={() => setActiveTab('needs')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'needs' ? 'bg-[#2d6a4f] text-white border-l-4 border-[#84cc16]' : 'text-green-100 hover:bg-[#2d6a4f]/50'}`}
            >
                <LayoutDashboard size={20} />
                Community Needs
            </button>
            <button 
                onClick={() => setActiveTab('demographics')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'demographics' ? 'bg-[#2d6a4f] text-white border-l-4 border-[#84cc16]' : 'text-green-100 hover:bg-[#2d6a4f]/50'}`}
            >
                <Users size={20} />
                Demographics & Geo
            </button>
        </nav>

        <div className="p-4 border-t border-[#2d6a4f]">
            <div className="bg-[#0f291e] rounded-lg p-4 border border-[#2d6a4f]">
                <p className="text-xs text-[#84cc16] font-bold uppercase mb-2">Trend Alert</p>
                <p className="text-sm text-gray-200">Transportation needs increased by <span className="font-bold text-orange-400">20%</span> this month.</p>
            </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-[#1b4332] text-white p-4 z-20 flex items-center justify-between shadow-md">
         <div className="flex items-center gap-2" onClick={() => setActiveTab('home')}>
            <CornLogo />
            <span className="font-bold text-lg">Valley Verde</span>
         </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 mt-14 md:mt-0">
        
        {/* Header Controls - Hide on Landing Page */}
        {activeTab !== 'home' && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                  <h2 className="text-2xl font-bold text-[#1b4332]">
                      {activeTab === 'needs' ? 'Community Food Needs' : 'Demographics & Geography'}
                  </h2>
                  <p className="text-stone-500 text-sm">Real-time survey analytics</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center bg-white rounded-lg border border-stone-200 p-1">
                      <button onClick={() => setTimeFilter('week')} className={`px-3 py-1 rounded text-sm ${timeFilter === 'week' ? 'bg-green-100 text-green-800 font-bold' : 'text-stone-600 hover:bg-stone-100'}`}>Week</button>
                      <button onClick={() => setTimeFilter('month')} className={`px-3 py-1 rounded text-sm ${timeFilter === 'month' ? 'bg-green-100 text-green-800 font-bold' : 'text-stone-600 hover:bg-stone-100'}`}>Month</button>
                      <button onClick={() => setTimeFilter('all')} className={`px-3 py-1 rounded text-sm ${timeFilter === 'all' ? 'bg-green-100 text-green-800 font-bold' : 'text-stone-600 hover:bg-stone-100'}`}>All Time</button>
                  </div>
                  
                  <button onClick={handleGenerateReport} className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 text-sm font-medium shadow-sm transition-all">
                      <FileText size={16} /> Report
                  </button>
                  <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-[#2E7D32] text-white rounded-lg hover:bg-[#1b4332] text-sm font-medium shadow-sm transition-all">
                      <Download size={16} /> Export CSV
                  </button>
              </div>
          </div>
        )}

        {/* Global KPIs - Hide on Landing Page */}
        {activeTab !== 'home' && <StatsView data={filteredData} />}

        {/* Views */}
        {activeTab === 'home' ? (
            <LandingPage onNavigate={setActiveTab} />
        ) : activeTab === 'needs' ? (
            <CommunityNeedsView data={filteredData} />
        ) : (
            <DemographicsView data={filteredData} />
        )}

        {/* Footer / Context - Visible on all pages but adjusted content on landing page */}
        {activeTab !== 'home' && (
          <footer className="mt-12 pt-6 border-t border-stone-200 flex flex-col md:flex-row justify-between items-center text-stone-500 text-sm">
              <div>
                  © {new Date().getFullYear()} Valley Verde Data Dashboard
              </div>
              <button 
                  onClick={() => setShowMethodology(!showMethodology)}
                  className="flex items-center gap-1 text-[#2E7D32] hover:underline mt-2 md:mt-0 font-medium"
              >
                  <Info size={14} /> Methodology & Data Sources
              </button>
          </footer>
        )}

        {/* Methodology Modal (Simple implementation) */}
        {showMethodology && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-xl max-w-lg shadow-xl border-t-4 border-[#84cc16]">
                    <h3 className="font-bold text-xl mb-2 text-[#1b4332]">Methodology</h3>
                    <p className="text-stone-600 mb-4">
                        Data is collected via QR codes distributed at community centers and Valley Verde events. 
                        Responses are anonymous unless an email is provided. 
                        "Verified" status indicates a reachable respondent.
                        Data is updated daily.
                    </p>
                    <button 
                        onClick={() => setShowMethodology(false)}
                        className="w-full bg-[#2E7D32] text-white py-2 rounded-lg font-bold hover:bg-[#1b4332] transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;