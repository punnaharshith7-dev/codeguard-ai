/** Illustrative values only. Replace this object with verified telemetry before making live claims. */
export const scaleDemoData = {
  label: "Sample data · Demo traffic",
  profileLabel: "Demo load profile",
  requestsPerSecond: [80_000, 79_840, 80_000, 79_920],
  tickerIntervalMs: 3_200,
  latency: [
    { label: "P50", valueMs: 18, color: "#72eaff", samples: [15, 17, 16, 19, 18, 16, 18, 17, 20, 18, 17, 18] },
    { label: "P95", valueMs: 46, color: "#a88aff", samples: [38, 43, 41, 48, 45, 42, 49, 46, 44, 51, 47, 46] },
    { label: "P99", valueMs: 82, color: "#4de7b4", samples: [71, 78, 74, 86, 80, 77, 89, 83, 78, 87, 84, 82] },
  ],
  availability: { segments: 28, operationalSegments: 27, label: "Operational · demo state" },
  queue: { percent: 34, label: "Scan queue", capacityLabel: "Illustrative capacity" },
  regions: [
    { id: "americas", label: "Americas", x: 82, y: 100 },
    { id: "europe", label: "Europe", x: 202, y: 70 },
    { id: "asia-pacific", label: "Asia Pacific", x: 318, y: 113 },
  ],
  arcs: [
    { id: "americas-europe", from: "americas", to: "europe", path: "M 82 100 Q 138 17 202 70" },
    { id: "europe-asia", from: "europe", to: "asia-pacific", path: "M 202 70 Q 267 31 318 113" },
    { id: "asia-americas", from: "asia-pacific", to: "americas", path: "M 318 113 Q 199 194 82 100" },
    { id: "americas-asia", from: "americas", to: "asia-pacific", path: "M 82 100 Q 199 42 318 113" },
  ],
  events: [
    { kind: "SCAN", tone: "cyan", text: "Dependency review completed · manifest checked" },
    { kind: "FINDING", tone: "amber", text: "Secret pattern flagged · review queued" },
    { kind: "PATCH", tone: "green", text: "Patch proposal prepared · awaiting approval" },
    { kind: "SCAN", tone: "cyan", text: "Static analysis completed · results ready" },
    { kind: "FINDING", tone: "red", text: "High severity finding · human review needed" },
  ],
} as const;
