import React from "react";

type JaramoozLogoProps = {
  className?: string;
  fill?: string;
};

export default function JaramoozLogo({ className = "w-full h-full", fill = "#006097" }: JaramoozLogoProps) {
  return (
    <svg
      id="Layer_1"
      data-name="Layer 1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 679 679"
      preserveAspectRatio="xMidYMid meet"
      className={`shrink-0 ${className}`.trim()}
      aria-label="لوگوی جارآموز"
      role="img"
    >
      <rect x="529" y="10" width="150" height="150" fill={fill} />
      <path
        d="M1566,1188v.5c0,187.5-152,339.5-339.5,339.5S887,1376,887,1188.5,1039,849,1226.5,849c3.85,0,7.69.06,11.5.2v151q-4.47-.22-9-.22c-104.38,0-189,84.62-189,189s84.62,189,189,189,189-84.62,189-189c0-.33,0-.67,0-1Z"
        transform="translate(-887 -849)"
        fill={fill}
      />
    </svg>
  );
}
