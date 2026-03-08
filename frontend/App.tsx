import React, { useState, useEffect } from "react";
import { fetchSurveyResponses } from "./services/data";
import { TimeFilter, SurveyResponse } from "./types";
import { CommunityNeedsView } from "./components/CommunityNeedsView";
import { DemographicsView } from "./components/DemographicsView";
import { LandingPage } from "./components/LandingPage";
import { StatsView } from "./components/StatsView";
import { TimelineView } from "./components/TimelineView";
import {
  LayoutDashboard,
  Users,
  Download,
  FileText,
  Info,
  Home,
  Clock,
} from "lucide-react";

// Custom Corn Logo SVG Component
const CornLogo = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-sm"
  >
    {/* Cob Body */}
    <path
      d="M32 35 C 32 10 68 10 68 35 C 68 65 50 95 50 95 C 50 95 32 65 32 35"
      fill="#FACC15"
    />

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
    <path
      d="M50 95 L 50 60"
      stroke="#3F6212"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.3"
    />
  </svg>
);

const toCsvCell = (value: string | number) => {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const countBy = (items: string[]) => {
  const counts: Record<string, number> = {};
  items.forEach((item) => {
    const key = item && item.trim() ? item.trim() : "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
};

const appendCountSection = (
  rows: string[][],
  title: string,
  counts: Record<string, number>
) => {
  rows.push([title, "Count"]);
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([label, count]) => rows.push([label, count.toString()]));
  rows.push([]);
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "home" | "needs" | "demographics" | "timeline"
  >("home");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("week");
  const [allData, setAllData] = useState<SurveyResponse[]>([]);
  const [currentPeriodData, setCurrentPeriodData] = useState<SurveyResponse[]>([]);
  const [prevPeriodData, setPrevPeriodData] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);


  // Fetch backend data when timeFilter changes

  // Helper to get the number of days for each filter
  const getDaysForFilter = (filter: TimeFilter) => {
    switch (filter) {
      case "week": return 7;
      case "month": return 31;
      case "quarter": return 93;
      default: return 365 * 10; // all time
    }
  };

  // Extract data fetching logic into a reusable function
  const fetchData = (isBackgroundRefresh = false) => {
    if (isBackgroundRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    // Fetch enough data for two periods
    const days = getDaysForFilter(timeFilter) * 2;
    fetchSurveyResponses("all")
      .then((responses) => {
        // Sort responses by timestamp descending
        const sorted = [...responses].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const now = Date.now();
        const periodMs = getDaysForFilter(timeFilter) * 24 * 60 * 60 * 1000;
        // Current period: within [now - periodMs, now]
        const current = sorted.filter(r => new Date(r.timestamp).getTime() >= now - periodMs);
        // Previous period: within [now - 2*periodMs, now - periodMs)
        const prev = sorted.filter(r => {
          const t = new Date(r.timestamp).getTime();
          return t >= now - 2 * periodMs && t < now - periodMs;
        });
        setAllData(responses);
        setCurrentPeriodData(current);
        setPrevPeriodData(prev);
        setLastRefresh(new Date());
        if (isBackgroundRefresh) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        setError('Failed to load data from backend.');
        if (isBackgroundRefresh) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      });
  };

  // Initial fetch when timeFilter changes
  useEffect(() => {
    fetchData(false);
  }, [timeFilter]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [timeFilter]); // Re-create interval when timeFilter changes

  const handleDownload = () => {
    if (loading || error) {
      alert("Data is still loading. Please try again in a moment.");
      return;
    }

    const dataset = currentPeriodData;
    if (!dataset.length) {
      alert("No responses available for the selected time period.");
      return;
    }

    const avgWorry =
      dataset.reduce((sum, row) => sum + (row.worryLevel || 0), 0) / dataset.length;

    const rows: string[][] = [];
    rows.push(["Valley Verde Dashboard - Privacy-Safe Report"]);
    rows.push(["Generated At (UTC)", new Date().toISOString()]);
    rows.push(["Selected Time Filter", timeFilter]);
    rows.push(["Current View Responses", dataset.length.toString()]);
    rows.push(["All-Time Responses", allData.length.toString()]);
    rows.push(["Average Worry Level", avgWorry.toFixed(2)]);
    rows.push([]);

    appendCountSection(
      rows,
      "Worry Distribution",
      countBy(dataset.map((row) => `${row.worryLevel || 0}`))
    );
    appendCountSection(rows, "Future Outlook", countBy(dataset.map((row) => row.futureOutlook || "Unknown")));
    appendCountSection(rows, "Age Range", countBy(dataset.map((row) => row.ageRange || "Unknown")));
    appendCountSection(rows, "Gender", countBy(dataset.map((row) => row.gender || "Unknown")));
    appendCountSection(rows, "Income Range", countBy(dataset.map((row) => row.incomeRange || "Unknown")));
    appendCountSection(
      rows,
      "Household Size",
      countBy(dataset.map((row) => `${row.householdSize || 0}`))
    );
    appendCountSection(
      rows,
      "Affordability Barriers",
      countBy(dataset.flatMap((row) => row.affordabilityBarriers || []))
    );
    appendCountSection(
      rows,
      "Availability Barriers",
      countBy(dataset.flatMap((row) => row.availabilityBarriers || []))
    );
    appendCountSection(
      rows,
      "Knowledge Interests",
      countBy(dataset.flatMap((row) => row.knowledgeInterests || []))
    );
    appendCountSection(
      rows,
      "Ethnicity",
      countBy(dataset.flatMap((row) => (Array.isArray(row.ethnicity) ? row.ethnicity : [])))
    );

    const csv = rows
      .map((row) => row.map((cell) => toCsvCell(cell)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `valley-verde-report-${timeFilter}-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f8faf7] flex font-sans text-stone-800">
      {/* Sidebar - Using Valley Verde Dark Green */}
      <aside className="w-64 bg-[#1b4332] text-white hidden md:flex flex-col fixed h-full z-10 font-sans">
        <div
          className="p-6 border-b border-[#2d6a4f] flex flex-col items-start cursor-pointer"
          onClick={() => setActiveTab("home")}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="shrink-0 -ml-1">
              <CornLogo />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[#A3D154] font-bold text-3xl tracking-tight lowercase">
                valley
              </span>
              <span className="text-white font-bold text-2xl tracking-[0.2em] uppercase -mt-1">
                VERDE
              </span>
            </div>
          </div>
          <p className="text-[#FACC15] text-[0.65rem] font-bold tracking-[0.2em] uppercase pl-1">
            Plant • Eat • Share
          </p>
          <p className="text-[#a7f3d0]/70 text-[0.6rem] pl-1 mt-1 uppercase tracking-wider">
            Community Insights
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab("home")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "home" ? "bg-[#2d6a4f] text-white border-l-4 border-[#84cc16]" : "text-green-100 hover:bg-[#2d6a4f]/50"}`}
          >
            <Home size={20} />
            Home
          </button>
          <button
            onClick={() => setActiveTab("needs")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "needs" ? "bg-[#2d6a4f] text-white border-l-4 border-[#84cc16]" : "text-green-100 hover:bg-[#2d6a4f]/50"}`}
          >
            <LayoutDashboard size={20} />
            Community Needs
          </button>
          <button
            onClick={() => setActiveTab("demographics")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "demographics" ? "bg-[#2d6a4f] text-white border-l-4 border-[#84cc16]" : "text-green-100 hover:bg-[#2d6a4f]/50"}`}
          >
            <Users size={20} />
            Demographics
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "timeline" ? "bg-[#2d6a4f] text-white border-l-4 border-[#84cc16]" : "text-green-100 hover:bg-[#2d6a4f]/50"}`}
          >
            <Clock size={20} />
            Timeline
          </button>
        </nav>

        <div className="p-4 border-t border-[#2d6a4f]">
          <div className="bg-[#0f291e] rounded-lg p-4 border border-[#2d6a4f]">
            <p className="text-xs text-[#84cc16] font-bold uppercase mb-2">
              Trend Alert
            </p>
            <p className="text-sm text-gray-200">
              Transportation needs increased by{" "}
              <span className="font-bold text-orange-400">20%</span> this month.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-[#1b4332] text-white p-4 z-20 flex items-center justify-between shadow-md">
        <div
          className="flex items-center gap-2"
          onClick={() => setActiveTab("home")}
        >
          <CornLogo />
          <span className="font-bold text-lg">Valley Verde</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 mt-14 md:mt-0">
        {/* Header Controls - Hide on Landing Page */}
        {activeTab !== "home" && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#1b4332]">
                {activeTab === "needs"
                  ? "Community Food Needs"
                  : activeTab === "demographics"
                    ? "Demographics & Geography"
                    : "Community Response Timeline"}
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-stone-500 text-sm">
                  Real-time survey analytics
                </p>
                {isRefreshing && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                )}
                {lastRefresh && !isRefreshing && (
                  <span className="text-xs text-stone-400">
                    Updated {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-white rounded-lg border border-stone-200 p-1">
                <button
                  onClick={() => setTimeFilter("week")}
                  className={`px-3 py-1 rounded text-sm ${timeFilter === "week" ? "bg-green-100 text-green-800 font-bold" : "text-stone-600 hover:bg-stone-100"}`}
                >
                  Week
                </button>
                <button
                  onClick={() => setTimeFilter("month")}
                  className={`px-3 py-1 rounded text-sm ${timeFilter === "month" ? "bg-green-100 text-green-800 font-bold" : "text-stone-600 hover:bg-stone-100"}`}
                >
                  Month
                </button>
                <button
                  onClick={() => setTimeFilter("quarter")}
                  className={`px-3 py-1 rounded text-sm ${timeFilter === "quarter" ? "bg-green-100 text-green-800 font-bold" : "text-stone-600 hover:bg-stone-100"}`}
                >
                  Quarter
                </button>
                <button
                  onClick={() => setTimeFilter("all")}
                  className={`px-3 py-1 rounded text-sm ${timeFilter === "all" ? "bg-green-100 text-green-800 font-bold" : "text-stone-600 hover:bg-stone-100"}`}
                >
                  All Time
                </button>
              </div>

              <button
                onClick={handleGenerateReport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 text-sm font-medium shadow-sm transition-all"
              >
                <FileText size={16} /> Report
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-[#2E7D32] text-white rounded-lg hover:bg-[#1b4332] text-sm font-medium shadow-sm transition-all"
              >
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>
        )}

        {/* Loading/Error State */}
        {loading && (
          <div className="text-center py-12 text-stone-500 text-lg">Loading data from backend...</div>
        )}
        {error && (
          <div className="text-center py-12 text-red-600 text-lg">{error}</div>
        )}

        {/* Global KPIs - Hide on Landing Page */}
        {activeTab !== "home" && !loading && !error && <StatsView data={currentPeriodData} prevData={prevPeriodData} timeFilter={timeFilter} />}

        {/* Views */}
        {activeTab === "home" ? (
          <LandingPage onNavigate={setActiveTab} />
        ) : activeTab === "needs" ? (
          !loading && !error && <CommunityNeedsView data={currentPeriodData} timeFilter={timeFilter} />
        ) : activeTab === "demographics" ? (
          !loading && !error && <DemographicsView data={currentPeriodData} allData={allData} />
        ) : (
          !loading && !error && <TimelineView data={currentPeriodData} />
        )}

        {/* Footer / Context - Visible on all pages but adjusted content on landing page */}
        {activeTab !== "home" && (
          <footer className="mt-12 pt-6 border-t border-stone-200 flex flex-col md:flex-row justify-between items-center text-stone-500 text-sm">
            <div>© {new Date().getFullYear()} Valley Verde Data Dashboard</div>
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
              <h3 className="font-bold text-xl mb-2 text-[#1b4332]">
                Methodology
              </h3>
              <p className="text-stone-600 mb-4">
                Data is collected via QR codes distributed at community centers
                and Valley Verde events. Responses are anonymous unless an email
                is provided. "Verified" status indicates a reachable respondent.
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
