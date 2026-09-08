"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Pure WebGL MiniGL & Stripe Mesh Gradient with Grained.js Dense Noise Engine
 * Supports unified 'yellow' (Jar marketplace) and 'blue' (JarAmooz) color schemes.
 * - Hardware accelerated translate3d & will-change: transform
 * - IntersectionObserver to pause rendering when scrolled out of viewport (0% GPU when offscreen)
 * - prefers-reduced-motion & WebGL error fallbacks
 * - Grained.js canvas noise engine with 'cinematic' dense film grain
 */

function normalizeColor(hexCode: number): [number, number, number] {
  return [
    ((hexCode >> 16) & 255) / 255,
    ((hexCode >> 8) & 255) / 255,
    (hexCode & 255) / 255,
  ];
}

class MiniGl {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  meshes: any[];
  width: number = 0;
  height: number = 0;
  commonUniforms: any;
  Material: any;
  Uniform: any;
  PlaneGeometry: any;
  Mesh: any;
  Attribute: any;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true, powerPreference: "low-power" });
    if (!gl) throw new Error("WebGL not supported");
    this.gl = gl;
    this.meshes = [];
    const context = this.gl;
    const _miniGl = this;

    this.Uniform = class {
      type: string;
      value: any;
      typeFn: string;
      excludeFrom?: string;
      constructor(e: any) {
        this.type = "float";
        Object.assign(this, e);
        this.typeFn =
          ({
            float: "1f",
            int: "1i",
            vec2: "2fv",
            vec3: "3fv",
            vec4: "4fv",
            mat4: "Matrix4fv",
          } as any)[this.type] || "1f";
      }
      update(location: any) {
        if (this.value !== undefined) {
          (context as any)[`uniform${this.typeFn}`](
            location,
            this.typeFn.indexOf("Matrix") === 0 ? false : this.value,
            this.typeFn.indexOf("Matrix") === 0 ? this.value : null
          );
        }
      }
      getDeclaration(name: string, type: string, length?: number) {
        if (this.excludeFrom !== type) {
          if (this.type === "array") {
            return (
              this.value[0].getDeclaration(name, type, this.value.length) +
              `\nconst int ${name}_length = ${this.value.length};`
            );
          }
          if (this.type === "struct") {
            let name_no_prefix = name.replace("u_", "");
            name_no_prefix =
              name_no_prefix.charAt(0).toUpperCase() + name_no_prefix.slice(1);
            return (
              `uniform struct ${name_no_prefix} {\n` +
              Object.entries(this.value)
                .map(([subName, uniform]: [string, any]) =>
                  uniform.getDeclaration(subName, type).replace(/^uniform/, "")
                )
                .join("") +
              `\n} ${name}${length && length > 0 ? `[${length}]` : ""};`
            );
          }
          return `uniform ${this.type} ${name}${length && length > 0 ? `[${length}]` : ""};`;
        }
        return "";
      }
    };

    this.Attribute = class {
      type: number;
      normalized: boolean;
      buffer: WebGLBuffer | null;
      target?: number;
      size?: number;
      values?: any;
      constructor(e: any) {
        this.type = context.FLOAT;
        this.normalized = false;
        this.buffer = context.createBuffer();
        Object.assign(this, e);
        this.update();
      }
      update() {
        if (this.values !== undefined && this.buffer) {
          context.bindBuffer(this.target!, this.buffer);
          context.bufferData(this.target!, this.values, context.STATIC_DRAW);
        }
      }
      attach(name: string, program: WebGLProgram) {
        const location = context.getAttribLocation(program, name);
        if (this.target === context.ARRAY_BUFFER && this.buffer) {
          context.enableVertexAttribArray(location);
          context.vertexAttribPointer(
            location,
            this.size!,
            this.type,
            this.normalized,
            0,
            0
          );
        }
        return location;
      }
      use(location: number) {
        if (this.target === context.ARRAY_BUFFER && this.buffer) {
          context.bindBuffer(this.target, this.buffer);
          context.enableVertexAttribArray(location);
          context.vertexAttribPointer(
            location,
            this.size!,
            this.type,
            this.normalized,
            0,
            0
          );
        }
      }
    };

    this.PlaneGeometry = class {
      width: number;
      height: number;
      orientation: string = "xz";
      xSegCount: number = 1;
      ySegCount: number = 1;
      vertexCount: number = 0;
      quadCount: number = 0;
      attributes: any;

      constructor(width: number, height: number, xSegs: number, ySegs: number, orientation: string) {
        this.width = width;
        this.height = height;
        this.attributes = {
          position: new _miniGl.Attribute({ target: context.ARRAY_BUFFER, size: 3 }),
          uv: new _miniGl.Attribute({ target: context.ARRAY_BUFFER, size: 2 }),
          uvNorm: new _miniGl.Attribute({ target: context.ARRAY_BUFFER, size: 2 }),
          index: new _miniGl.Attribute({ target: context.ELEMENT_ARRAY_BUFFER, size: 3, type: context.UNSIGNED_SHORT }),
        };
        this.setTopology(xSegs, ySegs);
        this.setSize(width, height, orientation);
      }
      setTopology(xSegs = 1, ySegs = 1) {
        this.xSegCount = xSegs;
        this.ySegCount = ySegs;
        this.vertexCount = (this.xSegCount + 1) * (this.ySegCount + 1);
        this.quadCount = this.xSegCount * this.ySegCount * 2;
        this.attributes.uv.values = new Float32Array(2 * this.vertexCount);
        this.attributes.uvNorm.values = new Float32Array(2 * this.vertexCount);
        this.attributes.index.values = new Uint16Array(3 * this.quadCount);

        for (let y = 0; y <= this.ySegCount; y++) {
          for (let x = 0; x <= this.xSegCount; x++) {
            const i = y * (this.xSegCount + 1) + x;
            this.attributes.uv.values[2 * i] = x / this.xSegCount;
            this.attributes.uv.values[2 * i + 1] = 1 - y / this.ySegCount;
            this.attributes.uvNorm.values[2 * i] = (x / this.xSegCount) * 2 - 1;
            this.attributes.uvNorm.values[2 * i + 1] = 1 - (y / this.ySegCount) * 2;

            if (x < this.xSegCount && y < this.ySegCount) {
              const s = y * this.xSegCount + x;
              this.attributes.index.values[6 * s] = i;
              this.attributes.index.values[6 * s + 1] = i + 1 + this.xSegCount;
              this.attributes.index.values[6 * s + 2] = i + 1;
              this.attributes.index.values[6 * s + 3] = i + 1;
              this.attributes.index.values[6 * s + 4] = i + 1 + this.xSegCount;
              this.attributes.index.values[6 * s + 5] = i + 2 + this.xSegCount;
            }
          }
        }
        this.attributes.uv.update();
        this.attributes.uvNorm.update();
        this.attributes.index.update();
      }
      setSize(width = 1, height = 1, orientation = "xz") {
        this.width = width;
        this.height = height;
        this.orientation = orientation;
        if (!this.attributes.position.values || this.attributes.position.values.length !== 3 * this.vertexCount) {
          this.attributes.position.values = new Float32Array(3 * this.vertexCount);
        }
        const o = width / -2;
        const r = height / -2;
        const segment_width = width / this.xSegCount;
        const segment_height = height / this.ySegCount;
        for (let yIndex = 0; yIndex <= this.ySegCount; yIndex++) {
          const t = r + yIndex * segment_height;
          for (let xIndex = 0; xIndex <= this.xSegCount; xIndex++) {
            const rx = o + xIndex * segment_width;
            const l = yIndex * (this.xSegCount + 1) + xIndex;
            this.attributes.position.values[3 * l + "xyz".indexOf(orientation[0])] = rx;
            this.attributes.position.values[3 * l + "xyz".indexOf(orientation[1])] = -t;
          }
        }
        this.attributes.position.update();
      }
    };

    this.Material = class {
      uniforms: any;
      uniformInstances: any[];
      program: WebGLProgram;
      vertexShader: WebGLShader;
      fragmentShader: WebGLShader;

      constructor(vertexSource: string, fragmentSource: string, uniforms = {}) {
        this.uniforms = uniforms;
        this.uniformInstances = [];

        function getShaderByType(type: number, source: string) {
          const shader = context.createShader(type)!;
          context.shaderSource(shader, source);
          context.compileShader(shader);
          return shader;
        }

        function getUniformVariableDeclarations(uniformsObj: any, type: string) {
          return Object.entries(uniformsObj)
            .map(([uniform, value]: [string, any]) => value.getDeclaration(uniform, type))
            .join("\n");
        }

        const prefix = "\nprecision highp float;\n";
        const vSource = `${prefix}\nattribute vec4 position;\nattribute vec2 uv;\nattribute vec2 uvNorm;\n${getUniformVariableDeclarations(_miniGl.commonUniforms, "vertex")}\n${getUniformVariableDeclarations(uniforms, "vertex")}\n${vertexSource}`;
        const fSource = `${prefix}\n${getUniformVariableDeclarations(_miniGl.commonUniforms, "fragment")}\n${getUniformVariableDeclarations(uniforms, "fragment")}\n${fragmentSource}`;

        this.vertexShader = getShaderByType(context.VERTEX_SHADER, vSource);
        this.fragmentShader = getShaderByType(context.FRAGMENT_SHADER, fSource);
        this.program = context.createProgram()!;
        context.attachShader(this.program, this.vertexShader);
        context.attachShader(this.program, this.fragmentShader);
        context.linkProgram(this.program);
        context.useProgram(this.program);

        this.attachUniforms(undefined, _miniGl.commonUniforms);
        this.attachUniforms(undefined, this.uniforms);
      }

      attachUniforms(name: string | undefined, uniformsObj: any) {
        if (name === undefined) {
          Object.entries(uniformsObj).forEach(([uName, uniform]) => {
            this.attachUniforms(uName, uniform);
          });
        } else if (uniformsObj.type === "array") {
          uniformsObj.value.forEach((uniform: any, i: number) =>
            this.attachUniforms(`${name}[${i}]`, uniform)
          );
        } else if (uniformsObj.type === "struct") {
          Object.entries(uniformsObj.value).forEach(([sName, uniform]) =>
            this.attachUniforms(`${name}.${sName}`, uniform)
          );
        } else {
          this.uniformInstances.push({
            uniform: uniformsObj,
            location: context.getUniformLocation(this.program, name),
          });
        }
      }
    };

    this.Mesh = class {
      geometry: any;
      material: any;
      attributeInstances: any[] = [];
      constructor(geometry: any, material: any) {
        this.geometry = geometry;
        this.material = material;
        Object.entries(this.geometry.attributes).forEach(([attrName, attribute]: [string, any]) => {
          this.attributeInstances.push({
            attribute,
            location: attribute.attach(attrName, this.material.program),
          });
        });
        _miniGl.meshes.push(this);
      }
      draw() {
        context.useProgram(this.material.program);
        this.material.uniformInstances.forEach(({ uniform, location }: any) => uniform.update(location));
        this.attributeInstances.forEach(({ attribute, location }: any) => attribute.use(location));
        context.drawElements(context.TRIANGLES, this.geometry.attributes.index.values.length, context.UNSIGNED_SHORT, 0);
      }
    };

    const a = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    this.commonUniforms = {
      projectionMatrix: new this.Uniform({ type: "mat4", value: a }),
      modelViewMatrix: new this.Uniform({ type: "mat4", value: a }),
      resolution: new this.Uniform({ type: "vec2", value: [1, 1] }),
      aspectRatio: new this.Uniform({ type: "float", value: 1 }),
    };

    if (width && height) this.setSize(width, height);
  }

  setSize(w = 640, h = 480) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    this.commonUniforms.resolution.value = [w, h];
    this.commonUniforms.aspectRatio.value = w / h;
  }

  setOrthographicCamera() {
    this.commonUniforms.projectionMatrix.value = [
      2 / this.width, 0, 0, 0,
      0, 2 / this.height, 0, 0,
      0, 0, 2 / (2000 - -2000), 0,
      0, 0, 0, 1
    ];
  }

  render() {
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.meshes.forEach((mesh) => mesh.draw());
  }
}

