import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import {
  getAnalyticsResponse,
  getDomainsResponse,
  getTldsResponse,
  toSearchParams,
} from "./server/supabase-api";

dotenv.config();

function sendApiResponse(res: express.Response, response: Awaited<ReturnType<typeof getDomainsResponse>>) {
  if (response.headers) {
    for (const [headerName, headerValue] of Object.entries(response.headers)) {
      res.setHeader(headerName, headerValue);
    }
  }

  res.status(response.status).json(response.body);
}

export async function createApp() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get("/api/domains", async (req, res) => {
    const response = await getDomainsResponse(toSearchParams(req.query as Record<string, unknown>));
    sendApiResponse(res, response);
  });

  app.get("/api/tlds", async (req, res) => {
    const response = await getTldsResponse();
    sendApiResponse(res, response);
  });

  app.get("/api/analytics", async (req, res) => {
    const response = await getAnalyticsResponse(toSearchParams(req.query as Record<string, unknown>));
    sendApiResponse(res, response);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  await createApp();
}

startServer();
