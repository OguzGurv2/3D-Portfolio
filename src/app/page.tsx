"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const DesktopPage = dynamic(() => import("@/(desktop)/page"), { ssr: false });
const MobilePage  = dynamic(() => import("@/(mobile)/page"),  { ssr: false });

export default function Root() {
  // null = not yet determined (avoids hydration mismatch)
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  if (isMobile === null) return null;
  return isMobile ? <MobilePage /> : <DesktopPage />;
}
