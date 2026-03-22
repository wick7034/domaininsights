import { getTldsResponse } from "../server/supabase-api";

export default async function handler(_req: any, res: any) {
  const response = await getTldsResponse();
  if (response.headers) {
    for (const [headerName, headerValue] of Object.entries(response.headers)) {
      res.setHeader(headerName, headerValue);
    }
  }
  res.status(response.status).json(response.body);
}
