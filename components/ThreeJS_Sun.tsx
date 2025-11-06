import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// شیدر پیشرفته برای سطح خورشید با استفاده از نویز سیمپلکس و حرکت براونی کسری
const sunVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunFragmentShader = `
  uniform float time;
  varying vec2 vUv;
  varying vec3 vNormal;

  // Simplex Noise 3D
  // Author: Stefan Gustavson
  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
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
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Fractional Brownian Motion
  float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    float freq = 2.0;
    for (int i = 0; i < 6; i++) {
        f += amp * snoise(p * freq);
        amp *= 0.5;
        freq *= 2.0;
    }
    return f;
  }

  void main() {
    float noise = fbm(vec3(vUv * 3.0, time * 0.1));
    vec3 baseColor = vec3(1.0, 0.5, 0.0);
    vec3 highlightColor = vec3(1.0, 1.0, 0.0);
    
    float intensity = 1.0 + 2.0 * noise;
    vec3 color = mix(baseColor, highlightColor, intensity);
    
    // افزودن لکه‌های خورشیدی
    float sunspotNoise = snoise(vec3(vUv * 10.0, time * 0.05));
    if (sunspotNoise > 0.6) {
      color = mix(color, vec3(0.8, 0.3, 0.0), (sunspotNoise - 0.6) / 0.4);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// شیدر پیشرفته برای تاج خورشیدی با افکت فرنل
const coronaVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const coronaFragmentShader = `
  uniform float time;
  varying vec3 vNormal;
  
  // Simplex Noise 2D
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec2 x1 = x0.xy + C.xx - i1;
    vec2 x2 = x0.xy + C.zz;
    i = mod(i, 289.0);
    vec3 p = vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2));
    vec3 m = max(0.5 - p, 0.0);
    m = m*m;
    m = m*m;
    p = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(p) - 0.5;
    vec3 ox = floor(p + 0.5);
    vec3 a0 = p - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * vec2(x1.x, x2.x) + h.yz * vec2(x1.y, x2.y);
    return 130.0 * dot(m, g);
  }

  void main() {
    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    float noise = 0.5 + 0.5 * snoise(vNormal.xy * 5.0 + time * 0.1);
    gl_FragColor = vec4(1.0, 0.6, 0.0, 1.0) * intensity * noise;
  }
`;


export const ThreeJS_Sun: React.FC<{ isFlareActive: boolean }> = ({ isFlareActive }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const flareRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const currentMount = mountRef.current;
    
    // راه‌اندازی صحنه
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    currentMount.appendChild(renderer.domElement);
    
    // خورشید
    const sunGeometry = new THREE.SphereGeometry(2, 64, 64);
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0.0 } },
      vertexShader: sunVertexShader,
      fragmentShader: sunFragmentShader,
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    
    // تاج خورشیدی
    const coronaGeometry = new THREE.SphereGeometry(2.2, 64, 64);
    const coronaMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0.0 } },
      vertexShader: coronaVertexShader,
      fragmentShader: coronaFragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    scene.add(corona);

    // ستاره‌ها
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // شراره خورشیدی
    const flareCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2, 0, 0),
      new THREE.Vector3(3, 1, 0),
      new THREE.Vector3(4, 0, 0),
      new THREE.Vector3(3, -1.5, 0),
      new THREE.Vector3(5, -2, 0)
    ]);
    const flareGeometry = new THREE.TubeGeometry(flareCurve, 20, 0.05, 8, false);
    const flareMaterial = new THREE.MeshBasicMaterial({ color: 0xfffbb3, transparent: true, opacity: 0 });
    const flare = new THREE.Mesh(flareGeometry, flareMaterial);
    flareRef.current = flare;
    scene.add(flare);
    
    // پست-پراسسینگ: افکت درخشش
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(currentMount.clientWidth, currentMount.clientHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 1.2;
    bloomPass.radius = 0.5;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);


    const clock = new THREE.Clock();
    let animationFrameId: number;
    
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // منطق ریسپانسیو رندر
      const canvas = renderer.domElement;
      const width = currentMount.clientWidth;
      const height = currentMount.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        renderer.setSize(width, height, false);
        composer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      const delta = clock.getDelta();
      sun.rotation.y += 0.05 * delta;
      sunMaterial.uniforms.time.value += delta;
      coronaMaterial.uniforms.time.value += delta;
      
      composer.render();
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      currentMount.removeChild(renderer.domElement);
      sunGeometry.dispose();
      sunMaterial.dispose();
      coronaGeometry.dispose();
      coronaMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      flareGeometry.dispose();
      flareMaterial.dispose();
    };
  }, []);
  
  // مدیریت انیمیشن شراره
  useEffect(() => {
    if (flareRef.current) {
        const material = flareRef.current.material as THREE.MeshBasicMaterial;
        let opacity = material.opacity;
        
        const animateFlare = (targetOpacity: number, speed: number) => {
            if (opacity < targetOpacity) {
                opacity = Math.min(opacity + speed, targetOpacity);
            } else if (opacity > targetOpacity) {
                opacity = Math.max(opacity - speed, targetOpacity);
            }
            material.opacity = opacity;
            
            if (material.opacity !== targetOpacity) {
                requestAnimationFrame(() => animateFlare(targetOpacity, speed));
            }
        };

        if (isFlareActive) {
            animateFlare(1, 0.05);
        } else {
            animateFlare(0, 0.01);
        }
    }
  }, [isFlareActive]);

  return <div ref={mountRef} className="w-full h-full" />;
};