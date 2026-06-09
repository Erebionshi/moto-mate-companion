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
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-4">
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
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-4">
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
      { name: "theme-color", content: "#0B0F14" },
      { title: "MotoNav — Motorcycle Companion" },
      { name: "description", content: "MotoNav: premium motorcycle dashboard, maintenance tracker, IoT navigator, and SOS — all in one." },
      { property: "og:title", content: "MotoNav — Motorcycle Companion" },
      { property: "og:description", content: "MotoNav: premium motorcycle dashboard, maintenance tracker, IoT navigator, and SOS — all in one." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "MotoNav — Motorcycle Companion" },
      { name: "twitter:description", content: "MotoNav: premium motorcycle dashboard, maintenance tracker, IoT navigator, and SOS — all in one." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4676423b-364f-4ac4-ae3e-043b34dda23f/id-preview-c75c5740--0590dbf9-279c-46e5-9bb5-c41bb3de243f.lovable.app-1780888125588.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4676423b-364f-4ac4-ae3e-043b34dda23f/id-preview-c75c5740--0590dbf9-279c-46e5-9bb5-c41bb3de243f.lovable.app-1780888125588.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
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
      <body className="bg-[#0B0F14] text-white">
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
      <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: "#171F2B", border: "1px solid #1f2937", color: "#fff", fontFamily: "Inter, sans-serif" } }} />
    </QueryClientProvider>
  );
}
