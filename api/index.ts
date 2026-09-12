/**
 * Vercel Serverless Function fallback entry point.
 * Returns API metadata and status with zero local module dependencies.
 */
export default function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: "ok",
    service: "Review Master AI API",
    endpoints: [
      "/api/generate-reviewer",
      "/api/grade-identification",
      "/api/health"
    ],
    timestamp: new Date().toISOString()
  });
}

