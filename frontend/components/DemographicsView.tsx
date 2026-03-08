import React, { useEffect, useMemo, useRef } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import { MapContainer, TileLayer, Circle, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { SurveyResponse } from "../types";

interface Props {
  data: SurveyResponse[];
  allData?: SurveyResponse[];
}

const ZIP_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "95110": { lat: 37.3467, lng: -121.9056 },
  "95111": { lat: 37.2859, lng: -121.8262 },
  "95112": { lat: 37.3483, lng: -121.8863 },
  "95116": { lat: 37.3492, lng: -121.8508 },
  "95122": { lat: 37.3316, lng: -121.8331 },
  "95123": { lat: 37.2447, lng: -121.8305 },
  "95127": { lat: 37.3729, lng: -121.8083 },
  "95133": { lat: 37.3724, lng: -121.8609 },
  "95148": { lat: 37.3359, lng: -121.7866 },
  "95020": { lat: 37.0058, lng: -121.5683 },
};

const COORDINATE_LIST = Object.values(ZIP_COORDINATES);
const LAT_VALUES = COORDINATE_LIST.map((point) => point.lat);
const LNG_VALUES = COORDINATE_LIST.map((point) => point.lng);

const SERVICE_AREA_BOUNDS = {
  west: Math.min(...LNG_VALUES) - 0.03,
  south: Math.min(...LAT_VALUES) - 0.02,
  east: Math.max(...LNG_VALUES) + 0.03,
  north: Math.max(...LAT_VALUES) + 0.02,
};

const SERVICE_AREA_CENTER: [number, number] = [
  (SERVICE_AREA_BOUNDS.south + SERVICE_AREA_BOUNDS.north) / 2,
  (SERVICE_AREA_BOUNDS.west + SERVICE_AREA_BOUNDS.east) / 2,
];

const HEAT_LEVEL_COLORS = ["#dcfce7", "#86efac", "#4ade80", "#22c55e", "#15803d"];

const ETHNICITY_COLOR_MAP: Record<string, string> = {
  "Asian / Pacific Islander": "#43a047",
  "Black or African American": "#455a64",
  "Hispanic or Latine": "#e91e63",
  "Middle Eastern": "#00897b",
  "Mixed Race": "#558b2f",
  "Native American or American Indian": "#795548",
  White: "#fdd835",
  "Prefer not to say": "#9e9e9e",
};
const DEFAULT_COLOR = "#9e9e9e";

const FitBoundsController: React.FC<{
  bounds: [[number, number], [number, number]];
}> = ({ bounds }) => {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (hasFittedRef.current) return;
    map.fitBounds(bounds, {
      paddingTopLeft: [24, 12],
      paddingBottomRight: [24, 72],
    });
    hasFittedRef.current = true;
  }, [map, bounds]);

  return null;
};

