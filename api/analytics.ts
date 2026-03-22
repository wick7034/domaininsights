import { getAnalyticsResponse, toSearchParams } from "../server/supabase-api";

export default async function handler(req: any, res: any) {
  const response = await getAnalyticsResponse(toSearchParams(req.query));
  if (response.headers) {
    for (const [headerName, headerValue] of Object.entries(response.headers)) {
      res.setHeader(headerName, headerValue);
    }
  }
  res.status(response.status).json(response.body);
}
