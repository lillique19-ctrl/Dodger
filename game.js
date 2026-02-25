let scene, camera, renderer, player, clock;
let yaw = new THREE.Object3D(), pitch = new THREE.Object3D();
let isPaused = true, isFirstPerson = false, isStealth = false, isWheelOpen = false;
let keys = {}, enemies = [], bloodParticles = [];
let currentWeapon = 'FIST', takedownTarget = null;

const settings = { fov: 75, sensitivity: 0.002, headbob: true };

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.05);

    camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth/window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Player Rigging
    player = new THREE.Group();
    let body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1, 4, 8), new THREE.MeshStandardMaterial({color: 0x444444}));
    player.add(body);
    scene.add(player);
    scene.add(yaw);
    yaw.add(pitch);
    pitch.add(camera);

    // World & Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    let sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(10, 20, 10);
    scene.add(sun);

    let ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({color: 0x111811}));
    ground.rotation.x = -Math.PI/2;
    scene.add(ground);

    // Spawn 5 AI Enemies
    for(let i=0; i<5; i++) spawnEnemy(Math.random()*40-20, Math.random()*40-20);

    clock = new THREE.Clock();
    setupEvents();
}

function spawnEnemy(x, z) {
    let e = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({color: 0xaa0000}));
    e.position.set(x, 1, z);
    e.userData = { hp: 100, state: 'patrol' };
    scene.add(e);
    enemies.push(e);
}

function setupEvents() {
    document.getElementById('start-btn').onclick = () => {
        document.getElementById('loading-screen').style.display = 'none';
        isPaused = false;
        renderer.domElement.requestPointerLock();
        animate();
    };

    document.getElementById('resume-btn').onclick = () => {
        isPaused = false;
        document.getElementById('menu').style.display = 'none';
        renderer.domElement.requestPointerLock();
    };

    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if(e.code === 'KeyV') isFirstPerson = !isFirstPerson;
        if(e.code === 'KeyP') toggleMenu();
        if(e.code === 'KeyC') toggleStealth();
        if(e.code === 'KeyE') performTakedown();
        if(e.code === 'KeyQ') toggleWheel(true);
        if(['Digit1','Digit2','Digit3','Digit4'].includes(e.code)) switchWeapon(e.code);
    });
    window.addEventListener('keyup', e => {
        keys[e.code] = false;
        if(e.code === 'KeyQ') toggleWheel(false);
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === renderer.domElement && !isPaused) {
            yaw.rotation.y -= e.movementX * settings.sensitivity;
            pitch.rotation.x -= e.movementY * settings.sensitivity;
            pitch.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch.rotation.x));
        }
    });

    window.addEventListener('mousedown', () => { if(!isPaused && !isWheelOpen) attack(); });
}

function toggleMenu() {
    isPaused = !isPaused;
    document.getElementById('menu').style.display = isPaused ? 'flex' : 'none';
    if(!isPaused) renderer.domElement.requestPointerLock();
}

function toggleStealth() {
    isStealth = !isStealth;
    document.getElementById('stealth-meter').style.display = isStealth ? 'block' : 'none';
}

function toggleWheel(open) {
    isWheelOpen = open;
    document.getElementById('weapon-wheel').style.display = open ? 'flex' : 'none';
    if(open) document.exitPointerLock(); else renderer.domElement.requestPointerLock();
}

function switchWeapon(code) {
    const map = {'Digit1':'FIST', 'Digit2':'KICK', 'Digit3':'SWORD', 'Digit4':'GUN'};
    currentWeapon = map[code];
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('active'));
    document.getElementById('slot-'+currentWeapon).classList.add('active');
}

function attack() {
    enemies.forEach(enemy => {
        if(player.position.distanceTo(enemy.position) < 4) {
            enemy.userData.hp -= 30;
            spawnBlood(enemy.position, 10);
            if(enemy.userData.hp <= 0) killEnemy(enemy);
        }
    });
}

function performTakedown() {
    if(takedownTarget) {
        spawnBlood(takedownTarget.position, 50);
        document.getElementById('vignette').classList.add('kill-flash');
        setTimeout(()=> document.getElementById('vignette').classList.remove('kill-flash'), 400);
        killEnemy(takedownTarget);
    }
}

function killEnemy(enemy) {
    scene.remove(enemy);
    enemies = enemies.filter(e => e !== enemy);
    takedownTarget = null;
    document.getElementById('action-prompt').style.display = 'none';
}

function spawnBlood(pos, count) {
    for(let i=0; i<count; i++) {
        let p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({color: 0x880000}));
        p.position.copy(pos);
        p.userData.vel = new THREE.Vector3((Math.random()-0.5)*0.3, Math.random()*0.3, (Math.random()-0.5)*0.3);
        scene.add(p);
        bloodParticles.push(p);
    }
}

function animate() {
    if(isPaused || isWheelOpen) return;
    requestAnimationFrame(animate);
    let delta = clock.getDelta();

    // Movement
    let speed = (isStealth ? 4 : 10) * delta;
    if(keys['KeyW']) player.translateZ(-speed);
    if(keys['KeyS']) player.translateZ(speed);
    if(keys['KeyA']) player.translateX(-speed);
    if(keys['KeyD']) player.translateX(speed);

    player.rotation.y = yaw.rotation.y;
    yaw.position.copy(player.position);

    // Camera Mode
    if(isFirstPerson) {
        camera.position.set(0, 1.5, 0);
    } else {
        camera.position.lerp(new THREE.Vector3(0, 2, 6), 0.1);
    }

    // AI & Takedown Check
    takedownTarget = null;
    enemies.forEach(e => {
        let dist = player.position.distanceTo(e.position);
        if(dist < 15 && !isStealth) e.position.lerp(player.position, 0.01);
        
        // Stealth Takedown Logic
        if(isStealth && dist < 2.5) {
            takedownTarget = e;
            document.getElementById('action-prompt').innerText = "PRESS [E] TO KILL";
            document.getElementById('action-prompt').style.display = 'block';
        }
    });
    if(!takedownTarget) document.getElementById('action-prompt').style.display = 'none';

    // Blood particles
    bloodParticles.forEach((p, i) => {
        p.position.add(p.userData.vel);
        p.userData.vel.y -= 0.01;
        if(p.position.y < 0) { scene.remove(p); bloodParticles.splice(i,1); }
    });

    renderer.render(scene, camera);
}

init();
