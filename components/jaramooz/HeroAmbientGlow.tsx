"use client";

import React from "react";
import { motion } from "framer-motion";

interface HeroAmbientGlowProps {
  colorTheme?: "blue" | "yellow";
}

export default function HeroAmbientGlow({ colorTheme = "blue" }: HeroAmbientGlowProps) {
  const isYellow = colorTheme === "yellow";

  return (
    <div 
      className="absolute top-0 inset-x-0 w-full h-[1150px] pointer-events-none overflow-hidden z-0"
      style={{
        maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)",
        contain: "paint layout",
        transform: "translate3d(0, 0, 0)",
        WebkitTransform: "translate3d(0, 0, 0)",
      }}
    >
      {/* 1. Fast & Organic Wave-Morphing Sky-Blue/Yellow Blob (Hardware-Accelerated transform/opacity only) */}
      <motion.div
        animate={{
          x: [0, 65, 20, -50, 0],
          y: [0, -45, 35, -20, 0],
          scale: [1, 1.18, 0.92, 1.14, 1],
          rotate: [0, 25, -15, 10, 0],
        }}
        transition={{
          duration: 2.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          top: "-50px",
          right: "8%",
          willChange: "transform",
          transform: "translate3d(0, 0, 0)",
        }}
        className={`w-[520px] h-[400px] sm:w-[780px] sm:h-[580px] lg:w-[920px] lg:h-[650px] rounded-full blur-[48px] sm:blur-[70px] max-sm:blur-[36px] max-sm:w-[380px] max-sm:h-[320px] max-sm:right-[-20px] max-sm:top-[-40px]
          ${isYellow 
            ? "bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.25)_0%,rgba(245,158,11,0.20)_55%,rgba(250,204,21,0)_80%)] max-sm:bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.18)_0%,rgba(245,158,11,0.12)_55%,rgba(250,204,21,0)_80%)]" 
            : "bg-[radial-gradient(circle_at_center,rgba(0,145,255,0.42)_0%,rgba(0,96,151,0.26)_55%,rgba(0,145,255,0)_80%)] max-sm:bg-[radial-gradient(circle_at_center,rgba(0,145,255,0.28)_0%,rgba(0,96,151,0.15)_55%,rgba(0,145,255,0)_80%)]"
          }`}
      />

      {/* 2. Fast & Organic Wave-Morphing Ocean-Blue/Amber Blob */}
      <motion.div
        animate={{
          x: [0, -60, -20, 55, 0],
          y: [0, 45, -35, 25, 0],
          scale: [1, 0.90, 1.20, 0.95, 1],
          rotate: [0, -20, 30, -15, 0],
        }}
        transition={{
          duration: 3.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          top: "180px",
          left: "6%",
          willChange: "transform",
          transform: "translate3d(0, 0, 0)",
        }}
        className={`w-[480px] h-[380px] sm:w-[750px] sm:h-[550px] lg:w-[880px] lg:h-[620px] rounded-full blur-[52px] sm:blur-[75px] max-sm:blur-[38px] max-sm:w-[360px] max-sm:h-[300px] max-sm:left-[-20px] max-sm:top-[240px]
          ${isYellow
            ? "bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.22)_0%,rgba(250,204,21,0.18)_60%,rgba(245,158,11,0)_80%)] max-sm:bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0%,rgba(250,204,21,0.12)_60%,rgba(245,158,11,0)_80%)]"
            : "bg-[radial-gradient(circle_at_center,rgba(0,96,151,0.40)_0%,rgba(14,165,233,0.25)_60%,rgba(0,96,151,0)_80%)] max-sm:bg-[radial-gradient(circle_at_center,rgba(0,96,151,0.26)_0%,rgba(14,165,233,0.14)_60%,rgba(0,96,151,0)_80%)]"
          }`}
      />

      {/* 3. Central Ambient Atmospheric Halo (Desktop Only) */}
      <motion.div
        animate={{
          scale: [0.94, 1.10, 0.94],
          rotate: [0, 15, -15, 0],
          opacity: [0.30, 0.55, 0.30],
        }}
        transition={{
          duration: 3.0,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          top: "90px",
          left: "50%",
          transform: "translate3d(-50%, 0, 0)",
          width: "740px",
          height: "480px",
          borderRadius: "9999px",
          background: isYellow 
            ? "radial-gradient(ellipse 65% 55% at 50% 45%, rgba(253, 224, 71, 0.22) 0%, rgba(217, 119, 6, 0.12) 50%, transparent 80%)"
            : "radial-gradient(ellipse 65% 55% at 50% 45%, rgba(56, 189, 248, 0.30) 0%, rgba(0, 96, 151, 0.15) 50%, transparent 80%)",
          filter: "blur(65px)",
          WebkitFilter: "blur(65px)",
          willChange: "transform, opacity",
        }}
        className="hidden sm:block"
      />
    </div>
  );
}
