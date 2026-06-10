import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// All backend logic (MongoDB, Gemini, weather) now lives in moto-mate-backend/.
// This file is kept for any future TanStack Start server-only helpers.

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
  };
}
