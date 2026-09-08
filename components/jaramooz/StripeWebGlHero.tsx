"use client";

import React from "react";
import AnimatedHeroBackground, { AnimatedHeroBackgroundProps } from "@/components/shared/AnimatedHeroBackground";

export default function StripeWebGlHero(props: Partial<AnimatedHeroBackgroundProps>) {
  return <AnimatedHeroBackground colorScheme="blue" {...props} />;
}
