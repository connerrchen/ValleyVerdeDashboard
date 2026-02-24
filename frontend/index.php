<?php
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (str_starts_with($path, '/assets/')) {
  $file = __DIR__ . $path;
  if (!is_file($file)) { http_response_code(404); exit('Not found'); }
  $ext = pathinfo($file, PATHINFO_EXTENSION);
  $mime = [
    'css' => 'text/css; charset=utf-8',
    'js'  => 'application/javascript; charset=utf-8',
    'svg' => 'image/svg+xml; charset=utf-8',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
  ][$ext] ?? 'application/octet-stream';
  header("Content-Type: $mime");
  readfile($file);
  exit;
}

function json_out($data, int $code=200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$view = $_GET['view'] ?? 'month';
$view = in_array($view, ['day','week','month'], true) ? $view : 'month';

function rand_seeded(string $key): void { mt_srand(abs(crc32($key)) % 100000); }

$NEEDS = [
  'food_too_expensive' => 'Food is too expensive',
  'hard_to_grocery'    => "It's too difficult to go to the grocery store",
  'cant_find_healthy'  => "Can't find healthy food",
  'cant_find_cultural' => "Can't find food from my culture",
  'cant_afford_baby'   => "Can't afford formula/baby food",
  'cant_find_health'   => "Can't find food for my health problem",
  'no_time_energy'     => "Don't have enough time/energy to make food",
  'dont_know_cook'     => "Don't know how to cook certain foods",
  'cant_leave_house'   => "Can't leave the house to purchase food",
];

function labels_for_view(string $view): array {
  if ($view === 'day') {
    // last 14 days
    $out = [];
    $d = new DateTime('today');
    for ($i=13; $i>=0; $i--) $out[] = (clone $d)->modify("-$i days")->format('m-d');
    return $out;
  }
  if ($view === 'week') {
    // last 10 weeks
    $out = [];
    $d = new DateTime('monday this week');
    for ($i=9; $i>=0; $i--) $out[] = "W" . (clone $d)->modify("-$i weeks")->format('W');
    return $out;
  }
  // month: last 12 months
  $out = [];
  $d = new DateTime('first day of this month');
  for ($i=11; $i>=0; $i--) $out[] = (clone $d)->modify("-$i months")->format('Y-m');
  return $out;
}

if (str_starts_with($path, '/api/')) {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Headers: Content-Type');
  header('Access-Control-Allow-Methods: GET,OPTIONS');
  if ($method === 'OPTIONS') exit;

  rand_seeded("vv_display:$view");

  if ($path === '/api/summary') {
    $submissions = mt_rand(80, 1200);
    $zipCoverage = mt_rand(6, 24);
    json_out([
      'view' => $view,
      'submissions' => $submissions,
      'zipCoverage' => $zipCoverage,
      'lastUpdated' => (new DateTime())->format(DateTime::ATOM),
    ]);
  }

  if ($path === '/api/needs-timeseries') {
    $x = labels_for_view($view);
    $series = [];
    foreach ($NEEDS as $k => $label) {
      $vals = [];
      $base = mt_rand(1, 18);
      for ($i=0; $i<count($x); $i++) {
        $trend = (int)round($i * mt_rand(0, 2) * 0.55);
        $noise = mt_rand(-2, 3);
        $vals[] = max(0, $base + $trend + $noise);
      }
      $series[] = ['key'=>$k, 'label'=>$label, 'values'=>$vals];
    }
    json_out(['view'=>$view, 'x'=>$x, 'series'=>$series]);
  }

  if ($path === '/api/top-needs') {
    $items = [];
    foreach ($NEEDS as $k => $label) $items[] = ['key'=>$k,'label'=>$label,'count'=>mt_rand(0, 180)];
    usort($items, fn($a,$b)=>$b['count']<=>$a['count']);
    json_out(['view'=>$view, 'items'=>array_slice($items, 0, 8)]);
  }

  if ($path === '/api/zip-distribution') {
    $zips = ['95050','95051','95054','95035','95110','95112','95116','95117','95122','95123','95126','95127','95128','95133'];
    $items = [];
    foreach ($zips as $zip) $items[] = ['zip'=>$zip,'count'=>mt_rand(0, 90)];
    json_out(['view'=>$view, 'items'=>$items]);
  }

  if ($path === '/api/text-topics') {
    // mock: top keywords/topics extracted from free text
    $topics = [
      'rent', 'transportation', 'childcare', 'diabetes', 'fresh produce',
      'work schedule', 'immigration', 'senior support', 'language barrier', 'housing'
    ];
    shuffle($topics);
    $out = [];
    $x = labels_for_view($view);
    $k = mt_rand(6, 10);
    for ($i=0; $i<$k; $i++) {
      $vals = [];
      $base = mt_rand(0, 10);
      for ($j=0; $j<count($x); $j++) $vals[] = max(0, $base + mt_rand(-2, 4) + (int)round($j*0.25));
      $out[] = ['topic'=>$topics[$i], 'values'=>$vals, 'total'=>array_sum($vals)];
    }
    usort($out, fn($a,$b)=>$b['total']<=>$a['total']);
    json_out(['view'=>$view, 'x'=>$x, 'items'=>$out]);
  }

  if ($path === '/api/report') {
    json_out([
      'view'=>$view,
      'downloadUrl'=> '/api/report/download?view=' . urlencode($view),
    ]);
  }

  if ($path === '/api/report/download') {
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="vv-dashboard-report-mock.pdf"');
    echo "%PDF-1.4\n% Mock PDF placeholder\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF";
    exit;
  }

  json_out(['error'=>'Unknown route'], 404);
}

?><!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>VV Dashboard (Display-only Mock)</title>
  <link rel="stylesheet" href="assets/app.css" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.heat/dist/leaflet-heat.js"></script>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <div class="logo">VV</div>
        <div>
          <div class="title">Data Dashboard</div>
          <div class="subtitle">Display-only • Mock APIs • Ready for real backend</div>
        </div>
      </div>

      <div class="controls">
        <div class="segmented" role="tablist" aria-label="Time view">
          <button class="seg" data-view="day">Day</button>
          <button class="seg" data-view="week">Week</button>
          <button class="seg active" data-view="month">Month</button>
        </div>
        <button class="btn" id="btnRefresh">Refresh</button>
        <button class="btn primary" id="btnDownload">Download Report</button>
      </div>
    </header>

    <main class="grid">
      <section class="card kpis">
        <div class="kpi">
          <div class="kpiLabel">Submissions</div>
          <div class="kpiValue" id="kpiSubmissions">—</div>
        </div>
        <div class="kpi">
          <div class="kpiLabel">ZIP Coverage</div>
          <div class="kpiValue" id="kpiZipCoverage">—</div>
        </div>
        <div class="kpi">
          <div class="kpiLabel">Last Updated</div>
          <div class="kpiValue small" id="kpiUpdated">—</div>
        </div>
      </section>

      <section class="card span2">
        <div class="cardHeader">
          <h2>Needs Over Time</h2>
          <p>Trend + seasonality (mock). Swap series for real aggregation later.</p>
        </div>
        <div class="cardBody">
          <canvas id="chartNeeds" height="120"></canvas>
        </div>
      </section>

      <section class="card">
        <div class="cardHeader">
          <h2>Top Needs</h2>
          <p>Highest counts in current view.</p>
        </div>
        <div class="cardBody">
          <ol class="ranking" id="rankingList"></ol>
        </div>
      </section>

      <section class="card span2">
        <div class="cardHeader">
          <h2>Text Topics / Keywords</h2>
          <p>Mock “pattern finding” for large text datasets (topic/keyword trends).</p>
        </div>
        <div class="cardBody">
          <div class="topics" id="topics"></div>
        </div>
      </section>

      <section class="card span2">
        <div class="cardHeader">
          <section class="card span2">
          <div class="cardHeader">
            <h2>ZIP Heatmap</h2>
            <p>Hotter areas indicate more reported needs. (Mock ZIP centroid heat)</p>
          </div>
          <div class="cardBody">
            <div class="mapBox">
              <div id="zipMap"></div>
            </div>
            <div class="mapLegend">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        </section>
        </div>
        <div class="cardBody">
          <table class="table" id="zipTable">
            <thead>
              <tr>
                <th>ZIP</th>
                <th class="right">Count</th>
                <th>Intensity</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>
    </main>

    <footer class="footer">
      <span>Goal: “make information useful quickly” for real-time updated datasets. :contentReference[oaicite:1]{index=1}</span>
    </footer>
  </div>

  <script src="assets/app.js"></script>
</body>
</html>