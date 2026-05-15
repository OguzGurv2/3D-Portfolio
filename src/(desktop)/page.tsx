"use client";

import { useState, ComponentType } from "react";

import ScrollAnimation from "@/_components/ScrollAnimation";
import LoadingScreen from "@/_components/LoadingScreen";

const MIN_LOADING_MS = 1500;

function minDelay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type Phase = "scroll" | "loading" | "login" | "desktop";

export default function DesktopPage() {
  const [phase, setPhase] = useState<Phase>("scroll");
  const [LoginComp, setLoginComp] = useState<ComponentType<{ onLogin: () => void }> | null>(null);
  const [DesktopComp, setDesktopComp] = useState<ComponentType<Record<string, never>> | null>(null);

  function handleScrollComplete() {
    setPhase("loading");
    Promise.all([
      import("@/_components/LoginScreen").then((m) => m.default),
      minDelay(MIN_LOADING_MS),
    ]).then(([Comp]) => {
      setLoginComp(() => Comp);
      setPhase("login");
    });
  }

  function handleLoginComplete() {
    setPhase("loading");
    Promise.all([
      import("./home/page").then((m) => m.default),
      minDelay(MIN_LOADING_MS),
    ]).then(([Comp]) => {
      setDesktopComp(() => Comp as ComponentType<Record<string, never>>);
      setPhase("desktop");
    });
  }

  if (phase === "scroll")
    return <ScrollAnimation onComplete={handleScrollComplete} />;

  if (phase === "loading")
    return <LoadingScreen />;

  if (phase === "login" && LoginComp)
    return <LoginComp onLogin={handleLoginComplete} />;

  if (phase === "desktop" && DesktopComp)
    return <DesktopComp />;

  return <LoadingScreen />;
}
