import React from "react";
import {
  ClipboardList,
  HeartHandshake,
  MapPin,
  FileBarChart,
  Download,
  Users,
  Carrot,
  Leaf,
  Wheat,
  Sprout,
  ArrowRight,
} from "lucide-react";

interface Props {
  onNavigate: (tab: "needs" | "demographics") => void;
}

export const LandingPage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 pb-12 font-sans bg-[#f8faf7]">
      {/* 1. Vegetable Line Drawing Banner */}
      <div className="relative w-full h-80 bg-[#eef7ed] overflow-hidden border-b border-[#e2e8f0]">
        {/* Decorative Pattern to simulate the vegetable line drawings */}
        <div className="absolute inset-0 opacity-[0.15] text-[#4d7c0f] flex flex-wrap justify-center content-center gap-16 md:gap-24 p-8 select-none pointer-events-none transform -rotate-6 scale-110">
          {Array.from({ length: 24 }).map((_, i) => (
            <React.Fragment key={i}>
              <Carrot size={64} strokeWidth={1} />
              <Leaf size={56} strokeWidth={1} />
              <Wheat size={64} strokeWidth={1} />
              <Sprout size={56} strokeWidth={1} />
            </React.Fragment>
          ))}
        </div>
        {/* Gradient Overlay for Fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#f8faf7]/80"></div>
      </div>

      {/* Main Content Container - Overlapping the Banner */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mt-48 space-y-12">
        {/* 2. Hero Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#e2e8f0] p-8 md:p-12 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ecfccb] text-[#3f6212] text-sm font-bold tracking-wide border border-[#d9f99d]">
              <HeartHandshake size={16} />
              <span>Community First</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-[#14532d] leading-[1.15] tracking-tight">
              Valley Verde <br /> Community Survey
            </h1>

            <p className="text-lg text-stone-600 leading-relaxed max-w-lg">
              Visualizing the gap between <strong>Affordability</strong> and{" "}
              <strong>Availability</strong> of healthy food in our community.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLScTWCmlC0GqmapdZqWqMv3DOLha6LxPSITqVZMA4dl2wY7nCQ/viewform?usp=header"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 bg-[#4d7c0f] hover:bg-[#3f6212] text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-base"
              >
                <ClipboardList size={20} /> Take the Survey
              </a>
              <button
                onClick={() => onNavigate("needs")}
                className="px-8 py-3.5 bg-white border-2 border-[#e2e8f0] hover:border-[#4d7c0f] text-[#1b4332] font-bold rounded-lg hover:bg-[#f8fafc] transition-all text-base"
              >
                View Dashboard
              </button>
            </div>
          </div>

          {/* Hero Illustration Placeholder */}
          <div className="hidden md:flex flex-1 justify-center w-full">
            <div className="relative w-full max-w-md aspect-[4/3] bg-[#f8fafc] rounded-xl border-2 border-dashed border-[#cbd5e1] flex items-center justify-center group overflow-hidden">
              <div className="absolute inset-0 bg-[#f1f5f9] pattern-grid-lg opacity-50"></div>

              {/* Abstract Representation of Report/Clipboard */}
              <div className="relative bg-white w-48 h-64 rounded-xl shadow-xl border border-stone-100 flex flex-col p-6 transform rotate-3 transition-transform group-hover:rotate-0">
                <div className="w-16 h-16 bg-[#ecfccb] rounded-full flex items-center justify-center mb-6 self-center border border-[#d9f99d]">
                  <ClipboardList className="text-[#4d7c0f]" size={32} />
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-stone-100 rounded-full w-full"></div>
                  <div className="h-3 bg-stone-100 rounded-full w-3/4"></div>
                  <div className="h-3 bg-stone-100 rounded-full w-5/6"></div>
                </div>
                <div className="mt-auto flex justify-end">
                  <div className="w-8 h-8 rounded-full bg-[#fef3c7] flex items-center justify-center">
                    <HeartHandshake size={14} className="text-[#b45309]" />
                  </div>
                </div>
              </div>
              {/* Decorative Circle */}
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-[#dcfce7] rounded-full opacity-50 blur-xl"></div>
            </div>
          </div>
        </div>

        {/* 3. About Section */}
        <div className="grid md:grid-cols-12 gap-12 items-center py-8">
          <div className="md:col-span-7 space-y-6">
            <h2 className="text-3xl font-bold text-[#14532d]">
              About This Project
            </h2>
            <p className="text-stone-600 text-lg leading-relaxed">
              This dashboard visualizes responses from our new "Share your food
              needs" survey. By collecting data directly from residents in Santa
              Clara County, we aim to pinpoint the specific nature of food
              insecurity.
            </p>
            <div className="flex gap-4 border-l-4 border-[#84cc16] pl-6 py-1">
              <p className="text-stone-700 font-medium leading-relaxed">
                We specifically track whether barriers are due to{" "}
                <span className="text-red-500 font-bold">Cost</span>{" "}
                (Affordability) or{" "}
                <span className="text-sky-600 font-bold">
                  Physical Availability
                </span>{" "}
                at local stores. We also gather input on{" "}
                <span className="text-[#4d7c0f] font-bold">
                  Educational Interests
                </span>{" "}
                like growing food or preparing healthy meals.
              </p>
            </div>
          </div>

          {/* About Illustration Placeholder */}
          <div className="md:col-span-5">
            <div className="w-full aspect-video bg-[#f1f5f9] rounded-xl border-2 border-dashed border-[#94a3b8] flex flex-col items-center justify-center text-stone-400">
              <FileBarChart
                size={64}
                strokeWidth={1}
                className="mb-4 text-stone-300"
              />
            </div>
          </div>
        </div>

        {/* 4. How to Use Section */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-[#1b4332] text-center">
            How to Use This Dashboard
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <button
              onClick={() => onNavigate("needs")}
              className="bg-white p-8 rounded-xl border border-[#e2e8f0] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full text-left group"
            >
              <div className="w-14 h-14 bg-[#fff7ed] rounded-xl border border-[#ffedd5] flex items-center justify-center mb-6 group-hover:bg-[#ffedd5] transition-colors">
                <HeartHandshake className="text-[#ea580c]" size={28} />
              </div>
              <h3 className="text-xl font-bold text-[#1b4332] mb-3 group-hover:text-[#ea580c] transition-colors">
                Gap Analysis
              </h3>
              <p className="text-stone-500 mb-8 flex-1 leading-relaxed">
                See the difference between what people can't afford vs. what
                they can't find.
              </p>
              <div className="flex items-center text-[#1b4332] font-bold text-sm group-hover:translate-x-1 transition-transform">
                View Analysis <ArrowRight size={16} className="ml-2" />
              </div>
            </button>

            {/* Card 2 */}
            <button
              onClick={() => onNavigate("demographics")}
              className="bg-white p-8 rounded-xl border border-[#e2e8f0] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full text-left group"
            >
              <div className="w-14 h-14 bg-[#f1f5f9] rounded-xl border border-[#e2e8f0] flex items-center justify-center mb-6 group-hover:bg-[#e2e8f0] transition-colors">
                <MapPin className="text-[#475569]" size={28} />
              </div>
              <h3 className="text-xl font-bold text-[#1b4332] mb-3 group-hover:text-[#475569] transition-colors">
                Demographics
              </h3>
              <p className="text-stone-500 mb-8 flex-1 leading-relaxed">
                View data by Zip Code, income, and household size to understand
                who we are serving.
              </p>
              <div className="flex items-center text-[#1b4332] font-bold text-sm group-hover:translate-x-1 transition-transform">
                View Demographics <ArrowRight size={16} className="ml-2" />
              </div>
            </button>

            {/* Card 3 */}
            <div className="bg-white p-8 rounded-xl border border-[#e2e8f0] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full text-left group">
              <div className="w-14 h-14 bg-[#f0fdf4] rounded-xl border border-[#dcfce7] flex items-center justify-center mb-6 group-hover:bg-[#dcfce7] transition-colors">
                <Download className="text-[#15803d]" size={28} />
              </div>
              <h3 className="text-xl font-bold text-[#1b4332] mb-3 group-hover:text-[#15803d] transition-colors">
                Impact Reports
              </h3>
              <p className="text-stone-500 mb-8 flex-1 leading-relaxed">
                Download anonymized data or generate weekly reports for
                stakeholders and grant reporting.
              </p>
              <div className="flex items-center text-stone-400 font-medium text-sm italic">
                Available in dashboard
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Disclaimer */}
        <div className="text-center pt-12 pb-4">
          <p className="text-stone-400 text-sm flex items-center justify-center gap-2">
            <Users size={16} />
            All public data presented here is <strong>anonymized</strong> to
            protect respondent privacy.
          </p>
        </div>
      </div>
    </div>
  );
};
