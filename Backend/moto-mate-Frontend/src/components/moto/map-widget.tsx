import { lazy, Suspense, useEffect, useState } from "react";

const LeafletMap = lazy(() => import("./leaflet-map"));

type DestType = { lat: number; lng: number; name?: string } | null;

type MapWidgetProps = {
  userLocation: [number, number] | null;
  destination?: DestType;
  routeGeometry?: [number, number][];
  height?: string;
  className?: string;
  followUser?: boolean;
  /** Compass heading in degrees 0-360 — rotates the user nav arrow */
  heading?: number | null;
};

const Skeleton = ({ height, className = "" }: { height: string; className?: string }) => (
  <div className={`${height} overflow-hidden rounded-xl bg-[#0e1218] flex items-center justify-center ${className}`}>
    <span className="font-display text-[10px] tracking-widest text-[#333]">MAP</span>
  </div>
);

export function MapWidget({
  userLocation,
  destination,
  routeGeometry,
  height = "h-52",
  className = "",
  followUser = false,
  heading,
}: MapWidgetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <Skeleton height={height} className={className} />;

  return (
    <div className={`${height} overflow-hidden rounded-xl ${className}`}>
      <Suspense fallback={<Skeleton height={height} />}>
        <LeafletMap
          userLocation={userLocation}
          destination={destination}
          routeGeometry={routeGeometry}
          followUser={followUser}
          heading={heading}
        />
      </Suspense>
    </div>
  );
}
