import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030303] px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-bold text-white">404</h1>
        <h2 className="mt-4 text-xl font-display text-white">Off route</h2>
        <Link to="/" className="mt-6 inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-bold text-black">
          Back to base
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "root" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030303] px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-display text-white">Something failed</h1>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-white px-4 py-2 text-sm font-bold text-black"
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#030303" },
      { title: "MotoNav — Motorcycle Companion" },
      { name: "description", content: "MotoNav: premium motorcycle dashboard, maintenance tracker, IoT navigator, and SOS — all in one." },
      { property: "og:title", content: "MotoNav" },
      { property: "og:description", content: "Premium motorcycle companion app — navigation, maintenance, IoT and SOS." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body className="bg-[#030303] text-white">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: "#080808", border: "1px solid #1c1c1c", color: "#fff", fontFamily: "Rajdhani, sans-serif" } }} />
    </QueryClientProvider>
  );
}
