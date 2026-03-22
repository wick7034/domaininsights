import { getAnalyticsResponse, toSearchParams } from "../../server/supabase-api";

export const handler = async (event: any) => {
  const response = await getAnalyticsResponse(toSearchParams(event.queryStringParameters || {}));

  return {
    statusCode: response.status,
    headers: {
      "Content-Type": "application/json",
      ...(response.headers || {}),
    },
    body: JSON.stringify(response.body),
  };
};
