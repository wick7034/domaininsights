import { getTldsResponse } from "../../server/supabase-api";

export const handler = async () => {
  const response = await getTldsResponse();

  return {
    statusCode: response.status,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response.body),
  };
};
