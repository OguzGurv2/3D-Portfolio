"use client";

import { useState } from "react";

import LoadingScreen from "@/components/LoadingScreen";
import ScrollAnimation from "@/components/ScrollAnimation";

export default function Home() {
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#121212] text-[#ededed]">
      {showLoadingScreen ? (
        <LoadingScreen />
      ) : (
        <ScrollAnimation onComplete={() => setShowLoadingScreen(true)} />
      )}
    </main>
  );
}


