"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type StudentAvatarProps = {
  alt: string;
  className?: string;
  fallbackSrc: string;
  sizes?: string;
  src: string;
};

export function StudentAvatar({
  alt,
  className = "object-cover",
  fallbackSrc,
  sizes = "48px",
  src,
}: StudentAvatarProps) {
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentSrc(src);
  }, [src]);

  return (
    <Image
      alt={alt}
      className={className}
      fill
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
      sizes={sizes}
      src={currentSrc}
      unoptimized
    />
  );
}
