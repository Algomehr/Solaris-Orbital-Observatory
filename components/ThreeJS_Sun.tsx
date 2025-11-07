import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// --- PROPS INTERFACE ---
interface ThreeJSSunProps {
  isFlareActive: boolean;
  flareClass: 'M' | 'X';
  flareMagnitude: number;
  sourceRegion: { x: number; y: number; name: string };
}

// --- NOISE FUNCTIONS (Used by multiple shaders) ---
const noiseFunctions = `
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
`;

// --- SUN SHADERS ---
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
  uniform float flareIntensity;
  uniform vec2 activeRegionCoords;
  uniform float shockwaveRadius;
  uniform float shockwaveThickness;
  uniform float shockwaveIntensity;
  varying vec2 vUv;
  varying vec3 vNormal;
  
  ${noiseFunctions}

  void main() {
    float viewAngle = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
    float limbFactor = smoothstep(0.0, 0.6, 1.0 - viewAngle);
    
    float n1 = fbm(vec3(vUv * 6.0, time * 0.1));
    float n2 = fbm(vec3(vUv * 12.0, time * 0.25));
    float granulation = n1 * 0.7 + n2 * 0.3;
    
    float spots = snoise(vec3(vUv * 15.0, time * 0.05));
    float spotMask = smoothstep(0.4, 0.8, spots);
    
    float distToActiveRegion = distance(vUv, activeRegionCoords);
    float activeRegionMask = 1.0 - smoothstep(0.0, 0.15, distToActiveRegion);
    spotMask = max(spotMask, activeRegionMask * 0.8);
    
    vec3 baseColor = vec3(1.0, 0.35, 0.0);
    vec3 spotColor = vec3(0.6, 0.15, 0.0);
    vec3 faculaeColor = vec3(1.0, 0.9, 0.6);
    
    vec3 color = mix(baseColor, spotColor, spotMask);
    color += granulation * 0.2;
    
    float faculae = snoise(vec3(vUv * 25.0, time * 0.1)) * (1.0 - limbFactor) * 0.8;
    color = mix(color, faculaeColor, smoothstep(0.5, 0.7, faculae));
    
    // Flare brightening
    color += faculaeColor * flareIntensity * activeRegionMask * 2.0;
    
    // Shockwave
    float shockwave = smoothstep(shockwaveRadius - shockwaveThickness, shockwaveRadius, distToActiveRegion) * (1.0 - smoothstep(shockwaveRadius, shockwaveRadius + shockwaveThickness, distToActiveRegion));
    color += vec3(1.0, 0.8, 0.5) * shockwave * shockwaveIntensity;

    gl_FragColor = vec4(color * limbFactor, 1.0);
  }
`;

// --- CORONA SHADERS ---
const coronaVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const coronaFragmentShader = `
  uniform float time;
  uniform float flareIntensity;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  ${noiseFunctions}

  void main() {
    float rim = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
    
    float angle = atan(vWorldPosition.y, vWorldPosition.x);
    float streamerShape = snoise(vec3(angle * 5.0, time * 0.1, 0.0));
    streamerShape = pow(smoothstep(0.3, 0.7, streamerShape), 2.0);
    
    float streamerExtension = streamerShape * 0.4;
    float baseGlow = pow(smoothstep(0.0, 0.6 + streamerExtension, rim), 3.0);
    
    vec3 noiseCoords = vec3(angle * 10.0, length(vWorldPosition.xy) * 4.0, time * 0.2);
    float wisps = fbm(noiseCoords);
    wisps = smoothstep(0.4, 0.6, wisps);
    
    float finalIntensity = baseGlow * (0.3 + streamerShape * 0.7) * wisps;
    
    vec3 coronaColor = vec3(1.0, 0.7, 0.4);
    
    gl_FragColor = vec4(coronaColor, (finalIntensity + flareIntensity * 0.1) * 1.5);
  }
