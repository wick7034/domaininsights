import { getDomainsResponse, toSearchParams } from "../server/supabase-api";

export default async function handler(req: any, res: any) {
  const response = await getDomainsResponse(toSearchParams(req.query));
  res.status(response.status).json(response.body);
}
