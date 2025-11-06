import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

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
   float snoise2d(vec2 v) {
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
  varying vec2 vUv;
  varying vec3 vNormal;
  
  ${noiseFunctions}

  void main() {
    // Limb darkening
    float viewAngle = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
    float limbFactor = smoothstep(0.0, 0.6, 1.0 - viewAngle);
    // Base texture: Granulation cells
    float granulation = fbm(vec3(vUv * 8.0, time * 0.2));
    // Sunspots and active regions
    float spots = snoise(vec3(vUv * 15.0, time * 0.05));
    float spotMask = smoothstep(0.4, 0.8, spots);
    // Define the active region
    float distToActiveRegion = distance(vUv, activeRegionCoords);
    float activeRegionMask = 1.0 - smoothstep(0.0, 0.15, distToActiveRegion);
    // More spots in the active region
    spotMask = max(spotMask, activeRegionMask * 0.8);
    // Base colors
    vec3 baseColor = vec3(1.0, 0.35, 0.0);
    vec3 spotColor = vec3(0.6, 0.15, 0.0);
    vec3 faculaeColor = vec3(1.0, 0.9, 0.6); // Bright regions near the limb
    // Mix colors
    vec3 color = mix(baseColor, spotColor, spotMask);
    color += granulation * 0.2;
    // Add bright faculae near the limb
    float faculae = snoise(vec3(vUv * 25.0, time * 0.1)) * (1.0 - limbFactor) * 0.8;
    color = mix(color, faculaeColor, smoothstep(0.5, 0.7, faculae));
    // Flare brightening in the active region
    color += faculaeColor * flareIntensity * activeRegionMask * 2.0;
    // Final color with limb darkening
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
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  ${noiseFunctions}

  float fbm_corona(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    float freq = 4.0;
    for (int i = 0; i < 5; i++) {
        f += amp * snoise(p * freq);
        amp *= 0.5;
        freq *= 2.0;
    }
    return f;
  }

  void main() {
    // Basic falloff from the sun's limb
    float rim = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
    
    // Large-scale streamers
    float angle = atan(vWorldPosition.y, vWorldPosition.x);
    float streamerShape = snoise(vec3(angle * 5.0, time * 0.1, 0.0));
    streamerShape = pow(smoothstep(0.3, 0.7, streamerShape), 2.0);
    
    // Make streamers extend further out
    float streamerExtension = streamerShape * 0.4;
    float baseGlow = pow(smoothstep(0.0, 0.6 + streamerExtension, rim), 3.0);
    
    // Fibrous, wispy details stretched radially
    float radialDist = length(vWorldPosition.xy);
    vec3 noiseCoords = vec3(
        angle * 10.0, 
        radialDist * 4.0, 
        time * 0.2
    );
    float wisps = fbm_corona(noiseCoords);
    wisps = smoothstep(0.4, 0.6, wisps);
    
    // Combine components
    float finalIntensity = baseGlow * (0.3 + streamerShape * 0.7) * wisps;
    
    // Color
    vec3 coronaColor = vec3(1.0, 0.7, 0.4);
    
    gl_FragColor = vec4(coronaColor, finalIntensity * 1.5);
  }
`;

// --- MAGNETIC LOOP SHADERS ---
const magneticLoopVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const magneticLoopFragmentShader = `
  uniform float time;
  uniform float brightness;
  varying vec2 vUv;
  ${noiseFunctions.replace('snoise(vec3 v)', 'snoise3d(vec3 v)').replace('float snoise', 'float snoise2d')}

  void main() {
    float noise = snoise2d(vec2(vUv.x * 2.0, vUv.y * 20.0 - time * 2.0));
    float intensity = smoothstep(0.4, 0.6, noise);
    vec3 color = vec3(1.0, 0.5, 0.2) * intensity * brightness;
    float fade = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 2.0);
    gl_FragColor = vec4(color, fade * intensity * brightness * 0.8);
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
      gl_PointSize = 3.0 * (1.0 - (elapsedTime / duration));
      vOpacity = 0.8 * (1.0 - (elapsedTime / duration));
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
    gl_FragColor = vec4(1.0, 0.7, 0.3, vOpacity);
  }
`;

export const ThreeJS_Sun: React.FC<{ isFlareActive: boolean }> = ({ isFlareActive }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sunMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const coronaMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const loopMaterialsRef = useRef<THREE.ShaderMaterial[]>([]);
  const flareLightRef = useRef<THREE.PointLight | null>(null);
  const particleMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const flareStartTimeRef = useRef<number>(-1);
  const animationFrameIdRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;
    const currentMount = mountRef.current;
    
    // Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    currentMount.appendChild(renderer.domElement);
    
    // Sun
    const activeRegionCoords = new THREE.Vector2(0.65, 0.65);
    const sunGeometry = new THREE.SphereGeometry(2, 64, 64);
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        flareIntensity: { value: 0.0 },
        activeRegionCoords: { value: activeRegionCoords },
      },
      vertexShader: sunVertexShader,
      fragmentShader: sunFragmentShader,
    });
    sunMaterialRef.current = sunMaterial;
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    
    // Corona
    const coronaGeometry = new THREE.SphereGeometry(2.8, 64, 64); // Slightly larger for better effect
    const coronaMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0.0 } },
      vertexShader: coronaVertexShader,
      fragmentShader: coronaFragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    coronaMaterialRef.current = coronaMaterial;
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    scene.add(corona);

    // Magnetic Field Loops
    const loopsGroup = new THREE.Group();
    const loopMaterials: THREE.ShaderMaterial[] = [];
    const numLoops = 7;
    for (let i = 0; i < numLoops; i++) {
        const height = Math.random() * 0.5 + 0.2;
        const width = Math.random() * 0.3 + 0.2;
        const angle = (Math.random() - 0.5) * Math.PI * 0.5;

        const loopCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(width / 2, height, 0),
            new THREE.Vector3(width, 0, 0),
        ]);

        const loopGeometry = new THREE.TubeGeometry(loopCurve, 32, 0.01 + Math.random() * 0.02, 8, false);
        const loopMaterial = new THREE.ShaderMaterial({
            vertexShader: magneticLoopVertexShader,
            fragmentShader: magneticLoopFragmentShader,
            uniforms: {
                time: { value: 0.0 },
                brightness: { value: 1.5 },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        loopMaterials.push(loopMaterial);

        const loopMesh = new THREE.Mesh(loopGeometry, loopMaterial);
        loopMesh.rotation.z = angle;
        loopsGroup.add(loopMesh);
    }
    loopMaterialsRef.current = loopMaterials;

    // Position and orient the whole group of loops
    const position = new THREE.Vector3().setFromSphericalCoords(
        2.01, // radius just above the sun surface
        Math.PI * (0.5 - activeRegionCoords.y),
        Math.PI * (activeRegionCoords.x - 0.5) * 2
    );
    loopsGroup.position.copy(position);
    loopsGroup.lookAt(new THREE.Vector3(0, 0, 0));
    sun.add(loopsGroup); // Add to sun so it rotates with it

    // Stars background
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

    // Dynamic Flare Light
    const flareLight = new THREE.PointLight(0xffaa44, 0, 10, 2);
    flareLight.position.set(1.5, 1.5, 1.5);
    flareLightRef.current = flareLight;
    scene.add(flareLight);

    // Flare Particle System
    const particleCount = 5000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const startTimes = new Float32Array(particleCount);
    const basePosition = new THREE.Vector3().setFromSphericalCoords(
        2.1,
        Math.PI * (0.5 - activeRegionCoords.y),
        Math.PI * (activeRegionCoords.x - 0.5) * 2
    );
    for (let i = 0; i < particleCount; i++) {
      positions.set([basePosition.x, basePosition.y, basePosition.z], i * 3);
      const theta = (Math.PI / 2 - Math.PI * (0.5 - activeRegionCoords.y)) + (Math.random() - 0.5) * 0.2;
      const phi = (Math.PI * (activeRegionCoords.x - 0.5) * 2) + (Math.random() - 0.5) * 0.2;
      const speed = Math.random() * 2 + 1;
      const velocity = new THREE.Vector3();
      velocity.setFromSphericalCoords(1, theta, phi);
      velocity.multiplyScalar(speed);
      velocities.set([velocity.x, velocity.y, velocity.z], i * 3);
      startTimes[i] = Math.random() * 1.0; // Stagger particle start times
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    particleGeometry.setAttribute('startTime', new THREE.BufferAttribute(startTimes, 1));
    
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        duration: { value: 4.0 },
      },
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    particleMaterialRef.current = particleMaterial;
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // Post-processing: Bloom effect
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(currentMount.clientWidth, currentMount.clientHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 1.0; // Slightly reduced strength to appreciate corona details
    bloomPass.radius = 0.5;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    const clock = new THREE.Clock();
    
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      const width = currentMount.clientWidth;
      const height = currentMount.clientHeight;
      if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
        renderer.setSize(width, height, false);
        composer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      sun.rotation.y += 0.05 * delta;
      corona.rotation.y += 0.05 * delta;
      sunMaterial.uniforms.time.value = time;
      coronaMaterial.uniforms.time.value = time;
      loopMaterials.forEach(mat => mat.uniforms.time.value = time);
      
      if (flareStartTimeRef.current > 0) {
        const flareTime = time - flareStartTimeRef.current;
        if (flareTime < 4.0) {
          particleMaterialRef.current!.uniforms.time.value = flareTime;
        } else {
          flareStartTimeRef.current = -1;
        }
      }

      composer.render();
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      sunGeometry.dispose();
      sunMaterial.dispose();
      coronaGeometry.dispose();
      coronaMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      loopsGroup.children.forEach((child: any) => {
        if(child.geometry) child.geometry.dispose();
        if(child.material) child.material.dispose();
      });
    };
  }, []);
  
  useEffect(() => {
    let flareAnimationId: number;
    if (isFlareActive) {
      if (sunMaterialRef.current && loopMaterialsRef.current.length > 0 && flareLightRef.current && particleMaterialRef.current) {
        const sunMaterial = sunMaterialRef.current;
        const loopMaterials = loopMaterialsRef.current;
        const flareLight = flareLightRef.current;
        
        flareStartTimeRef.current = performance.now() / 1000;
        particleMaterialRef.current.uniforms.time.value = 0;

        let flareTime = 0;
        const duration = 0.5; // seconds for the main flash

        const animateFlare = () => {
            flareTime += 1 / 60; // Assuming 60fps
            const progress = Math.min(flareTime / duration, 1.0);
            const intensity = Math.sin(progress * Math.PI) * 5.0; 
            
            sunMaterial.uniforms.flareIntensity.value = intensity;
            flareLight.intensity = intensity;
            loopMaterials.forEach(mat => {
                mat.uniforms.brightness.value = 1.5 + intensity * 2.0;
            });
            
            if (progress < 1.0) {
                flareAnimationId = requestAnimationFrame(animateFlare);
            } else {
                sunMaterial.uniforms.flareIntensity.value = 0.0;
                flareLight.intensity = 0.0;
                loopMaterials.forEach(mat => {
                    mat.uniforms.brightness.value = 1.5;
                });
            }
        };
        animateFlare();
      }
    }
    return () => cancelAnimationFrame(flareAnimationId);
  }, [isFlareActive]);

  return <div ref={mountRef} className="w-full h-full" />;
};
