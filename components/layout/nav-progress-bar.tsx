"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navKey, setNavKey] = useState<string>("");
  const [isNavigating, setIsNavigating] = useState(false);

  const currentKey = `${pathname}?${searchParams.toString()}`;

  // Automatically reset isNavigating when currentKey changes
  if (isNavigating && navKey !== currentKey) {
    setIsNavigating(false);
    setNavKey(currentKey);
  }

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (
        target &&
        target.href &&
        target.href.startsWith(window.location.origin) &&
        !target.hasAttribute("download") &&
        target.target !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const url = new URL(target.href);
        if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener("click", handleLinkClick);
    return () => document.removeEventListener("click", handleLinkClick);
  }, []);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-zinc-900 overflow-hidden pointer-events-none">
      <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 animate-pulse w-full duration-300" />
    </div>
  );
}
