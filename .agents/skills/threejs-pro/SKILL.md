---
name: threejs-pro
description: >-
  Expert guidance and production-grade design patterns for Three.js, WebGL shaders,
  interactive 3D canvas experiences, particle systems, and GPU memory lifecycle management in Next.js/React.
---

# Three.js Pro Skill & Guidelines

This skill defines the architectural best practices, performance guidelines, and design patterns for integrating Three.js into Next.js and React applications.

## Core Rules & Principles

1. **Memory & GPU Lifecycle Management (Zero Leaks)**
   - Always dispose geometries (`geometry.dispose()`), materials (`material.dispose()`), textures (`texture.dispose()`), and renderer (`renderer.dispose()`) on component unmount.
   - Cancel the active `requestAnimationFrame` ID in the cleanup return function of `useEffect`.
   - Remove event listeners (e.g. `resize`, `mousemove`, `touchmove`, `visibilitychange`) during unmount.

2. **Performance & Frame Rate Optimization (60+ FPS)**
   - Cap pixel ratio to `Math.min(window.devicePixelRatio, 2)` to avoid extreme GPU overhead on high-DPI retina screens.
   - Use `BufferGeometry` and `PointsMaterial` or `InstancedMesh` for rendering multiple objects or particle swarms.
   - Pause animation loops when the tab or component is offscreen using `IntersectionObserver` or `document.hidden`.
   - Set `powerPreference: "high-performance"` and `antialias: true` only where needed.

3. **React & Next.js Integration Pattern**
   - Use dynamic imports with `ssr: false` or run Three.js canvas creation purely inside client components with `"use client"` and `useEffect`.
   - Handle window resize smoothly by updating `camera.aspect` and calling `camera.updateProjectionMatrix()` and `renderer.setSize()`.
   - Use CSS `pointer-events-none` for background ambient canvases so standard UI interactions (buttons, links, inputs) are never blocked.

4. **Interaction & Parallax**
   - Implement smooth lerping (linear interpolation `current += (target - current) * 0.05`) for cursor or gyro parallax to give a tactile, fluid sensation.
