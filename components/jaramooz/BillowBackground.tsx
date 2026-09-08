"use client";

import React from "react";

export default function BillowBackground() {
  return (
    <div 
      className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none"
      style={{
        transform: "translate3d(0, 0, 0)",
        WebkitTransform: "translate3d(0, 0, 0)",
      }}
    >
      {/* ========================================================= */}
      {/* 0. HERO SECTION - Multi-Layered White Cloud & Sky Halo    */}
      {/* ========================================================= */}
      <div 
        className="absolute -top-10 sm:-top-20 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[680px] sm:h-[850px] flex items-center justify-center pointer-events-none"
      >
        {/* Layer 1: Ethereal Soft Sky Blue Back-Glow (هاله زمینه آسمانی نرم) */}
        <div 
          className="w-[620px] sm:w-[920px] lg:w-[1150px] h-[420px] sm:h-[560px] rounded-full blur-[110px] sm:blur-[140px] will-change-transform animate-halo-slow pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0,128,255,0.18) 0%, rgba(56,189,248,0.14) 40%, rgba(34,211,238,0.04) 60%, rgba(255,255,255,0) 72%)"
          }}
        />

        {/* Layer 2: PRIMARY RADIANT WHITE CLOUD CORE (لایه مرکزی و بزرگ سفید درخشان) */}
        <div 
          className="absolute w-[440px] sm:w-[760px] lg:w-[980px] h-[320px] sm:h-[480px] rounded-full blur-[60px] sm:blur-[95px] will-change-transform animate-halo-reverse pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.98) 0%, rgba(240,249,255,0.7) 45%, rgba(255,255,255,0) 70%)"
          }}
        />

        {/* Layer 3: Floating Crisp White Mist - Top Right (تکه ابر سفید شناور سمت راست) */}
        <div 
          className="absolute top-[8%] right-[2%] sm:right-[14%] w-[300px] sm:w-[480px] h-[240px] sm:h-[380px] rounded-full blur-[65px] sm:blur-[90px] will-change-transform animate-halo-breeze pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(224,242,254,0.45) 45%, rgba(255,255,255,0) 70%)"
          }}
        />

        {/* Layer 4: Floating Crisp White Mist - Top Left (تکه ابر سفید شناور سمت چپ) */}
        <div 
          className="absolute top-[18%] left-[0%] sm:left-[10%] w-[280px] sm:w-[440px] h-[220px] sm:h-[350px] rounded-full blur-[60px] sm:blur-[85px] will-change-transform animate-halo-slow pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0) 70%)"
          }}
        />

        {/* Layer 5: Accent Morning Sky Ribbon (روبان باریک آسمانی ملایم) */}
        <div 
          className="absolute -top-[5%] left-[25%] w-[320px] sm:w-[500px] h-[200px] sm:h-[300px] rounded-full blur-[80px] sm:blur-[100px] will-change-transform animate-halo-breeze pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(34,211,238,0.2) 0%, rgba(125,211,252,0.15) 40%, rgba(255,255,255,0) 70%)"
          }}
        />
      </div>

      {/* ========================================================= */}
      {/* 1. Bento & Features Section - White Cloud Mist            */}
      {/* ========================================================= */}
      <div 
        className="absolute top-[28%] left-1/2 -translate-x-1/2 w-full max-w-6xl h-[460px] flex items-center justify-between pointer-events-none"
      >
        {/* Right White Cloud Swell */}
        <div 
          className="w-[360px] sm:w-[520px] h-[280px] sm:h-[380px] rounded-full blur-[75px] sm:blur-[100px] will-change-transform animate-halo-slow pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.92) 0%, rgba(224,242,254,0.45) 45%, rgba(255,255,255,0) 70%)"
          }}
        />
        
        {/* Central Luminous White Glow */}
        <div 
          className="w-[380px] sm:w-[560px] h-[260px] sm:h-[360px] rounded-full blur-[70px] sm:blur-[95px] will-change-transform animate-halo-reverse pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(240,249,255,0.55) 45%, rgba(255,255,255,0) 70%)"
          }}
        />
        
        {/* Left Sky Accent */}
        <div 
          className="w-[340px] sm:w-[480px] h-[260px] sm:h-[360px] rounded-full blur-[80px] sm:blur-[105px] will-change-transform pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(34,211,238,0.2) 0%, rgba(125,211,252,0.12) 40%, rgba(255,255,255,0) 70%)"
          }}
        />
      </div>

      {/* ========================================================= */}
      {/* 2. Middle Comparison & Partners - White Cloud Wave       */}
      {/* ========================================================= */}
      <div 
        className="absolute top-[55%] left-1/2 -translate-x-1/2 w-full max-w-6xl h-[520px] flex items-center justify-around pointer-events-none"
      >
        {/* Prominent White Wave */}
        <div 
          className="w-[420px] sm:w-[620px] h-[300px] sm:h-[420px] rounded-full blur-[85px] sm:blur-[115px] will-change-transform animate-halo-slow pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.92) 0%, rgba(224,242,254,0.45) 45%, rgba(255,255,255,0) 70%)"
          }}
        />
        
        {/* Soft Sky Fill */}
        <div 
          className="w-[380px] sm:w-[500px] h-[280px] sm:h-[360px] rounded-full blur-[80px] sm:blur-[100px] will-change-transform animate-halo-breeze pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(125,211,252,0.22) 0%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0) 70%)"
          }}
        />
      </div>

      {/* ========================================================= */}
      {/* 3. Instructor, Syllabus & Purchase CTA Cloud Halo        */}
      {/* ========================================================= */}
      <div 
        className="absolute top-[80%] left-1/2 -translate-x-1/2 w-full max-w-6xl h-[560px] flex items-center justify-between pointer-events-none"
      >
        {/* Right White Cloud */}
        <div 
          className="w-[400px] sm:w-[580px] h-[300px] sm:h-[420px] rounded-full blur-[85px] sm:blur-[115px] will-change-transform animate-halo-reverse pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(224,242,254,0.45) 45%, rgba(255,255,255,0) 70%)"
          }}
        />
        
        {/* Left Soft Pearl Glow */}
        <div 
          className="w-[420px] sm:w-[600px] h-[320px] sm:h-[440px] rounded-full blur-[90px] sm:blur-[120px] will-change-transform animate-halo-slow pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(125,211,252,0.2) 45%, rgba(255,255,255,0) 70%)"
          }}
        />
      </div>

      {/* ========================================================= */}
      {/* Ultra-Clean Micro-Dot Matrix                             */}
      {/* ========================================================= */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(#001c2e 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 85% 60% at 50% 25%, black 40%, transparent 95%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 60% at 50% 25%, black 40%, transparent 95%)",
        }}
      />
    </div>
  );
}
