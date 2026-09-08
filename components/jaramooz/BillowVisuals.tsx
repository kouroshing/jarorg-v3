"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, ShieldCheck, Award, Zap, Camera, Sun, Sliders, Layers, FileCheck } from "lucide-react";

/**
 * Animated Hero Decorative Badges floating around the Hero section
 */
export function HeroFloatingBadges() {
  return (
    <>
      {/* Top Left Floating Metric Pill */}
      <motion.div
        initial={{ opacity: 0, x: -30, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="hidden lg:block absolute -left-12 top-28 z-20"
      >
        <motion.div
          animate={{ y: [-5, 5, -5], rotate: [-1, 1, -1] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-3.5 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,96,151,0.06)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-black">
            <Award className="h-5 w-5" />
          </div>
          <div className="text-right">
            <span className="block text-[11px] font-bold text-slate-800">مدرک رسمی آکادمی</span>
            <span className="block text-[9px] text-slate-500">مورد تایید پلتفرم کشوری جار</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Top Right Floating Metric Pill */}
      <motion.div
        initial={{ opacity: 0, x: 30, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="hidden lg:block absolute -right-12 top-36 z-20"
      >
        <motion.div
          animate={{ y: [6, -6, 6], rotate: [1, -1, 1] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 0.5 }}
          className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-3.5 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,96,151,0.06)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#006097]/10 text-[#006097] font-black">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="text-right">
            <span className="block text-[11px] font-bold text-slate-800">میانگین درآمد ماه اول</span>
            <span className="block text-[10px] font-extrabold text-emerald-600">۲۵ الی ۳۰ میلیون تومان</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Floating Guarantee Badge */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="hidden md:block absolute -bottom-6 left-12 z-20"
      >
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1 }}
          className="flex items-center gap-2.5 rounded-full border border-emerald-500/25 bg-white/90 px-4 py-2 backdrop-blur-xl shadow-sm text-emerald-900 text-xs font-bold"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>تضمین معرفی به پروژه‌های عکاسی جار</span>
        </motion.div>
      </motion.div>
    </>
  );
}

/**
 * 1. Interactive Studio Lighting & Optics Vector Illustration (Clean Glassmorphic Theme)
 */
export function StudioOpticsIllustration() {
  return (
    <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-white/90 via-sky-50/40 to-white/80 p-4 overflow-hidden border border-white/90 shadow-[0_4px_24px_rgba(0,96,151,0.05),inset_0_1px_2px_rgba(255,255,255,0.9)] backdrop-blur-xl flex items-center justify-between">
      {/* Subtle Background Blueprint Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00609708_1px,transparent_1px),linear-gradient(to_bottom,#00609708_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Soft Ambient Key Light Beam */}
      <motion.div
        animate={{ opacity: [0.35, 0.7, 0.35] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute top-0 right-8 w-48 h-full bg-gradient-to-b from-sky-400/20 via-sky-400/5 to-transparent blur-md transform -rotate-45 pointer-events-none"
      />

      {/* Soft Ambient Rim Light Beam */}
      <motion.div
        animate={{ opacity: [0.3, 0.65, 0.3] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1 }}
        className="absolute top-0 left-8 w-48 h-full bg-gradient-to-b from-amber-400/20 via-amber-400/5 to-transparent blur-md transform rotate-45 pointer-events-none"
      />

      {/* Left: Softbox Node */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="h-14 w-14 rounded-2xl bg-white/95 border border-sky-300/60 p-2.5 flex flex-col items-center justify-center text-sky-600 shadow-[0_4px_16px_rgba(56,189,248,0.18)] transition-transform hover:scale-105">
          <Sun className="h-6 w-6 animate-spin [animation-duration:20s]" />
        </div>
        <span className="text-[10px] font-bold text-sky-700 mt-2 font-mono">Key Light 5600K</span>
      </div>

      {/* Center: Camera Lens Aperture Ring Vector */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          className="relative h-20 w-20 rounded-full border-2 border-dashed border-slate-300/80 p-2 flex items-center justify-center"
        >
          <div className="h-14 w-14 rounded-full bg-white border border-[#006097]/40 flex items-center justify-center text-[#006097] shadow-[0_4px_20px_rgba(0,96,151,0.14)]">
            <Camera className="h-6 w-6" />
          </div>
        </motion.div>
        <span className="text-[10px] font-bold text-slate-700 mt-1 font-mono">50mm f/1.2 USM</span>
      </div>

      {/* Right: Rim Light Node */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="h-14 w-14 rounded-2xl bg-white/95 border border-amber-300/60 p-2.5 flex flex-col items-center justify-center text-amber-600 shadow-[0_4px_16px_rgba(245,158,11,0.18)] transition-transform hover:scale-105">
          <Zap className="h-6 w-6" />
        </div>
        <span className="text-[10px] font-bold text-amber-700 mt-2 font-mono">Rim Light 3200K</span>
      </div>
    </div>
  );
}

/**
 * 2. Animated Color Curve / RGB Parade Illustration (Clean Glassmorphic Theme)
 */
export function ColorGradingIllustration() {
  return (
    <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-white/90 via-slate-50/50 to-white/80 p-4 overflow-hidden border border-white/90 shadow-[0_4px_24px_rgba(0,96,151,0.05),inset_0_1px_2px_rgba(255,255,255,0.9)] backdrop-blur-xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-b border-slate-200/60 pb-2">
        <span className="text-[#006097] font-extrabold flex items-center gap-1">
          <Sliders className="w-3 h-3" />
          <span>RGB PARADE SCOPE</span>
        </span>
        <span className="font-bold text-slate-400">DA VINCI & LIGHTROOM</span>
      </div>

      {/* Animated Spectrum Wave Bars */}
      <div className="relative flex items-end justify-between gap-1 h-20 px-2">
        {[40, 65, 85, 95, 75, 60, 45, 70, 90, 100, 80, 55, 65, 85, 70].map((h, i) => (
          <motion.div
            key={i}
            animate={{ height: [`${h * 0.7}%`, `${h}%`, `${h * 0.8}%`] }}
            transition={{ repeat: Infinity, duration: 2 + (i % 3) * 0.4, ease: "easeInOut" }}
            className={`w-full rounded-t-sm shadow-2xs ${
              i % 3 === 0 ? "bg-rose-500/80" : i % 3 === 1 ? "bg-emerald-500/80" : "bg-[#006097]/85"
            }`}
          />
        ))}
      </div>

      {/* Footer Pill */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/40">
        <span className="font-bold text-slate-700">تفکیک ۱۰ بیت لوکس و سینمایی</span>
        <span className="font-mono text-emerald-600 font-black bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">Rec.709 Ready</span>
      </div>
    </div>
  );
}

/**
 * 3. Verified B2B Contract Seal Graphic (Clean Glassmorphic Theme)
 */
export function VerifiedContractIllustration() {
  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-br from-white/95 via-emerald-50/20 to-white/90 p-4 border border-emerald-500/25 text-slate-800 shadow-[0_4px_24px_rgba(16,185,129,0.06),inset_0_1px_2px_rgba(255,255,255,0.9)] backdrop-blur-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-emerald-500/15 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
            JAR
          </div>
          <div>
            <span className="block text-xs font-black text-slate-900">قرارداد همکاری تجاری</span>
            <span className="block text-[10px] text-slate-400 font-mono">CONTRACT #JAR-2026-884</span>
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black inline-flex items-center gap-1">
          <FileCheck className="w-3 h-3 text-emerald-600" />
          <span>پرداخت تضمین‌شده</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3 text-xs">
        <div>
          <span className="block text-[10px] text-slate-400 font-medium">کارفرما:</span>
          <span className="font-bold text-slate-800">برند غذایی و کافی‌شاپ‌های زنجیره‌ای</span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-400 font-medium">مبلغ توافق‌شده:</span>
          <span className="font-black text-emerald-700 text-sm">۳۵,۰۰۰,۰۰۰ تومان</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
        <span>امضای دیجیتال: verified_sha256</span>
        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">توسط سامانه جار</span>
      </div>
    </div>
  );
}