// Simplex noise shader chunk
const NOISE_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const VERTEX_SHADER = `
${NOISE_GLSL}
varying vec3 v_color;

void main() {
  float time = u_time * u_global.noiseSpeed;
  vec2 noiseCoord = resolution * uvNorm * u_global.noiseFreq;

  float tilt = resolution.y / 2.0 * uvNorm.y;
  float incline = resolution.x * uvNorm.x / 2.0 * u_vertDeform.incline;
  float offset = resolution.x / 2.0 * u_vertDeform.incline * mix(u_vertDeform.offsetBottom, u_vertDeform.offsetTop, uv.y);

  float noise = snoise(vec3(
    noiseCoord.x * u_vertDeform.noiseFreq.x + time * u_vertDeform.noiseFlow,
    noiseCoord.y * u_vertDeform.noiseFreq.y,
    time * u_vertDeform.noiseSpeed + u_vertDeform.noiseSeed
  )) * u_vertDeform.noiseAmp;

  noise *= 1.0 - pow(abs(uvNorm.y), 2.0);
  noise = max(0.0, noise);

  vec3 pos = vec3(
    position.x,
    position.y + tilt + incline + noise - offset,
    position.z
  );

  // Clean White Base
  v_color = u_baseColor;

  // Wave Layer 0 (Primary)
  float n0 = smoothstep(0.12, 0.88, snoise(vec3(
    noiseCoord.x * u_waveLayers[0].noiseFreq.x + time * u_waveLayers[0].noiseFlow,
    noiseCoord.y * u_waveLayers[0].noiseFreq.y,
    time * u_waveLayers[0].noiseSpeed + u_waveLayers[0].noiseSeed
  )) * 0.5 + 0.5);
  v_color = mix(v_color, u_waveLayers[0].color, pow(clamp(n0, 0.0, 1.0), 2.8));

  // Wave Layer 1 (Luminous Light Ribbon)
  float n1 = smoothstep(0.12, 0.88, snoise(vec3(
    noiseCoord.x * u_waveLayers[1].noiseFreq.x + time * u_waveLayers[1].noiseFlow,
    noiseCoord.y * u_waveLayers[1].noiseFreq.y,
    time * u_waveLayers[1].noiseSpeed + u_waveLayers[1].noiseSeed
  )) * 0.5 + 0.5);
  v_color = mix(v_color, u_waveLayers[1].color, pow(clamp(n1, 0.0, 1.0), 3.2));

  // Wave Layer 2 (Contrast Ribbon)
  float n2 = smoothstep(0.12, 0.88, snoise(vec3(
    noiseCoord.x * u_waveLayers[2].noiseFreq.x + time * u_waveLayers[2].noiseFlow,
    noiseCoord.y * u_waveLayers[2].noiseFreq.y,
    time * u_waveLayers[2].noiseSpeed + u_waveLayers[2].noiseSeed
  )) * 0.5 + 0.5);
  v_color = mix(v_color, u_waveLayers[2].color, pow(clamp(n2, 0.0, 1.0), 3.0));

  // Wave Layer 3 (Highlight Shimmer)
  float n3 = smoothstep(0.12, 0.88, snoise(vec3(
    noiseCoord.x * u_waveLayers[3].noiseFreq.x + time * u_waveLayers[3].noiseFlow,
    noiseCoord.y * u_waveLayers[3].noiseFreq.y,
    time * u_waveLayers[3].noiseSpeed + u_waveLayers[3].noiseSeed
  )) * 0.5 + 0.5);
  v_color = mix(v_color, u_waveLayers[3].color, pow(clamp(n3, 0.0, 1.0), 3.2));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const FRAGMENT_SHADER = `
