"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

export const MotionDiv = motion.div;
export const MotionSection = motion.section;
export const MotionSpan = motion.span;
export const MotionHeader = motion.header;

// Crisp Framer / WaitlistKit snappy spring physics & easing
const CRISP_SPRING = {
  type: "spring",
  damping: 24,
  stiffness: 220,
  mass: 0.7,
} as const;

const CRISP_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * HeroFadeIn - Signature Framer Blur-Reveal & Crisp Spring Entrance
 * Runs strictly One-Off on page mount with hardware-accelerated transform/opacity.
 */
export function HeroFadeIn({
  children,
  className = "",
  delay = 0,
  duration = 0.55,
  direction = "up",
  distance = 20,
  style,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
} & HTMLMotionProps<"div">) {
  const directionOffset = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.98,
        ...directionOffset[direction],
      }}
      animate={{
        opacity: 1,
        scale: 1,
        x: 0,
        y: 0,
      }}
      transition={{
        duration,
        delay,
        ease: CRISP_EASE,
        opacity: { duration: duration * 0.8, delay, ease: "easeOut" },
      }}
      style={{
        willChange: "transform, opacity",
        transform: "translate3d(0, 0, 0)",
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * FadeIn - One-off viewport entry animation optimized for Speed Index.
 * Executes strictly once when scrolled into view without recurring offscreen overhead.
 */
export function FadeIn({
  children,
  className = "",
  delay = 0,
  duration = 0.5,
  direction = "up",
  distance = 18,
  style,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
} & HTMLMotionProps<"div">) {
  const directionOffset = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        ...directionOffset[direction],
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration,
        delay,
        ease: CRISP_EASE,
        opacity: { duration: duration * 0.85, delay, ease: "easeOut" },
      }}
      style={{
        willChange: "transform, opacity",
        transform: "translate3d(0, 0, 0)",
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.05,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
} & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
  style,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.45,
            ease: CRISP_EASE,
          },
        },
      }}
      style={{
        willChange: "transform, opacity",
        transform: "translate3d(0, 0, 0)",
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function FloatingElement({
  children,
  className = "",
  duration = 4.5,
  distance = 5,
  style,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
} & HTMLMotionProps<"div">) {
  return (
    <motion.div
      animate={{
        y: [-distance / 2, distance / 2, -distance / 2],
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
      style={{
        willChange: "transform",
        transform: "translate3d(0, 0, 0)",
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function HoverCard({
  children,
  className = "",
  scale = 1.02,
  y = -3,
  style,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  scale?: number;
  y?: number;
} & HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{
        scale,
        y,
        transition: { type: "spring", stiffness: 400, damping: 18 },
      }}
      whileTap={{ scale: 0.98 }}
      style={{
        willChange: "transform",
        transform: "translate3d(0, 0, 0)",
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
