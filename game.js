let scene, camera, renderer, player, clock;
let isPaused = true;
let isFirstPerson = false;
let yaw = new THREE.Object3D(); // Horizontal rotation
let pitch = new THREE.Object3D(); // Vertical rotation
let particles = [];
let keys = {};

// Settings
let settings = {
    fov: 75,
    sensitivity: 0.002,
    smoothing: true,
    headbob: true,
    shake: 0
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.05);

    camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Player & Camera Setup
    player = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({ color: 0x444444 }));
    player.position.y = 1;
    scene.add(player);

    // Rigging camera to rotations
    scene.add(yaw);
    yaw.add(pitch);
    // In TPS, the camera is a child of pitch but offset back
    pitch.add(camera);

    // Lighting & World
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x112211 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    clock = new THREE.Clock();

    setupListeners();
    document.getElementById('start-btn').style.display = 'block';
}

function setupListeners() {
    // Pointer Lock for FPS Cursor
    renderer.domElement.addEventListener('click', () => {
        if (!isPaused) renderer.domElement.requestPointerLock();
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === renderer.domElement && !isPaused) {
            yaw.rotation.y -= e.movementX * settings.sensitivity;
            pitch.rotation.x -= e.movementY * settings.sensitivity;
            pitch.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch.rotation.x));
        }
    });

    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'KeyV') isFirstPerson = !isFirstPerson;
        if (e.code === 'KeyP') toggleMenu();
    });
    window.addEventListener('keyup', e => keys[e.code] = false);
    
    document.getElementById('start-btn').onclick = () => {
        document.getElementById('loading-screen').style.display = 'none';
        isPaused = false;
        renderer.domElement.requestPointerLock();
        animate();
    };

    document.getElementById('resume-btn').onclick = toggleMenu;
}

function toggleMenu() {
    isPaused = !isPaused;
    document.getElementById('menu').style.display = isPaused ? 'flex' : 'none';
    if (!isPaused) {
        renderer.domElement.requestPointerLock();
    } else {
        document.exitPointerLock();
    }
}

function updateCamera() {
    // Positioning the Rig on Player
    yaw.position.copy(player.position);
    yaw.position.y += 1.5;

    if (isFirstPerson) {
        camera.position.set(0, 0, 0);
        // Headbob
        if (settings.headbob && (keys['KeyW'] || keys['KeyS'])) {
            camera.position.y = Math.sin(Date.now() * 0.01) * 0.05;
        }
    } else {
        // Third Person Camera + Collision
        const idealOffset = new THREE.Vector3(0, 1, 5);
        
        // Simple Raycast for Collision
        const rayDir = idealOffset.clone().applyQuaternion(yaw.quaternion).normalize();
        const ray = new THREE.Raycaster(player.position, rayDir, 0, 5);
        const intersects = ray.intersectObjects(scene.children);
        
        if (intersects.length > 0) {
            camera.position.set(0, 1, intersects[0].distance - 0.5);
        } else {
            camera.position.lerp(idealOffset, 0.1); // Camera Smoothing
        }
    }
}

function animate() {
    if (isPaused) return;
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const moveSpeed = 10 * delta;

    // Movement relative to camera view
    if (keys['KeyW']) player.translateZ(-moveSpeed);
    if (keys['KeyS']) player.translateZ(moveSpeed);
    if (keys['KeyA']) player.translateX(-moveSpeed);
    if (keys['KeyD']) player.translateX(moveSpeed);

    // Update Player Rotation to match Camera Yaw (except in some free-look cases)
    player.rotation.y = yaw.rotation.y;

    updateCamera();
    renderer.render(scene, camera);
}

window.onload = init;