`;

// --- PARTICLE SHADERS ---
const particleVertexShader = `
  uniform float time;
  uniform float duration;
  attribute vec3 velocity;
  attribute float startTime;
  varying float vOpacity;
  
  void main() {
    float elapsedTime = time - startTime;
    vOpacity = 0.0;
    if (elapsedTime > 0.0 && elapsedTime < duration) {
      vec3 newPosition = position + velocity * elapsedTime;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      gl_PointSize = 4.0 * (1.0 - (elapsedTime / duration));
      vOpacity = 1.0 * (1.0 - (elapsedTime / duration));
    } else {
      gl_Position = vec4(-1000.0, -1000.0, -1000.0, 1.0);
    }
  }
`;

const particleFragmentShader = `
  varying float vOpacity;
  void main() {
    if (vOpacity <= 0.0) {
      discard;
    }
    float radialFalloff = 1.0 - length(gl_PointCoord - vec2(0.5));
    gl_FragColor = vec4(1.0, 0.7, 0.3, vOpacity * radialFalloff);
  }
`;

export const ThreeJS_Sun: React.FC<ThreeJSSunProps> = ({ isFlareActive, flareClass, flareMagnitude, sourceRegion }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sunMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const coronaMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const flareLightRef = useRef<THREE.PointLight | null>(null);
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const particleMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const flareStartTimeRef = useRef<number>(-1);
  const animationFrameIdRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const currentMount = mountRef.current;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    currentMount.appendChild(renderer.domElement);
    
    const sunGeometry = new THREE.SphereGeometry(2, 64, 64);
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        flareIntensity: { value: 0.0 },
        activeRegionCoords: { value: new THREE.Vector2(0.5, 0.5) },
        shockwaveRadius: { value: 0.0 },
        shockwaveThickness: { value: 0.02 },
        shockwaveIntensity: { value: 3.0 },
      },
      vertexShader: sunVertexShader,
      fragmentShader: sunFragmentShader,
    });
    sunMaterialRef.current = sunMaterial;
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    
    const coronaGeometry = new THREE.SphereGeometry(2.8, 64, 64);
    const coronaMaterial = new THREE.ShaderMaterial({
      uniforms: { 
        time: { value: 0.0 },
        flareIntensity: { value: 0.0 },
      },
      vertexShader: coronaVertexShader,
      fragmentShader: coronaFragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    coronaMaterialRef.current = coronaMaterial;
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    scene.add(corona);

    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 10000; i++) starVertices.push((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000);
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const flareLight = new THREE.PointLight(0xffaa44, 0, 10, 2);
    flareLightRef.current = flareLight;
    scene.add(flareLight);

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0.0 }, duration: { value: 4.0 } },
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    particleMaterialRef.current = particleMaterial;
    const particles = new THREE.Points(new THREE.BufferGeometry(), particleMaterial); // Start with empty geometry
    particleSystemRef.current = particles;
    scene.add(particles);
    
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(currentMount.clientWidth, currentMount.clientHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 1.0;
    bloomPass.radius = 0.5;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    const clock = new THREE.Clock();
    clockRef.current = clock;
    
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const width = currentMount.clientWidth; const height = currentMount.clientHeight;
      if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
        renderer.setSize(width, height, false); composer.setSize(width, height);
        camera.aspect = width / height; camera.updateProjectionMatrix();
      }
      const delta = clock.getDelta(); const time = clock.getElapsedTime();
      sun.rotation.y += 0.05 * delta;
      corona.rotation.y += 0.05 * delta;
      sunMaterial.uniforms.time.value = time;
      coronaMaterial.uniforms.time.value = time;
      if (flareStartTimeRef.current > 0) {
        const flareTime = time - flareStartTimeRef.current;
        if (flareTime < 4.0) particleMaterialRef.current!.uniforms.time.value = flareTime;
        else flareStartTimeRef.current = -1;
      }
      composer.render();
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      if (currentMount && renderer.domElement) currentMount.removeChild(renderer.domElement);
      // Dispose geometries and materials
    };
  }, []);

  // Update flare source region
  useEffect(() => {
    if (sunMaterialRef.current && flareLightRef.current) {
        sunMaterialRef.current.uniforms.activeRegionCoords.value.set(sourceRegion.x, sourceRegion.y);
        const lightPos = new THREE.Vector3().setFromSphericalCoords(
            2.1,
            Math.PI * (0.5 - sourceRegion.y),
            Math.PI * (sourceRegion.x - 0.5) * 2
        );
        flareLightRef.current.position.copy(lightPos);
    }
  }, [sourceRegion]);
  
  // Handle flare animation
  useEffect(() => {
    let flareAnimationId: number;
    if (isFlareActive) {
      if (sunMaterialRef.current && coronaMaterialRef.current && flareLightRef.current && particleSystemRef.current && particleMaterialRef.current && clockRef.current) {
        const sunMaterial = sunMaterialRef.current;
        const coronaMaterial = coronaMaterialRef.current;
        const flareLight = flareLightRef.current;
        
        flareStartTimeRef.current = clockRef.current.getElapsedTime();

        // Regenerate particles for the new flare
        const particleCount = 8000;
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const startTimes = new Float32Array(particleCount);
        const basePosition = new THREE.Vector3().setFromSphericalCoords(2.1, Math.PI * (0.5 - sourceRegion.y), Math.PI * (sourceRegion.x - 0.5) * 2);
        const magFactor = flareMagnitude / 9.0;
        const classFactor = flareClass === 'X' ? 2.5 : 1;

        for (let i = 0; i < particleCount; i++) {
          positions.set([basePosition.x, basePosition.y, basePosition.z], i * 3);
          const baseTheta = Math.PI / 2 - Math.PI * (0.5 - sourceRegion.y);
          const basePhi = Math.PI * (sourceRegion.x - 0.5) * 2;
          const spread = 0.2 + (magFactor * 0.2);
          const theta = baseTheta + (Math.random() - 0.5) * spread;
          const phi = basePhi + (Math.random() - 0.5) * spread;
          const speed = (Math.random() * 2 + 1) * classFactor;
          const velocity = new THREE.Vector3().setFromSphericalCoords(1, theta, phi).multiplyScalar(speed);
          velocities.set([velocity.x, velocity.y, velocity.z], i * 3);
          startTimes[i] = Math.random() * 0.5; // Stagger start
        }
        const particleGeometry = particleSystemRef.current.geometry;
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        particleGeometry.setAttribute('startTime', new THREE.BufferAttribute(startTimes, 1));
        particleGeometry.attributes.position.needsUpdate = true;
        particleGeometry.attributes.velocity.needsUpdate = true;
        particleGeometry.attributes.startTime.needsUpdate = true;


        let animationTime = 0;
        const sequenceStartTime = clockRef.current.getElapsedTime();

        const animateFlareSequence = () => {
            animationTime = clockRef.current!.getElapsedTime() - sequenceStartTime;
            
            // Stage 1: Flash (0s - 0.5s)
            const flashProgress = Math.min(animationTime / 0.5, 1.0);
            const intensityFactor = (flareMagnitude / 9.0 * 0.7 + 0.3) * (flareClass === 'X' ? 2.0 : 1.0);
            const flashIntensity = Math.sin(flashProgress * Math.PI) * 5.0 * intensityFactor;
            sunMaterial.uniforms.flareIntensity.value = flashIntensity;
            coronaMaterial.uniforms.flareIntensity.value = flashIntensity;
            flareLight.intensity = flashIntensity * 2;
            
            // Stage 2: Shockwave (0.2s - 2.0s)
            if (animationTime > 0.2) {
                const shockwaveProgress = Math.min((animationTime - 0.2) / 1.8, 1.0);
                sunMaterial.uniforms.shockwaveRadius.value = shockwaveProgress * 0.5;
                sunMaterial.uniforms.shockwaveIntensity.value = (1.0 - shockwaveProgress) * 3.0 * intensityFactor;
            }
            
            if (animationTime < 4.0) {
                flareAnimationId = requestAnimationFrame(animateFlareSequence);
            } else {
                sunMaterial.uniforms.flareIntensity.value = 0.0;
                coronaMaterial.uniforms.flareIntensity.value = 0.0;
                sunMaterial.uniforms.shockwaveRadius.value = 0.0;
                flareLight.intensity = 0.0;
            }
        };
        animateFlareSequence();
      }
    }
    return () => cancelAnimationFrame(flareAnimationId);
  }, [isFlareActive, flareClass, flareMagnitude, sourceRegion]);

  return <div ref={mountRef} className="w-full h-full" />;
};
