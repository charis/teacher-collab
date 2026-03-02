"use client";

// Library imports
import React, { useEffect, useState } from "react";
import Image from "next/image";

interface ResponsiveImageProps {
    src         : string;
    alt?        : string;
    className?  : string;
    maxHeightVh?: number;
    quality?    : number;
    sizes?      : string;
}

/**
 * Renders a responsive Next.js `<Image>` that adapts to the original image's aspect ratio.
 *
 * This component dynamically measures the image’s intrinsic width and height at runtime
 * (via `Image()` in the browser) and then renders a responsive `<Image>` that fills the
 * container width (`width: 100%`) while maintaining its natural aspect ratio (`height: auto`).
 *
 * It supports an optional `maxHeightVh` property to prevent very tall images from
 * overflowing the viewport.
 *
 * @param src         - Image URL (required)
 * @param alt         - Alternative text for accessibility
 * @param className   - Optional Tailwind or custom CSS classes
 * @param maxHeightVh - Optional maximum height (in viewport height units, e.g. 60 → 60vh)
 * @param quality     - Image optimization quality (1–100)
 * @param sizes       - Responsive image sizes hint (passed to Next.js `<Image>`)
 *
 * @returns a responsive image component that adjusts its aspect ratio automatically
 */
export default function ResponsiveImage({ src,
                                          alt = "image",
                                          className = "",
                                          maxHeightVh,
                                          quality = 90,
                                          sizes,
                                       }: ResponsiveImageProps) {
    const [intrinsic, setIntrinsic] = useState<{
                                          width : number
                                          height: number
                                      } | null>(null
    );
    const [loadError, setLoadError] = useState(false);
    
    useEffect(() => {
        if (!src) {
            return;
        }
        
        let cancelled = false;
        const image = new window.Image();
        image.src = src;
        image.onload = () => {
            if (!cancelled) {
                setIntrinsic({
                    width : image.naturalWidth,
                    height: image.naturalHeight
                });
            }
        };
        
        image.onerror = () => {
            if (!cancelled) {
                setLoadError(true);
            }
        };
        
        return () => {
            cancelled = true;
        };
    }, [src]);
    
    // While the image is still being measured, render a placeholder container
    if (!intrinsic && !loadError) {
         return <div className={`w-full ${className}`} aria-hidden="true" />;
    }
    
    // If loading failed, render a textual fallback
    if (loadError) {
        return (
          <div className={`w-full text-center text-sm text-muted-foreground ${className}`}>
              Image failed to load
          </div>
        );
    }
    
    // At this point, intrinsic is definitely non-null
    const { width: intrinsicWidth, height: intrinsicHeight } = intrinsic!;
    
    // Responsive rendering using intrinsic dimensions
    const style: React.CSSProperties = { width: "100%", height: "auto" };
    const wrapperClass = maxHeightVh? `max-h-[${maxHeightVh}vh] overflow-auto` : "";
    
    return (
      <div className={`w-full ${wrapperClass} ${className}`}>
        <Image src      = {src}
               alt      = {alt}
               width    = {intrinsicWidth}
               height   = {intrinsicHeight}
               quality  = {quality}
               sizes    = {sizes}
               style    = {style}
               className= "object-contain"
        />
      </div>
    );
}
