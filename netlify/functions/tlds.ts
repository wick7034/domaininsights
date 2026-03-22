import { getTldsResponse } from "../../server/supabase-api";

export const handler = async () => {
  const response = await getTldsResponse();

  return {
    statusCode: response.status,
    headers: {
      "Content-Type": "application/json",
      ...(response.headers || {}),
    },
    body: JSON.stringify(response.body),
  };
};
