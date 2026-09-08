"use client";

import { useEffect } from "react";

export default function ReactGrab() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      import("react-grab").catch((err) => {
        console.warn("[react-grab] Failed to load module:", err);
      });
    }
  }, []);

  return null;
}
