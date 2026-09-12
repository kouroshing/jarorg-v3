"use client";

import React from "react";

/**
 * JarBillowBackground:
 * Provides rich, luminous golden and amber ambient halos across the entire Jar landing page
 * (Hero Section, StatsBar, CtaBanner, JoinUsBanner, and Footer), creating a warm, luxury,
 * living atmosphere inspired by Linear, Stripe, and Billow.so design standards.
 */
export default function JarBillowBackground() {
  return (
    <div 
      className="absolute inset-0 pointer-events-none overflow-hidden -z-10 select-none"
      style={{
        contain: "paint layout",
        transform: "translate3d(0, 0, 0)",
        WebkitTransform: "translate3d(0, 0, 0)",
      }}
      aria-hidden="true"
    >
      {/* 0. Soft Stone Micro-Dot Matrix Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(#66605B 1.25px, transparent 1.25px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 25%, black 45%, transparent 95%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 25%, black 45%, transparent 95%)",
        }}
      />

      {/* 1. HERO SECTION - Luminous Pure White Spotlight + Soft #FAF9F5 Ambient Halo */}
      <div 
        className="absolute -top-10 sm:-top-20 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] sm:h-[850px] flex items-center justify-center pointer-events-none"
      >
        {/* Central Luminous Pure White Spotlight */}
        <div 
          className="w-[700px] sm:w-[950px] lg:w-[1150px] h-[450px] sm:h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.95)_0%,rgba(250,249,245,0.85)_40%,transparent_75%)] blur-[60px] sm:blur-[80px]" 
        />
        {/* Soft #FAF9F5 Warm Paper Ambient Accent on Left Periphery */}
        <div 
          className="absolute top-[10%] left-[2%] sm:left-[8%] w-[420px] sm:w-[520px] h-[360px] sm:h-[450px] rounded-full bg-gradient-to-br from-[#FAF9F5] via-[#F3F1EC] to-transparent blur-[100px] sm:blur-[130px] will-change-transform animate-halo-slow opacity-80" 
        />
        {/* Soft Radiant White Glow on Right Periphery */}
        <div 
          className="absolute top-[12%] right-[2%] sm:right-[8%] w-[440px] sm:w-[540px] h-[370px] sm:h-[460px] rounded-full bg-gradient-to-bl from-white via-[#FAF9F5] to-transparent blur-[100px] sm:blur-[120px] will-change-transform animate-halo-reverse opacity-75" 
        />
      </div>

      {/* 2. MIDDLE METRICS & TRUST SECTION - #FAF9F5 Floating Mist */}
      <div 
        className="absolute top-[34%] left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] flex items-center justify-between opacity-70 pointer-events-none"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0px 500px" }}
      >
        <div className="w-[520px] h-[380px] rounded-full bg-gradient-to-tr from-[#FAF9F5] via-[#F3F1EC] to-transparent blur-[110px] will-change-transform animate-halo-slow" />
        <div className="w-[560px] h-[400px] rounded-full bg-gradient-to-bl from-white via-[#FAF9F5] to-transparent blur-[120px] will-change-transform animate-halo-reverse" />
      </div>

      {/* 3. LOWER CONVERSION CTA & FOOTER - #FAF9F5 Halo Wave */}
      <div 
        className="absolute top-[68%] left-1/2 -translate-x-1/2 w-full max-w-6xl h-[550px] flex items-center justify-around opacity-60 pointer-events-none"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0px 550px" }}
      >
        <div className="w-[600px] h-[420px] rounded-full bg-gradient-to-r from-white via-[#FAF9F5] to-transparent blur-[130px] will-change-transform animate-halo-reverse" />
        <div className="w-[500px] h-[360px] rounded-full bg-gradient-to-l from-[#FAF9F5] via-[#F3F1EC] to-transparent blur-[110px] will-change-transform animate-halo-slow" />
      </div>
    </div>
  );
}
