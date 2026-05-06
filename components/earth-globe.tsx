import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function EarthGlobe() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 4.6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Earth
    const loader = new THREE.TextureLoader();
    const earthTexture = loader.load('/textures/earth.jpg');
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = 8;

    const earthGeo = new THREE.SphereGeometry(1, 96, 96);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 6,
      specular: new THREE.Color(0x222233),
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.rotation.z = THREE.MathUtils.degToRad(23.5);
    scene.add(earth);

    // Atmosphere (fresnel-ish glow via back-side shader)
    const atmoGeo = new THREE.SphereGeometry(1.06, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      uniforms: { uColor: { value: new THREE.Color(0x4da3ff) } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 uColor;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(uColor, 1.0) * intensity;
        }
      `,
    });
    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmosphere);

    // Lights
    const ambient = new THREE.AmbientLight(0x334455, 1.2);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.6);
    sun.position.set(5, 1.5, 3);
    scene.add(sun);

    // Orbital plane (tilted)
    const orbitPlane = new THREE.Group();
    orbitPlane.rotation.x = THREE.MathUtils.degToRad(65);
    orbitPlane.rotation.z = THREE.MathUtils.degToRad(-15);
    scene.add(orbitPlane);

    // Orbit ring (in orbitPlane's XZ plane)
    const ringGeo = new THREE.RingGeometry(1.54, 1.56, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    orbitPlane.add(ring);

    // Satellite (body + solar panels + antenna + beacon)
    const satOrbit = new THREE.Group();
    orbitPlane.add(satOrbit);

    const sat = new THREE.Group();
    sat.position.set(1.55, 0, 0);
    sat.rotation.y = Math.PI / 2; // wings perpendicular to radial
    satOrbit.add(sat);

    const bodyGeo = new THREE.BoxGeometry(0.05, 0.045, 0.07);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0xc8c8d0,
      shininess: 50,
      specular: 0x444455,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    sat.add(body);

    const panelGeo = new THREE.BoxGeometry(0.14, 0.004, 0.06);
    const panelMat = new THREE.MeshPhongMaterial({
      color: 0x18337a,
      shininess: 90,
      specular: 0x88aaff,
      emissive: 0x071433,
    });
    const leftPanel = new THREE.Mesh(panelGeo, panelMat);
    leftPanel.position.x = -0.105;
    sat.add(leftPanel);
    const rightPanel = new THREE.Mesh(panelGeo, panelMat);
    rightPanel.position.x = 0.105;
    sat.add(rightPanel);

    // Panel connector struts
    const strutGeo = new THREE.BoxGeometry(0.04, 0.006, 0.006);
    const strutMat = new THREE.MeshPhongMaterial({ color: 0x888890 });
    const leftStrut = new THREE.Mesh(strutGeo, strutMat);
    leftStrut.position.x = -0.045;
    sat.add(leftStrut);
    const rightStrut = new THREE.Mesh(strutGeo, strutMat);
    rightStrut.position.x = 0.045;
    sat.add(rightStrut);

    // Antenna dish (parabolic-ish)
    const dishGeo = new THREE.CylinderGeometry(0.018, 0.008, 0.01, 12, 1, true);
    const dishMat = new THREE.MeshPhongMaterial({
      color: 0xe8e8ee,
      shininess: 70,
      side: THREE.DoubleSide,
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0, 0.035, 0);
    sat.add(dish);

    // Beacon LED
    const beaconGeo = new THREE.SphereGeometry(0.005, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, -0.028, 0);
    sat.add(beacon);

    // Animation
    let rafId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      earth.rotation.y += dt * 0.08;
      satOrbit.rotation.y += dt * 0.5;
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      earthTexture.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      bodyGeo.dispose();
      bodyMat.dispose();
      panelGeo.dispose();
      panelMat.dispose();
      strutGeo.dispose();
      strutMat.dispose();
      dishGeo.dispose();
      dishMat.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={ref} className="h-full w-full" />;
}
