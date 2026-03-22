import { getAnalyticsResponse, toSearchParams } from "../server/supabase-api";

export default async function handler(req: any, res: any) {
  const response = await getAnalyticsResponse(toSearchParams(req.query));
  res.status(response.status).json(response.body);
}