varying vec3 v_color;
void main() {
  gl_FragColor = vec4(v_color, 1.0);
}
`;

// 1. Mellow Pastel Brand Blue + Crisp White Ribbon Palette (Jaramooz - White Dominant & Radiant)
const BLUE_PALETTE = [
  0xffffff, // 0. Pure Crisp White Base
  0xbae6fd, // 1. Mellow Soft Sky Blue Ribbon (sky-200)
  0xffffff, // 2. Crisp Luminous Pure White Wave Streak
  0x38bdf8, // 3. Gentle Cerulean Sky Blue (sky-400)
  0xffffff, // 4. Pure Radiant White Highlight Ribbon
];

// 2. Pure Brand Warm Canvas Paper Palette (#FAF9F5 - Claude.ai Editorial Atmosphere)
const YELLOW_PALETTE = [
  0xffffff, // 0. Pure Crisp White Base
  0xfaf9f5, // 1. Warm Claude Paper Canvas (#FAF9F5)
  0xffffff, // 2. Crisp Luminous Pure White Wave Streak
  0xf3f1ec, // 3. Soft Warm Stone Linen Shimmer (#F3F1EC)
  0xffffff, // 4. Pure Radiant White Highlight Ribbon
];

export interface AnimatedHeroBackgroundProps {
  colorScheme?: "blue" | "yellow";
  noiseDensity?: "subtle" | "cinematic" | "none";
  opacity?: number;
  className?: string;
}

export default function AnimatedHeroBackground({
  colorScheme = "yellow",
  noiseDensity = "none",
  opacity,
  className = "",
}: AnimatedHeroBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasWebGLSupport, setHasWebGLSupport] = useState(true);

  const isYellow = colorScheme === "yellow";
  const palette = isYellow ? YELLOW_PALETTE : BLUE_PALETTE;

  // WebGL MiniGl Mesh Gradient Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animFrame: number;
    let minigl: MiniGl;
    let isRunning = true;
    let isVisible = true;

    // Accessibility check: prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    try {
      const initH = Math.max(container.clientHeight || window.innerHeight, 900);
      minigl = new MiniGl(canvas, window.innerWidth, initH);
      minigl.setOrthographicCamera();

      const sectionColors = palette.map(normalizeColor);

      const uniforms = {
        u_time: new minigl.Uniform({ value: 0 }),
        u_global: new minigl.Uniform({
          value: {
            noiseFreq: new minigl.Uniform({ value: [16e-5, 30e-5], type: "vec2" }),
            noiseSpeed: new minigl.Uniform({ value: 6.5e-6 }),
          },
          type: "struct",
        }),
        u_vertDeform: new minigl.Uniform({
          value: {
            incline: new minigl.Uniform({ value: 0.18 }),
            offsetTop: new minigl.Uniform({ value: -0.5 }),
            offsetBottom: new minigl.Uniform({ value: -0.5 }),
            noiseFreq: new minigl.Uniform({ value: [3, 4], type: "vec2" }),
            noiseAmp: new minigl.Uniform({ value: 250 }),
            noiseSpeed: new minigl.Uniform({ value: 10.8 }),
            noiseFlow: new minigl.Uniform({ value: 4.2 }),
            noiseSeed: new minigl.Uniform({ value: 5 }),
          },
          type: "struct",
          excludeFrom: "fragment",
        }),
        u_baseColor: new minigl.Uniform({
          value: sectionColors[0],
          type: "vec3",
          excludeFrom: "fragment",
        }),
        u_waveLayers: new minigl.Uniform({
          value: [
            // Wave 1: Primary Brand Wave
            new minigl.Uniform({
              value: {
                color: new minigl.Uniform({ value: sectionColors[1], type: "vec3" }),
                noiseFreq: new minigl.Uniform({ value: [2.2, 3.2], type: "vec2" }),
                noiseSpeed: new minigl.Uniform({ value: 10.8 }),
                noiseFlow: new minigl.Uniform({ value: 5.0 }),
                noiseSeed: new minigl.Uniform({ value: 12 }),
              },
              type: "struct",
            }),
            // Wave 2: Crisp Luminous Light Ribbon
            new minigl.Uniform({
              value: {
                color: new minigl.Uniform({ value: sectionColors[2], type: "vec3" }),
                noiseFreq: new minigl.Uniform({ value: [3.2, 4.0], type: "vec2" }),
                noiseSpeed: new minigl.Uniform({ value: 11.5 }),
                noiseFlow: new minigl.Uniform({ value: 5.4 }),
                noiseSeed: new minigl.Uniform({ value: 20 }),
              },
              type: "struct",
            }),
            // Wave 3: Deep Contrast Ribbon
            new minigl.Uniform({
              value: {
                color: new minigl.Uniform({ value: sectionColors[3], type: "vec3" }),
                noiseFreq: new minigl.Uniform({ value: [2.8, 3.8], type: "vec2" }),
                noiseSpeed: new minigl.Uniform({ value: 9.8 }),
                noiseFlow: new minigl.Uniform({ value: 4.5 }),
                noiseSeed: new minigl.Uniform({ value: 30 }),
              },
              type: "struct",
            }),
            // Wave 4: Highlight Ribbon
            new minigl.Uniform({
              value: {
                color: new minigl.Uniform({ value: sectionColors[4], type: "vec3" }),
                noiseFreq: new minigl.Uniform({ value: [3.6, 4.4], type: "vec2" }),
                noiseSpeed: new minigl.Uniform({ value: 11.0 }),
                noiseFlow: new minigl.Uniform({ value: 4.8 }),
                noiseSeed: new minigl.Uniform({ value: 42 }),
              },
              type: "struct",
            }),
          ],
          excludeFrom: "fragment",
          type: "array",
        }),
      };

      const material = new minigl.Material(VERTEX_SHADER, FRAGMENT_SHADER, uniforms);
      const xSegs = Math.ceil(window.innerWidth * 0.08);
      const ySegs = Math.ceil(initH * 0.16);
      const geometry = new minigl.PlaneGeometry(window.innerWidth, initH, xSegs, ySegs, "xz");
      new minigl.Mesh(geometry, material);

      let t = 100000;
      let lastTime = performance.now();

      // Render loop with Viewport Visibility Pausing for Speed Index & battery saving
      const render = (now: number) => {
        if (!isRunning) return;
        if (isVisible && !prefersReducedMotion) {
          const delta = Math.min(now - lastTime, 100);
          lastTime = now;
          t += delta * 1.16;
          uniforms.u_time.value = t;
          minigl.render();
          animFrame = requestAnimationFrame(render);
        }
      };

      // Initial single render
      uniforms.u_time.value = t;
      minigl.render();

      if (!prefersReducedMotion) {
        animFrame = requestAnimationFrame(render);
      }

      // Intersection Observer: Pauses WebGL completely when offscreen to save 100% GPU
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isVisible = entry.isIntersecting;
          if (isVisible && !prefersReducedMotion && isRunning) {
            lastTime = performance.now();
            cancelAnimationFrame(animFrame);
            animFrame = requestAnimationFrame(render);
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(container);

      const handleResize = () => {
        const w = window.innerWidth;
        const h = Math.max(container.clientHeight || window.innerHeight, 900);
        minigl.setSize(w, h);
        minigl.setOrthographicCamera();
        geometry.setTopology(Math.ceil(w * 0.08), Math.ceil(h * 0.16));
        geometry.setSize(w, h);
        minigl.render();
      };

      window.addEventListener("resize", handleResize, { passive: true });

      return () => {
        isRunning = false;
        observer.disconnect();
        cancelAnimationFrame(animFrame);
        window.removeEventListener("resize", handleResize);
      };
    } catch (e) {
      console.warn("WebGL mesh fallback triggered:", e);
      setHasWebGLSupport(false);
    }
  }, [palette]);

  return (
    <div
      ref={containerRef}
      className={`absolute top-0 inset-x-0 w-full h-[1150px] pointer-events-none overflow-hidden z-0 ${className}`}
      style={{
        maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)",
        contain: "paint layout",
        transform: "translate3d(0, 0, 0)",
        WebkitTransform: "translate3d(0, 0, 0)",
      }}
      aria-hidden="true"
    >
      {/* 1. Stripe.com WebGL Jelly Mesh Gradient Canvas with White Ribbons */}
      {hasWebGLSupport ? (
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover transition-opacity duration-700"
          style={{
            opacity: opacity ?? (isYellow ? 0.38 : 0.85),
            filter: "blur(28px) saturate(105%)",
            WebkitFilter: "blur(28px) saturate(105%)",
            willChange: "transform",
            transform: "translate3d(0, 0, 0)",
            WebkitTransform: "translate3d(0, 0, 0)",
          }}
        />
      ) : (
        /* Static CSS Mesh Fallback for Devices without WebGL */
        <div
          className="w-full h-full"
          style={{
            opacity: opacity ?? (isYellow ? 0.75 : 0.85),
            background: isYellow
              ? "radial-gradient(at 75% 25%, rgba(250, 249, 245, 0.95) 0px, transparent 60%), radial-gradient(at 25% 45%, rgba(243, 241, 236, 0.85) 0px, transparent 55%), radial-gradient(at 50% 75%, rgba(255, 255, 255, 0.90) 0px, transparent 60%), transparent"
              : "radial-gradient(at 75% 25%, rgba(0, 128, 255, 0.40) 0px, transparent 60%), radial-gradient(at 25% 45%, rgba(0, 96, 151, 0.35) 0px, transparent 55%), radial-gradient(at 50% 75%, rgba(56, 189, 248, 0.30) 0px, transparent 60%), transparent",
          }}
        />
      )}
    </div>
  );
}