export const DemographicsView: React.FC<Props> = ({ data, allData }) => {
  const historicalData = allData ?? data;

  // 1. Geo Heatmap Points (Full Service Area)
  const geoHeatPoints = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((d) => {
      if (d.zipCode && d.zipCode.trim()) {
        counts[d.zipCode] = (counts[d.zipCode] || 0) + 1;
      }
    });

    const validCounts = Object.entries(counts).filter(([zip]) => {
      const coord = ZIP_COORDINATES[zip];
      if (!coord) return false;
      return (
        coord.lng >= SERVICE_AREA_BOUNDS.west &&
        coord.lng <= SERVICE_AREA_BOUNDS.east &&
        coord.lat >= SERVICE_AREA_BOUNDS.south &&
        coord.lat <= SERVICE_AREA_BOUNDS.north
      );
    });
    const max = Math.max(...validCounts.map(([, count]) => count), 1);

    return validCounts.map(([zip, count]) => {
      const coord = ZIP_COORDINATES[zip];
      const intensity = count / max;
      const level = Math.max(0, Math.min(4, Math.floor(intensity * 5)));
      return {
        zip,
        lat: coord.lat,
        lng: coord.lng,
        count,
        intensity,
        level,
        color: HEAT_LEVEL_COLORS[level],
        radiusMeters: 700 + intensity * 1700,
      };
    });
  }, [data]);

  const topHotspots = useMemo(() => {
    return [...geoHeatPoints]
      .sort((a, b) => b.count - a.count)
      .map((point) => ({ zip: point.zip, count: point.count }))
      .slice(0, 4);
  }, [geoHeatPoints]);

  const initialMapBounds = useMemo<[[number, number], [number, number]]>(() => {
    if (geoHeatPoints.length === 0) {
      return [
        [SERVICE_AREA_BOUNDS.south, SERVICE_AREA_BOUNDS.west],
        [SERVICE_AREA_BOUNDS.north, SERVICE_AREA_BOUNDS.east],
      ];
    }

    const sortedLats = geoHeatPoints.map((point) => point.lat).sort((a, b) => a - b);
    const sortedLngs = geoHeatPoints.map((point) => point.lng).sort((a, b) => a - b);
    const medianLat = sortedLats[Math.floor(sortedLats.length / 2)];
    const medianLng = sortedLngs[Math.floor(sortedLngs.length / 2)];

    const corePoints = geoHeatPoints.filter(
      (point) =>
        Math.abs(point.lat - medianLat) <= 0.12 &&
        Math.abs(point.lng - medianLng) <= 0.12
    );

    const pointsForBounds = corePoints.length >= 3 ? corePoints : geoHeatPoints;
    const latitudes = pointsForBounds.map((point) => point.lat);
    const longitudes = pointsForBounds.map((point) => point.lng);

    return [
      [Math.min(...latitudes) - 0.03, Math.min(...longitudes) - 0.03],
      [Math.max(...latitudes) + 0.03, Math.max(...longitudes) + 0.03],
    ];
  }, [geoHeatPoints]);

  // 2. Correlation Data (Income vs Worry)
  const correlationData = useMemo(() => {
    // Map new string income ranges to numeric approximations for scatter plot
    const incomeMap: Record<string, number> = {
      "Under $50,000": 25,
      "$50,000 - $99,000": 75,
      "$100,000 - $150,000": 125,
      "$150,000 - $200,000": 175,
      "$200,000 or more": 225,
      "Prefer not to say": 125, // Map to middle value instead of filtering out
    };

    // Use allData for correlation to show all responses, not just current period
    const sourceData = allData && allData.length > 0 ? allData : data;

    const points = sourceData.map((d) => ({
      x: incomeMap[d.incomeRange] || 125,
      y: d.worryLevel || 1,
      z: (d.householdSize || 1) * 50,
      rawIncome: d.incomeRange || "Unknown",
      household: d.householdSize || 1,
      rawWorry: d.worryLevel || 1,
    }));

    // If multiple households have identical x/y, nudge them slightly so both remain visible.
    const keyCounts: Record<string, number> = {};
    points.forEach((p) => {
      const key = `${p.x}-${p.y}`;
      keyCounts[key] = (keyCounts[key] || 0) + 1;
    });

    const keySeen: Record<string, number> = {};
    const xSpread = 6;

    return points.map((p) => {
      const key = `${p.x}-${p.y}`;
      const totalAtPoint = keyCounts[key] || 1;
      const seen = keySeen[key] || 0;
      keySeen[key] = seen + 1;

      if (totalAtPoint === 1) {
        return p;
      }

      const centeredOffset = (seen - (totalAtPoint - 1) / 2) * xSpread;
      return {
        ...p,
        x: p.x + centeredOffset,
      };
    });
  }, [data, allData]);

  // 3. Ethnicity Breakdown
  const ethnicityData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((d) => {
      const ethnicities = d.ethnicity || [];
      (Array.isArray(ethnicities) ? ethnicities : []).forEach((eth) => {
        if (eth) {
          counts[eth] = (counts[eth] || 0) + 1;
        }
      });
    });
    return Object.keys(counts).map((k) => ({ name: k, value: counts[k] })).filter(item => item.value > 0);
  }, [data]);

  // 4. Age Breakdown
  const ageData = useMemo(() => {
    const counts: Record<string, number> = {};
    const order = [
      "Under 20",
      "20-39",
      "40-59",
      "Over 60",
      "Prefer not to say",
    ];
    data.forEach((d) => {
      const age = d.ageRange || "Prefer not to say";
      counts[age] = (counts[age] || 0) + 1;
    });

    // Only include ages that exist in the data (have count > 0)
    return order
      .filter((k) => counts[k] && counts[k] > 0)
      .map((k) => ({ name: k, value: counts[k] }));
  }, [data]);

  const countyAreaRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    historicalData.forEach((response) => {
      // Count all valid non-empty ZIP codes
      const zip = response.zipCode && response.zipCode.trim();
      if (zip) {
        counts[zip] = (counts[zip] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([zip, count]) => ({ zip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [historicalData]);

  const topTrendZips = useMemo(() => countyAreaRanking.slice(0, 3).map((entry) => entry.zip), [countyAreaRanking]);

  const areaTrendData = useMemo(() => {
    const grouped: Record<string, SurveyResponse[]> = {};

    historicalData.forEach((response) => {
      const date = new Date(response.timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      grouped[key] = grouped[key] || [];
      grouped[key].push(response);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, responses]) => {
        const [year, month] = key.split("-").map(Number);
        const labelDate = new Date(year, month - 1, 1);
        const row: Record<string, string | number> = {
          month: labelDate.toLocaleString("default", { month: "short" }),
          monthFull: labelDate.toLocaleString("default", { month: "long", year: "numeric" }),
        };

        topTrendZips.forEach((zip) => {
          row[zip] = responses.filter((response) => {
            const responseZip = response.zipCode && response.zipCode.trim();
            return responseZip === zip;
          }).length;
        });

        return row;
      });
  }, [historicalData, topTrendZips]);

  const periodComparison = useMemo(() => {
    const currentCount = data.length;
    const allTimeCount = historicalData.length;

    if (currentCount === 0 || allTimeCount === 0) {
      return {
        currentCount,
        allTimeCount,
        previousCount: 0,
        changePct: 0,
      };
    }

    const timestamps = data.map((response) => new Date(response.timestamp).getTime()).sort((a, b) => a - b);
    const currentStart = timestamps[0];
    const currentEnd = timestamps[timestamps.length - 1];
    const windowMs = Math.max(currentEnd - currentStart, 7 * 24 * 60 * 60 * 1000);

    const previousStart = currentStart - windowMs;
    const previousEnd = currentStart;

    const previousCount = historicalData.filter((response) => {
      const ts = new Date(response.timestamp).getTime();
      return ts >= previousStart && ts < previousEnd;
    }).length;

    const changePct = previousCount > 0 ? Math.round(((currentCount - previousCount) / previousCount) * 100) : 0;

    return {
      currentCount,
      allTimeCount,
      previousCount,
      changePct,
    };
  }, [data, historicalData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vulnerability Correlation */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-[#1b4332] mb-2">
            Income vs. Food Worry
          </h3>
          <p className="text-sm text-stone-500 mb-4">
            Are lower income households more worried? (Bubble size = Family
            Size)
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Est. Income"
                  domain={[0, 250]}
                  ticks={[25, 75, 125, 175, 225]}
                  tickFormatter={(value) => `${value}k`}
                  tick={{ fill: "#57534e", fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Worry Level"
                  domain={[0, 6]}
                  tickCount={6}
                  tick={{ fill: "#57534e", fontSize: 12 }}
                  label={{
                    value: "Worry (1-5)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-stone-200 shadow-lg rounded-lg text-xs">
                          <p className="font-bold text-[#1b4332] mb-1">
                            Household Data
                          </p>
                          <div className="space-y-1">
                            <p className="text-stone-600">
                              Income:{" "}
                              <span className="font-semibold">
                                {d.rawIncome}
                              </span>
                            </p>
                            <p className="text-stone-600">
                              Worry Level:{" "}
                              <span className="font-semibold text-red-500">
                                {d.rawWorry}/5
                              </span>
                            </p>
                            <p className="text-stone-600">
                              Household Size:{" "}
                              <span className="font-semibold">
                                {d.household}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter
                  name="Households"
                  data={correlationData}
                  fill="#2E7D32"
                  fillOpacity={0.65}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ethnicity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-[#1b4332] mb-4">
            Demographic Breakdown
          </h3>
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
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{
                    fontSize: "11px",
                    color: "#44403c",
                    maxWidth: "40%",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Age Distribution */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-[#1b4332] mb-4">
            Age Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ borderRadius: "8px", border: "none" }}
                />
                <Bar
                  dataKey="value"
                  fill="#65a30d"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* San Jose Heat Map */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-[#1b4332] mb-4">
            Response Intensity Map (Service Area)
          </h3>
          <div className="relative h-80 rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
            <MapContainer
              center={SERVICE_AREA_CENTER}
              zoom={10}
              minZoom={9}
              maxZoom={14}
              className="h-full w-full"
              maxBounds={[
                [SERVICE_AREA_BOUNDS.south, SERVICE_AREA_BOUNDS.west],
                [SERVICE_AREA_BOUNDS.north, SERVICE_AREA_BOUNDS.east],
              ]}
              maxBoundsViscosity={1.0}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitBoundsController bounds={initialMapBounds} />

              {geoHeatPoints.map((point) => (
                <Circle
                  key={point.zip}
                  center={[point.lat, point.lng]}
                  radius={point.radiusMeters}
                  pathOptions={{
                    color: point.color,
                    fillColor: point.color,
                    fillOpacity: 0.35 + point.intensity * 0.45,
                    weight: 1,
                  }}
                >
                  <LeafletTooltip direction="top" offset={[0, -4]}>
                    <div className="text-xs">
                      <div className="font-semibold text-[#1b4332]">ZIP {point.zip}</div>
                      <div className="text-stone-700">Responses: {point.count}</div>
                      <div className="text-stone-600">Importance Level: {point.level + 1}/5</div>
                    </div>
                  </LeafletTooltip>
                </Circle>
              ))}
            </MapContainer>

            <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-md px-3 py-2 text-xs text-stone-700 z-[500]">
              <div className="font-semibold text-[#1b4332] mb-1">Heat Intensity</div>
              <div className="flex items-center gap-2">
                <span>Low</span>
                <div className="w-20 h-2 rounded bg-gradient-to-r from-green-200 via-green-400 to-green-800" />
                <span>High</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {topHotspots.map((z) => (
              <div key={z.zip} className="bg-stone-50 border border-stone-200 rounded-md px-3 py-2 text-stone-700">
                <span className="font-semibold text-[#1b4332]">{z.zip}</span>: {z.count} responses
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-[#1b4332] mb-2">Area Change Over Time</h3>
          <p className="text-sm text-stone-500 mb-4">
            Historical trend by top ZIP-code areas (hover points for exact monthly counts).
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={areaTrendData} margin={{ top: 12, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fill: "#57534e", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#57534e", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.monthFull || label}
                />
                {topTrendZips.map((zip, index) => (
                  <Line
                    key={zip}
                    type="monotone"
                    dataKey={zip}
                    name={`ZIP ${zip}`}
                    stroke={HEAT_LEVEL_COLORS[Math.min(index + 1, 4)]}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-[#1b4332] mb-4">Historic vs Current</h3>
          <div className="space-y-3 mb-4">
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
              <p className="text-xs text-stone-500 uppercase tracking-wide">Current View Responses</p>
              <p className="text-2xl font-bold text-[#1b4332]">{periodComparison.currentCount}</p>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
              <p className="text-xs text-stone-500 uppercase tracking-wide">All-Time Responses</p>
              <p className="text-2xl font-bold text-[#1b4332]">{periodComparison.allTimeCount}</p>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
              <p className="text-xs text-stone-500 uppercase tracking-wide">Change vs Previous Window</p>
              <p className={`text-2xl font-bold ${periodComparison.changePct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {periodComparison.changePct >= 0 ? "+" : ""}
                {periodComparison.changePct}%
              </p>
              <p className="text-xs text-stone-500 mt-1">Previous window: {periodComparison.previousCount} responses</p>
            </div>
          </div>

          <h4 className="text-sm font-semibold text-stone-600 uppercase tracking-wide mb-2">County Area Ranking</h4>
          <div className="space-y-2 text-sm">
            {countyAreaRanking.map((entry, index) => (
              <div key={entry.zip} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-md px-3 py-2">
                <span className="text-stone-700">#{index + 1} ZIP {entry.zip}</span>
                <span className="font-semibold text-[#1b4332]">{entry.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
