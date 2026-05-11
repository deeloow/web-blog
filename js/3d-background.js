// 3D Background Animation using Three.js
(function() {
  let scene, camera, renderer, particles, geometry;
  let animationId = null;

  function initThreeJs() {
    // Get canvas element
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1e3c);
    scene.fog = new THREE.Fog(0x0b1e3c, 1000, 5000);

    // Camera setup
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 100;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;

    // Create particle geometry
    createParticles();

    // Create rotating shapes
    createShapes();

    // Add lighting
    const light = new THREE.PointLight(0x2f80ed, 1.5, 500);
    light.position.set(50, 50, 50);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x4a7bff, 0.6);
    scene.add(ambientLight);

    // Start animation loop
    animate();

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    return true;
  }

  function createParticles() {
    // Create particle geometry
    geometry = new THREE.BufferGeometry();
    const particleCount = 150;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      // Positions
      positions[i] = (Math.random() - 0.5) * 400;
      positions[i + 1] = (Math.random() - 0.5) * 400;
      positions[i + 2] = (Math.random() - 0.5) * 400;

      // Colors - blue shades
      const hue = 0.6 + Math.random() * 0.1; // Blue range
      const rgb = hslToRgb(hue, 0.8, 0.5);
      colors[i] = rgb.r;
      colors[i + 1] = rgb.g;
      colors[i + 2] = rgb.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      sizeAttenuation: true,
      opacity: 0.8,
      transparent: true,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Store initial positions for animation
    particles.userData.initialPositions = new Float32Array(positions);
    particles.userData.speeds = new Float32Array(particleCount).fill(0).map(() => ({
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.3,
      z: (Math.random() - 0.5) * 0.3,
    }));
  }

  function createShapes() {
    // Create a rotating geometric shape
    const geometryShape = new THREE.IcosahedronGeometry(30, 4);
    const material = new THREE.MeshPhongMaterial({
      color: 0x2f80ed,
      wireframe: true,
      opacity: 0.15,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometryShape, material);
    mesh.position.set(0, 0, 0);
    mesh.userData.speed = { x: 0.002, y: 0.003, z: 0.001 };
    scene.add(mesh);

    // Create another shape
    const geometryShape2 = new THREE.OctahedronGeometry(40, 2);
    const material2 = new THREE.MeshPhongMaterial({
      color: 0x4a7bff,
      wireframe: true,
      opacity: 0.1,
      transparent: true,
    });

    const mesh2 = new THREE.Mesh(geometryShape2, material2);
    mesh2.position.set(-50, 30, -50);
    mesh2.userData.speed = { x: -0.001, y: 0.002, z: 0.002 };
    scene.add(mesh2);
  }

  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r, g, b };
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    // Rotate particles
    if (particles) {
      particles.rotation.x += 0.0001;
      particles.rotation.y += 0.0002;

      // Move particles in waves
      const positions = particles.geometry.attributes.position.array;
      const initialPositions = particles.userData.initialPositions;
      const speeds = particles.userData.speeds;

      for (let i = 0; i < positions.length; i += 3) {
        const idx = i / 3;
        positions[i] = initialPositions[i] + Math.sin(Date.now() * speeds[idx].x * 0.001) * 10;
        positions[i + 1] = initialPositions[i + 1] + Math.cos(Date.now() * speeds[idx].y * 0.001) * 10;
        positions[i + 2] = initialPositions[i + 2] + Math.sin(Date.now() * speeds[idx].z * 0.001) * 10;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    }

    // Rotate geometric shapes
    scene.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.speed) {
        child.rotation.x += child.userData.speed.x;
        child.rotation.y += child.userData.speed.y;
        child.rotation.z += child.userData.speed.z;
      }
    });

    // Render
    renderer.render(scene, camera);
  }

  function onWindowResize() {
    if (!camera || !renderer) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function cleanUp() {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (renderer) {
      renderer.dispose();
      geometry && geometry.dispose();
    }
    window.removeEventListener('resize', onWindowResize);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThreeJs);
  } else {
    initThreeJs();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanUp);
})();
