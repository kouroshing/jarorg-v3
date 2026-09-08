"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type Props = {
  className?: string;
};

export default function ThreePhotographyCanvas({ className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 450;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 24;

    // 2. Renderer setup with high performance & pixel ratio cap
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 3. 3D Photography Lens & Aperture Rig
    const lensGroup = new THREE.Group();
    scene.add(lensGroup);

    // Outer Glass Barrel Ring
    const outerRingGeo = new THREE.TorusGeometry(6.2, 0.12, 16, 100);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x006097,
      transparent: true,
      opacity: 0.75,
      wireframe: false,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    lensGroup.add(outerRing);

    // Middle Aperture Iris Ring (Cyan glow)
    const irisRingGeo = new THREE.TorusGeometry(4.8, 0.08, 16, 80);
    const irisRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, // Sky-400 cyan
      transparent: true,
      opacity: 0.65,
    });
    const irisRing = new THREE.Mesh(irisRingGeo, irisRingMat);
    lensGroup.add(irisRing);

    // Inner Lens Aperture Ring (Amber focus tint)
    const innerRingGeo = new THREE.TorusGeometry(3.2, 0.06, 16, 60);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Amber-500
      transparent: true,
      opacity: 0.5,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    lensGroup.add(innerRing);

    // Crosshair Focus Grid
    const crosshairMat = new THREE.LineBasicMaterial({
      color: 0x006097,
      transparent: true,
      opacity: 0.35,
    });

    const crosshairGeoH = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2.2, 0, 0),
      new THREE.Vector3(2.2, 0, 0),
    ]);
    const crosshairGeoV = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -2.2, 0),
      new THREE.Vector3(0, 2.2, 0),
    ]);
    const lineH = new THREE.Line(crosshairGeoH, crosshairMat);
    const lineV = new THREE.Line(crosshairGeoV, crosshairMat);
    lensGroup.add(lineH);
    lensGroup.add(lineV);

    // 4. Floating 3D Bokeh / Light Photon Particles
    const particleCount = 100;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 32;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
      particleScales[i] = Math.random() * 0.8 + 0.2;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    // Custom Canvas Texture for smooth circular bokeh dots
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(0, 96, 151, 1)");
      gradient.addColorStop(0.35, "rgba(56, 189, 248, 0.8)");
      gradient.addColorStop(0.7, "rgba(245, 158, 11, 0.4)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.9,
      map: particleTexture,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. Mouse Parallax & Touch Tracking
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;

      if ("touches" in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ("clientX" in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const rect = container.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width - 0.5;
      const y = (clientY - rect.top) / rect.height - 0.5;

      targetX = x * 1.8;
      targetY = y * 1.8;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });

    // 6. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || 450;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize, { passive: true });

    // 7. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth cursor lerp (0.05 factor)
      if (!prefersReducedMotion) {
        currentX += (targetX - currentX) * 0.05;
        currentY += (targetY - currentY) * 0.05;

        // Rotate & tilt lens aperture
        lensGroup.rotation.x = currentY * 0.6 + Math.sin(elapsedTime * 0.4) * 0.1;
        lensGroup.rotation.y = currentX * 0.8 + Math.cos(elapsedTime * 0.3) * 0.12;
        lensGroup.rotation.z = elapsedTime * 0.1;

        // Counter-rotate middle iris ring
        irisRing.rotation.z = -elapsedTime * 0.25;
        innerRing.rotation.z = elapsedTime * 0.35;

        // Gentle particle motion
        particles.rotation.y = elapsedTime * 0.04 + currentX * 0.2;
        particles.rotation.x = Math.sin(elapsedTime * 0.08) * 0.1 + currentY * 0.2;
      }

      renderer.render(scene, camera);
    };

    animate();
    setIsLoaded(true);

    // 8. Clean Garbage Collection & Unmount Cleanup (Zero GPU Memory Leak)
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("resize", handleResize);

      // Dispose geometries
      outerRingGeo.dispose();
      irisRingGeo.dispose();
      innerRingGeo.dispose();
      crosshairGeoH.dispose();
      crosshairGeoV.dispose();
      particleGeo.dispose();

      // Dispose materials & textures
      outerRingMat.dispose();
      irisRingMat.dispose();
      innerRingMat.dispose();
      crosshairMat.dispose();
      particleMat.dispose();
      particleTexture.dispose();

      // Dispose renderer
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden pointer-events-none transition-opacity duration-1000 ${
        isLoaded ? "opacity-100" : "opacity-0"
      } ${className}`}
      aria-hidden="true"
    />
  );
}
