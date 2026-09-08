import React from "react";
import JaramoozLogo from "@/components/JaramoozLogo";

function JaarMark({ className = "w-[21px] h-[21px]" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 701 701"
      preserveAspectRatio="xMidYMid meet"
      className={`shrink-0 fill-current text-[#CC785C] drop-shadow-xs ${className}`}
      aria-label="لوگوی جار"
      role="img"
    >
      <path
        d="M1548,1006a77.61,77.61,0,0,1-14.12,44.76h0A78,78,0,1,1,1548,1006Z"
        transform="translate(-847.5 -900.5)"
      />
      <path
        d="M1548.5,1182.5v187.64c0,127.78-103.58,231.36-231.36,231.36H1078.86c-127.78,0-231.36-103.58-231.36-231.36V1131.86c0-127.78,103.58-231.36,231.36-231.36H1272v132H1077.36a99.86,99.86,0,0,0-99.86,99.86v236.28a99.86,99.86,0,0,0,99.86,99.86h236.28a99.86,99.86,0,0,0,99.86-99.86V1182.5Z"
        transform="translate(-847.5 -900.5)"
      />
    </svg>
  );
}

export default function AdminBrandHeader() {
  return (
    <div className="flex items-center gap-2.5 py-1 select-none">
      {/* Logos group: optically balanced equal sizes */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-6 h-6 flex items-center justify-center">
          <JaarMark className="w-[21px] h-[21px]" />
        </div>
        <span className="text-slate-300 dark:text-slate-600 font-light text-xs">/</span>
        <div className="w-6 h-6 flex items-center justify-center">
          <JaramoozLogo className="w-[22px] h-[22px] drop-shadow-xs" fill="#006097" />
        </div>
      </div>

      {/* Brand Title */}
      <div className="flex flex-col min-w-0 text-right">
        <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-tight whitespace-nowrap">
          جار و جار آموز
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-none mt-0.5 whitespace-nowrap">
          مدیریت یکپارچه پلتفرم
        </span>
      </div>
    </div>
  );
}
