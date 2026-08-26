/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface MemberAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  fallbackClassName?: string;
  alt?: string;
}

export function MemberAvatar({
  src,
  name = "Member",
  className,
  fallbackClassName,
  alt,
}: MemberAvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Clean initials fallback
  const cleanName = (name || "").replace(/^@/, "").trim();
  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : "M";

  const hasValidSrc = Boolean(src && typeof src === "string" && src.trim().length > 0 && !hasError);

  if (hasValidSrc && src) {
    return (
      <div className={cn("relative overflow-hidden bg-zinc-950 flex items-center justify-center shrink-0", className)}>
        <img
          src={src}
          alt={alt || name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-zinc-950 flex items-center justify-center font-semibold text-zinc-100 shrink-0 select-none",
        className,
        fallbackClassName
      )}
    >
      {initial}
    </div>
  );
}
