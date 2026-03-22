import { getTldsResponse } from "../server/supabase-api";

export default async function handler(_req: any, res: any) {
  const response = await getTldsResponse();
  res.status(response.status).json(response.body);
}
