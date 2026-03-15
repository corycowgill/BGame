// ============================================================================
// PIRATE SHIP BATTLE - Full 3D Local Multiplayer Game
// ============================================================================

// ---- Global State ----
const Game = {
    scene: null, camera: null, renderer: null, clock: null,
    players: [], projectiles: [], particles: [], hazards: [],
    keys: {}, currentMap: 'open_sea', gameActive: false,
    mapObjects: [], waterMesh: null, skybox: null,
    boardingActive: [false, false],
    hazardTimer: 0, waveTime: 0,
    winner: null
};

// ---- Constants ----
const WORLD_SIZE = 200;
const SHIP_SPEED = 18;
const TURN_SPEED = 1.5;
const CANNON_DAMAGE = 15;
const FLINTLOCK_DAMAGE = 8;
const SWORD_DAMAGE = 12;
const MUSKET_DAMAGE = 20;
const CANNON_COOLDOWN = 1.5;
const FLINTLOCK_COOLDOWN = 2.0;
const SWORD_COOLDOWN = 0.8;
const MUSKET_COOLDOWN = 3.0;
const BOARD_RANGE = 25;
const RAID_RANGE = 20;
const RAID_COINS = 10;
const FLINTLOCK_RANGE = 40;
const MUSKET_RANGE = 60;
const MAX_HULL = 100;
const MAX_HEALTH = 100;

// ---- Initialization ----
function init() {
    updateLoading(10, 'Initializing renderer...');

    Game.clock = new THREE.Clock();
    Game.scene = new THREE.Scene();

    Game.renderer = new THREE.WebGLRenderer({ antialias: true });
    Game.renderer.setSize(window.innerWidth, window.innerHeight);
    Game.renderer.setPixelRatio(window.devicePixelRatio);
    Game.renderer.shadowMap.enabled = true;
    Game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    Game.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    Game.renderer.toneMappingExposure = 1.2;
    document.body.appendChild(Game.renderer.domElement);

    Game.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    Game.camera.position.set(0, 80, 100);
    Game.camera.lookAt(0, 0, 0);

    updateLoading(20, 'Setting up lighting...');
    setupLighting();

    updateLoading(30, 'Creating the ocean...');
    createOcean();

    updateLoading(50, 'Building ships...');
    createPlayers();

    updateLoading(70, 'Preparing sea monsters...');
    setupControls();

    updateLoading(90, 'Hoisting the sails...');

    setTimeout(() => {
        updateLoading(100, 'Ready to sail!');
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('menu-screen').classList.add('active');
        }, 500);
    }, 300);

    window.addEventListener('resize', onResize);
    animate();
}

function updateLoading(pct, text) {
    document.getElementById('loading-bar').style.width = pct + '%';
    document.getElementById('loading-text').textContent = text;
}

// ---- Lighting ----
function setupLighting() {
    const ambient = new THREE.AmbientLight(0x446688, 0.6);
    Game.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    Game.scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x0a4a2a, 0.4);
    Game.scene.add(hemi);

    // Fog for atmosphere
    Game.scene.fog = new THREE.FogExp2(0x4488aa, 0.003);
}

// ---- Ocean ----
function createOcean() {
    // Water plane with custom shader
    const waterGeo = new THREE.PlaneGeometry(600, 600, 128, 128);
    const waterMat = new THREE.MeshPhongMaterial({
        color: 0x006994,
        specular: 0x4488aa,
        shininess: 80,
        transparent: true,
        opacity: 0.85,
        flatShading: false
    });
    Game.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    Game.waterMesh.rotation.x = -Math.PI / 2;
    Game.waterMesh.receiveShadow = true;
    Game.scene.add(Game.waterMesh);

    // Deep water below
    const deepGeo = new THREE.PlaneGeometry(800, 800);
    const deepMat = new THREE.MeshBasicMaterial({ color: 0x001a33 });
    const deep = new THREE.Mesh(deepGeo, deepMat);
    deep.rotation.x = -Math.PI / 2;
    deep.position.y = -5;
    Game.scene.add(deep);

    // Skybox
    createSkybox();
}

function createSkybox() {
    const skyGeo = new THREE.SphereGeometry(400, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
        side: THREE.BackSide
    });

    // Create gradient texture for sky
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(0.3, '#4a6fa5');
    gradient.addColorStop(0.5, '#87ceeb');
    gradient.addColorStop(0.7, '#b8d4e8');
    gradient.addColorStop(1.0, '#e8c170');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    // Add some clouds
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * 512;
        const y = 80 + Math.random() * 150;
        const w = 40 + Math.random() * 80;
        const h = 10 + Math.random() * 20;
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    skyMat.map = new THREE.CanvasTexture(canvas);
    Game.skybox = new THREE.Mesh(skyGeo, skyMat);
    Game.scene.add(Game.skybox);
}

function animateWater(dt) {
    Game.waveTime += dt;
    const positions = Game.waterMesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getY(i);
        const wave1 = Math.sin(x * 0.05 + Game.waveTime * 1.5) * 1.2;
        const wave2 = Math.sin(z * 0.07 + Game.waveTime * 1.0) * 0.8;
        const wave3 = Math.sin((x + z) * 0.03 + Game.waveTime * 0.7) * 0.5;
        positions.setZ(i, wave1 + wave2 + wave3);
    }
    positions.needsUpdate = true;
    Game.waterMesh.geometry.computeVertexNormals();
}

// ---- Ship Builder ----
function buildShip(color, accentColor) {
    const ship = new THREE.Group();

    // Hull - elegant pirate ship shape
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-8, 0);
    hullShape.quadraticCurveTo(-9, 3, -7, 5);
    hullShape.lineTo(7, 5);
    hullShape.quadraticCurveTo(9, 3, 8, 0);
    hullShape.lineTo(-8, 0);

    const extrudeSettings = { steps: 1, depth: 3, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.3 };
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, extrudeSettings);
    const hullMat = new THREE.MeshPhongMaterial({ color: 0x5c3a1e, specular: 0x332211, shininess: 20 });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.rotation.x = -Math.PI / 2;
    hull.position.y = 0.5;
    hull.castShadow = true;
    ship.add(hull);

    // Main deck
    const deckGeo = new THREE.BoxGeometry(14, 0.3, 5);
    const deckMat = new THREE.MeshPhongMaterial({ color: 0x8B6914 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = 3.2;
    deck.castShadow = true;
    ship.add(deck);

    // Raised stern (poop deck)
    const sternGeo = new THREE.BoxGeometry(5, 2.5, 5.5);
    const sternMat = new THREE.MeshPhongMaterial({ color: 0x5c3a1e });
    const stern = new THREE.Mesh(sternGeo, sternMat);
    stern.position.set(-5, 4, 0);
    stern.castShadow = true;
    ship.add(stern);

    // Captain's cabin
    const cabinGeo = new THREE.BoxGeometry(4, 2, 4);
    const cabinMat = new THREE.MeshPhongMaterial({ color: 0x6b4226 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(-5, 6, 0);
    cabin.castShadow = true;
    ship.add(cabin);

    // Cabin windows
    const windowMat = new THREE.MeshPhongMaterial({ color: 0xffdd88, emissive: 0x886622, emissiveIntensity: 0.5 });
    for (let wz = -1; wz <= 1; wz++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.6), windowMat);
        win.position.set(-7.05, 6, wz * 1.2);
        ship.add(win);
    }

    // Bowsprit (front pole)
    const bowGeo = new THREE.CylinderGeometry(0.15, 0.1, 8, 8);
    const bowMat = new THREE.MeshPhongMaterial({ color: 0x8B6914 });
    const bow = new THREE.Mesh(bowGeo, bowMat);
    bow.rotation.z = Math.PI / 4;
    bow.position.set(10, 4, 0);
    ship.add(bow);

    // Main mast
    const mastGeo = new THREE.CylinderGeometry(0.25, 0.3, 16, 8);
    const mastMat = new THREE.MeshPhongMaterial({ color: 0x6b4226 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(1, 10, 0);
    mast.castShadow = true;
    ship.add(mast);

    // Fore mast
    const foreMast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 12, 8), mastMat);
    foreMast.position.set(5, 8, 0);
    foreMast.castShadow = true;
    ship.add(foreMast);

    // Mizzen mast
    const mizzen = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 10, 8), mastMat);
    mizzen.position.set(-3, 9, 0);
    mizzen.castShadow = true;
    ship.add(mizzen);

    // Sails - main
    const sailMat = new THREE.MeshPhongMaterial({
        color: 0xf5f0e0, side: THREE.DoubleSide, transparent: true, opacity: 0.9
    });
    const accentSailMat = new THREE.MeshPhongMaterial({
        color: accentColor, side: THREE.DoubleSide, transparent: true, opacity: 0.85
    });

    // Main sail
    const mainSailGeo = new THREE.PlaneGeometry(6, 7);
    deformSail(mainSailGeo);
    const mainSail = new THREE.Mesh(mainSailGeo, sailMat);
    mainSail.position.set(1, 12, 0);
    mainSail.castShadow = true;
    ship.add(mainSail);

    // Fore sail
    const foreSailGeo = new THREE.PlaneGeometry(5, 5);
    deformSail(foreSailGeo);
    const foreSail = new THREE.Mesh(foreSailGeo, accentSailMat);
    foreSail.position.set(5, 10, 0);
    ship.add(foreSail);

    // Mizzen sail
    const mizSailGeo = new THREE.PlaneGeometry(4, 4);
    deformSail(mizSailGeo);
    const mizSail = new THREE.Mesh(mizSailGeo, sailMat);
    mizSail.position.set(-3, 11, 0);
    ship.add(mizSail);

    // Crow's nest
    const nestGeo = new THREE.CylinderGeometry(1, 0.8, 1.2, 8, 1, true);
    const nestMat = new THREE.MeshPhongMaterial({ color: 0x5c3a1e });
    const nest = new THREE.Mesh(nestGeo, nestMat);
    nest.position.set(1, 17.5, 0);
    ship.add(nest);

    // Flag at top
    const flagGeo = new THREE.PlaneGeometry(3, 2);
    const flagCanvas = document.createElement('canvas');
    flagCanvas.width = 128; flagCanvas.height = 86;
    const fctx = flagCanvas.getContext('2d');
    fctx.fillStyle = '#111';
    fctx.fillRect(0, 0, 128, 86);
    // Skull and crossbones
    fctx.fillStyle = '#fff';
    fctx.beginPath();
    fctx.arc(64, 30, 18, 0, Math.PI * 2);
    fctx.fill();
    fctx.fillStyle = '#111';
    fctx.beginPath(); fctx.arc(56, 27, 4, 0, Math.PI * 2); fctx.fill();
    fctx.beginPath(); fctx.arc(72, 27, 4, 0, Math.PI * 2); fctx.fill();
    fctx.fillStyle = '#111';
    fctx.fillRect(56, 38, 16, 3);
    fctx.fillStyle = '#fff';
    fctx.fillRect(40, 55, 48, 5);
    fctx.fillRect(40, 65, 48, 5);

    const flagMat = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(flagCanvas),
        side: THREE.DoubleSide, transparent: true
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(1, 19.5, 0);
    ship.add(flag);
    ship.userData.flag = flag;

    // Cannons (3 per side)
    const cannonMat = new THREE.MeshPhongMaterial({ color: 0x222222, specular: 0x555555, shininess: 60 });
    for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i++) {
            const cannonGroup = new THREE.Group();
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 2, 8), cannonMat);
            barrel.rotation.z = Math.PI / 2;
            cannonGroup.add(barrel);
            const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), new THREE.MeshPhongMaterial({ color: 0x5c3a1e }));
            base.position.y = -0.3;
            cannonGroup.add(base);
            cannonGroup.position.set(-2 + i * 3, 3.5, side * 3);
            cannonGroup.rotation.y = side > 0 ? 0 : Math.PI;
            ship.add(cannonGroup);
        }
    }

    // Railing
    const railMat = new THREE.MeshPhongMaterial({ color: 0x5c3a1e });
    for (let side = -1; side <= 1; side += 2) {
        for (let i = -6; i <= 6; i += 2) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), railMat);
            post.position.set(i, 3.9, side * 2.6);
            ship.add(post);
        }
        const rail = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 0.1), railMat);
        rail.position.set(0, 4.4, side * 2.6);
        ship.add(rail);
    }

    // Team color stripe
    const stripeMat = new THREE.MeshPhongMaterial({ color: color, emissive: color, emissiveIntensity: 0.3 });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.8, 0.1), stripeMat);
    stripe.position.set(0, 2, 3.3);
    ship.add(stripe);
    const stripe2 = stripe.clone();
    stripe2.position.z = -3.3;
    ship.add(stripe2);

    // Figurehead (front of ship)
    const figGeo = new THREE.ConeGeometry(0.5, 2, 6);
    const figMat = new THREE.MeshPhongMaterial({ color: 0xd4a030 });
    const fig = new THREE.Mesh(figGeo, figMat);
    fig.rotation.z = -Math.PI / 2;
    fig.position.set(8, 2.5, 0);
    ship.add(fig);

    // Lanterns
    const lanternMat = new THREE.MeshPhongMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.8 });
    const lantern1 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), lanternMat);
    lantern1.position.set(-7, 6.5, 1.5);
    ship.add(lantern1);
    const lanternLight1 = new THREE.PointLight(0xff8800, 0.5, 10);
    lanternLight1.position.copy(lantern1.position);
    ship.add(lanternLight1);

    const lantern2 = lantern1.clone();
    lantern2.position.z = -1.5;
    ship.add(lantern2);

    ship.castShadow = true;

    // Pirates on deck
    for (let i = 0; i < 4; i++) {
        const pirate = buildPirate(color);
        pirate.position.set(-3 + i * 2.5, 3.6, (Math.random() - 0.5) * 3);
        pirate.scale.set(0.6, 0.6, 0.6);
        ship.add(pirate);
    }

    return ship;
}

function deformSail(geo) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        pos.setZ(i, z + Math.sin(pos.getX(i) * 0.5) * 1.5 + Math.sin(pos.getY(i) * 0.3) * 0.5);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
}

// ---- Pirate Builder ----
function buildPirate(teamColor) {
    const pirate = new THREE.Group();
    const skinColor = 0xd4a574;

    // Body
    const bodyMat = new THREE.MeshPhongMaterial({ color: teamColor });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.5), bodyMat);
    body.position.y = 1.8;
    pirate.add(body);

    // Head
    const headMat = new THREE.MeshPhongMaterial({ color: skinColor });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), headMat);
    head.position.y = 2.8;
    pirate.add(head);

    // Hat
    const hatMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 8), hatMat);
    hatBrim.position.y = 3.1;
    pirate.add(hatBrim);
    const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.4, 8), hatMat);
    hatTop.position.y = 3.3;
    pirate.add(hatTop);

    // Legs
    const legMat = new THREE.MeshPhongMaterial({ color: 0x3a2210 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), legMat);
    legL.position.set(-0.2, 0.7, 0);
    pirate.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.2;
    pirate.add(legR);

    // Arms
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), bodyMat);
    armL.position.set(-0.55, 1.8, 0);
    pirate.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.55;
    pirate.add(armR);

    // Sword at hip
    const swordMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, specular: 0xffffff, shininess: 100 });
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.15), swordMat);
    sword.position.set(0.6, 1.4, 0);
    sword.rotation.z = 0.3;
    pirate.add(sword);
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.35), new THREE.MeshPhongMaterial({ color: 0x8B4513 }));
    hilt.position.set(0.52, 2.0, 0);
    pirate.add(hilt);

    return pirate;
}

// ---- Player Setup ----
function createPlayers() {
    const ship1 = buildShip(0xcc3333, 0xcc3333);
    ship1.position.set(-60, 2, 0);
    ship1.rotation.y = Math.PI / 2;
    Game.scene.add(ship1);

    const ship2 = buildShip(0x3333cc, 0x3333cc);
    ship2.position.set(60, 2, 0);
    ship2.rotation.y = -Math.PI / 2;
    Game.scene.add(ship2);

    Game.players = [
        {
            ship: ship1, hull: MAX_HULL, health: MAX_HEALTH, coins: 0,
            vx: 0, vz: 0, speed: 0,
            cooldowns: { cannon: 0, flintlock: 0, sword: 0, musket: 0, board: 0, raid: 0 },
            name: 'Captain Redbeard', color: 0xcc3333,
            kills: 0, raidCount: 0,
            controls: { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
                        cannon: 'KeyF', flintlock: 'KeyG', sword: 'KeyR', musket: 'KeyT',
                        board: 'KeyE', raid: 'KeyQ' }
        },
        {
            ship: ship2, hull: MAX_HULL, health: MAX_HEALTH, coins: 0,
            vx: 0, vz: 0, speed: 0,
            cooldowns: { cannon: 0, flintlock: 0, sword: 0, musket: 0, board: 0, raid: 0 },
            name: 'Captain Bluebeard', color: 0x3333cc,
            kills: 0, raidCount: 0,
            controls: { forward: 'ArrowUp', back: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
                        cannon: 'KeyL', flintlock: 'KeyK', sword: 'KeyO', musket: 'KeyP',
                        board: 'Period', raid: 'Comma' }
        }
    ];
}

// ---- Controls ----
function setupControls() {
    window.addEventListener('keydown', e => { Game.keys[e.code] = true; });
    window.addEventListener('keyup', e => { Game.keys[e.code] = false; });
}

// ---- Map Setup ----
function setupMap(mapType) {
    // Clear old map objects
    Game.mapObjects.forEach(o => Game.scene.remove(o));
    Game.mapObjects = [];
    Game.hazards = [];

    if (mapType === 'port') {
        createPortMap();
    } else {
        createOpenSeaMap();
    }
}

function createOpenSeaMap() {
    // Scattered rocks/small islands
    for (let i = 0; i < 6; i++) {
        const rock = createRock();
        const angle = (i / 6) * Math.PI * 2;
        const dist = 60 + Math.random() * 40;
        rock.position.set(Math.cos(angle) * dist, -1, Math.sin(angle) * dist);
        Game.scene.add(rock);
        Game.mapObjects.push(rock);
    }

    // Floating barrels / debris
    for (let i = 0; i < 10; i++) {
        const barrel = createBarrel();
        barrel.position.set((Math.random() - 0.5) * 150, 0.5, (Math.random() - 0.5) * 150);
        Game.scene.add(barrel);
        Game.mapObjects.push(barrel);
    }
}

function createPortMap() {
    // Two docks on opposite sides
    const dock1 = createDock();
    dock1.position.set(-80, 1, -30);
    Game.scene.add(dock1);
    Game.mapObjects.push(dock1);

    const dock2 = createDock();
    dock2.position.set(80, 1, -30);
    dock2.rotation.y = Math.PI;
    Game.scene.add(dock2);
    Game.mapObjects.push(dock2);

    // Port buildings
    for (let i = 0; i < 4; i++) {
        const building = createBuilding();
        building.position.set(-70 + i * 10, 1, -55);
        Game.scene.add(building);
        Game.mapObjects.push(building);
    }
    for (let i = 0; i < 4; i++) {
        const building = createBuilding();
        building.position.set(60 + i * 10, 1, -55);
        Game.scene.add(building);
        Game.mapObjects.push(building);
    }

    // Fort/fortress in the middle back
    const fort = createFort();
    fort.position.set(0, 1, -70);
    Game.scene.add(fort);
    Game.mapObjects.push(fort);

    // Rocks in the harbor
    for (let i = 0; i < 4; i++) {
        const rock = createRock();
        rock.position.set((Math.random() - 0.5) * 80, -1, 20 + Math.random() * 40);
        Game.scene.add(rock);
        Game.mapObjects.push(rock);
    }

    // Land mass behind port
    const landGeo = new THREE.BoxGeometry(250, 4, 60);
    const landMat = new THREE.MeshPhongMaterial({ color: 0x3a6b35 });
    const land = new THREE.Mesh(landGeo, landMat);
    land.position.set(0, 0, -70);
    land.receiveShadow = true;
    Game.scene.add(land);
    Game.mapObjects.push(land);

    // Sandy beach
    const beachGeo = new THREE.BoxGeometry(250, 0.5, 15);
    const beachMat = new THREE.MeshPhongMaterial({ color: 0xd4b96a });
    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.position.set(0, 0.5, -42);
    Game.scene.add(beach);
    Game.mapObjects.push(beach);
}

function createRock() {
    const group = new THREE.Group();
    const rockMat = new THREE.MeshPhongMaterial({ color: 0x666655, flatShading: true });
    for (let i = 0; i < 3; i++) {
        const geo = new THREE.DodecahedronGeometry(2 + Math.random() * 3, 0);
        const mesh = new THREE.Mesh(geo, rockMat);
        mesh.position.set(Math.random() * 3, Math.random() * 2, Math.random() * 3);
        mesh.rotation.set(Math.random(), Math.random(), Math.random());
        mesh.castShadow = true;
        group.add(mesh);
    }
    return group;
}

function createBarrel() {
    const group = new THREE.Group();
    const barrelMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 8), barrelMat);
    barrel.rotation.x = Math.PI / 2;
    group.add(barrel);
    // Metal bands
    const bandMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.05, 6, 12), bandMat);
    band1.rotation.y = Math.PI / 2;
    band1.position.z = 0.3;
    group.add(band1);
    const band2 = band1.clone();
    band2.position.z = -0.3;
    group.add(band2);
    return group;
}

function createDock() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshPhongMaterial({ color: 0x6b4226 });
    // Platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 10), woodMat);
    platform.position.y = 2;
    platform.castShadow = true;
    group.add(platform);
    // Pillars
    for (let x = -8; x <= 8; x += 4) {
        for (let z = -4; z <= 4; z += 4) {
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 8), woodMat);
            pillar.position.set(x, -0.5, z);
            group.add(pillar);
        }
    }
    return group;
}

function createBuilding() {
    const group = new THREE.Group();
    const w = 6 + Math.random() * 4;
    const h = 6 + Math.random() * 6;
    const colors = [0x8B6914, 0x9e8c6c, 0xb5a088, 0x7a6a4f];
    const wallMat = new THREE.MeshPhongMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, 8), wallMat);
    walls.position.y = h / 2 + 1;
    walls.castShadow = true;
    group.add(walls);
    // Roof
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x8B0000 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.7, 3, 4), roofMat);
    roof.position.y = h + 2.5;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    return group;
}

function createFort() {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshPhongMaterial({ color: 0x888877, flatShading: true });
    // Main wall
    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 3), stoneMat);
    wall.position.y = 6;
    wall.castShadow = true;
    group.add(wall);
    // Towers
    for (let side = -1; side <= 1; side += 2) {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 14, 8), stoneMat);
        tower.position.set(side * 16, 8, 0);
        tower.castShadow = true;
        group.add(tower);
        const top = new THREE.Mesh(new THREE.ConeGeometry(4, 4, 8), new THREE.MeshPhongMaterial({ color: 0x8B0000 }));
        top.position.set(side * 16, 16, 0);
        group.add(top);
    }
    // Battlements
    for (let x = -12; x <= 12; x += 3) {
        const battlement = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 3.5), stoneMat);
        battlement.position.set(x, 12, 0);
        group.add(battlement);
    }
    return group;
}

// ---- Sea Hazards ----
function createKraken(x, z) {
    const kraken = new THREE.Group();
    kraken.userData = { type: 'kraken', timer: 0, active: true, damage: 2, targetPlayer: -1 };

    // Body
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x2d5a27, specular: 0x44aa44, shininess: 40 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 12), bodyMat);
    body.position.y = -2;
    body.scale.y = 0.6;
    kraken.add(body);

    // Head/eyes
    const headMat = new THREE.MeshPhongMaterial({ color: 0x1a4a1a });
    const head = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 10), headMat);
    head.position.set(0, 1, 3);
    kraken.add(head);

    const eyeMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 });
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), eyeMat);
    eye1.position.set(-1.5, 2, 5);
    kraken.add(eye1);
    const eye2 = eye1.clone();
    eye2.position.x = 1.5;
    kraken.add(eye2);

    // Tentacles (8)
    const tentacleMat = new THREE.MeshPhongMaterial({ color: 0x2d7a27, specular: 0x338833 });
    for (let i = 0; i < 8; i++) {
        const tentacle = new THREE.Group();
        const angle = (i / 8) * Math.PI * 2;
        const segments = 6;
        for (let s = 0; s < segments; s++) {
            const seg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8 - s * 0.1, 0.7 - s * 0.1, 3, 8),
                tentacleMat
            );
            seg.position.y = s * 2.5;
            seg.rotation.z = Math.sin(s * 0.5) * 0.3;
            tentacle.add(seg);
        }
        tentacle.position.set(Math.cos(angle) * 4, -3, Math.sin(angle) * 4);
        tentacle.rotation.x = -0.5 + Math.cos(angle) * 0.5;
        tentacle.rotation.z = Math.sin(angle) * 0.5;
        tentacle.userData.baseAngle = angle;
        tentacle.userData.index = i;
        kraken.add(tentacle);
    }

    // Suction cups on visible tentacles (details)
    const suckerMat = new THREE.MeshPhongMaterial({ color: 0x55aa55 });

    kraken.position.set(x, -5, z);
    Game.scene.add(kraken);
    Game.hazards.push(kraken);
    return kraken;
}

function createLeviathan(x, z) {
    const leviathan = new THREE.Group();
    leviathan.userData = { type: 'leviathan', timer: 0, active: true, damage: 3, phase: 0, targetPlayer: -1 };

    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x1a3a5c, specular: 0x4488bb, shininess: 50 });

    // Serpentine body segments
    const segments = 12;
    for (let i = 0; i < segments; i++) {
        const radius = i === 0 ? 3 : (2.5 - i * 0.12);
        const seg = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 10), bodyMat);
        seg.scale.set(1, 0.7, 1.3);
        seg.position.set(i * 4, -3 + Math.sin(i * 0.5) * 3, 0);
        seg.castShadow = true;
        leviathan.add(seg);
    }

    // Head features
    const headGroup = new THREE.Group();
    // Jaw
    const jawMat = new THREE.MeshPhongMaterial({ color: 0x0d2a44 });
    const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 5), jawMat);
    upperJaw.position.set(-2, 1, 0);
    headGroup.add(upperJaw);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1, 4.5), jawMat);
    lowerJaw.position.set(-2, -1, 0);
    headGroup.add(lowerJaw);

    // Teeth
    const toothMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    for (let t = 0; t < 6; t++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 4), toothMat);
        tooth.position.set(-3.5, 0.2, -1.8 + t * 0.7);
        tooth.rotation.x = Math.PI;
        headGroup.add(tooth);
    }

    // Eyes
    const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0xffaa00, emissiveIntensity: 1.0 });
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), eyeMat);
    eye1.position.set(-1, 2, 2);
    headGroup.add(eye1);
    const eye2 = eye1.clone();
    eye2.position.z = -2;
    headGroup.add(eye2);

    // Dorsal fins
    const finMat = new THREE.MeshPhongMaterial({ color: 0x1a5a3c, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2 + Math.random(), 4), finMat);
        fin.position.set(i * 4, 0, 0);
        fin.rotation.z = 0.2;
        leviathan.add(fin);
    }

    headGroup.position.set(-3, 0, 0);
    leviathan.add(headGroup);

    leviathan.position.set(x, -6, z);
    leviathan.rotation.y = Math.random() * Math.PI * 2;
    Game.scene.add(leviathan);
    Game.hazards.push(leviathan);
    return leviathan;
}

function createWhirlpool(x, z) {
    const whirlpool = new THREE.Group();
    whirlpool.userData = { type: 'whirlpool', radius: 18, pullStrength: 15, damage: 1, active: true };

    // Concentric rings creating whirlpool effect
    const ringMat = new THREE.MeshPhongMaterial({
        color: 0x003355, transparent: true, opacity: 0.6, side: THREE.DoubleSide
    });
    for (let i = 0; i < 6; i++) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(3 + i * 2.5, 0.8 - i * 0.1, 8, 32),
            ringMat.clone()
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -1 - i * 0.5;
        ring.material.opacity = 0.5 - i * 0.06;
        ring.userData.ringIndex = i;
        whirlpool.add(ring);
    }

    // Foam particles around edge
    const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
    for (let i = 0; i < 20; i++) {
        const foam = new THREE.Mesh(new THREE.SphereGeometry(0.3, 4, 4), foamMat);
        const angle = (i / 20) * Math.PI * 2;
        foam.position.set(Math.cos(angle) * 16, 0.2, Math.sin(angle) * 16);
        foam.userData.angle = angle;
        whirlpool.add(foam);
    }

    // Dark center
    const centerMat = new THREE.MeshBasicMaterial({ color: 0x001122, transparent: true, opacity: 0.8 });
    const center = new THREE.Mesh(new THREE.CircleGeometry(3, 16), centerMat);
    center.rotation.x = -Math.PI / 2;
    center.position.y = -4;
    whirlpool.add(center);

    whirlpool.position.set(x, 0, z);
    Game.scene.add(whirlpool);
    Game.hazards.push(whirlpool);
    return whirlpool;
}

// ---- Projectiles ----
function fireCannonball(playerIdx) {
    const player = Game.players[playerIdx];
    if (player.cooldowns.cannon > 0) return;
    player.cooldowns.cannon = CANNON_COOLDOWN;

    const ship = player.ship;
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(ship.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.quaternion);

    // Fire from both sides
    for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i++) {
            const ball = new THREE.Mesh(
                new THREE.SphereGeometry(0.4, 8, 8),
                new THREE.MeshPhongMaterial({ color: 0x222222 })
            );
            const offset = right.clone().multiplyScalar(side * 4);
            const fwd = dir.clone().multiplyScalar(-2 + i * 3);
            ball.position.copy(ship.position).add(offset).add(fwd);
            ball.position.y = 4;

            ball.userData = {
                velocity: right.clone().multiplyScalar(side * 50),
                owner: playerIdx,
                damage: CANNON_DAMAGE,
                type: 'cannonball',
                life: 3
            };
            // Add slight arc
            ball.userData.velocity.y = 8;

            Game.scene.add(ball);
            Game.projectiles.push(ball);

            // Muzzle flash
            createMuzzleFlash(ball.position.clone());
        }
    }

    showWeaponStatus(playerIdx, 'CANNONS FIRED!');
}

function fireFlintlock(playerIdx) {
    const player = Game.players[playerIdx];
    if (player.cooldowns.flintlock > 0) return;

    const otherIdx = 1 - playerIdx;
    const other = Game.players[otherIdx];
    const dist = player.ship.position.distanceTo(other.ship.position);

    if (dist > FLINTLOCK_RANGE) {
        showWeaponStatus(playerIdx, 'Too far for flintlock!');
        return;
    }

    player.cooldowns.flintlock = FLINTLOCK_COOLDOWN;

    // Create bullet trail
    const start = player.ship.position.clone();
    start.y = 5;
    const end = other.ship.position.clone();
    end.y = 5;

    const trailGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const trailMat = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 1 });
    const trail = new THREE.Line(trailGeo, trailMat);
    trail.userData = { life: 0.3, type: 'trail' };
    Game.scene.add(trail);
    Game.projectiles.push(trail);

    // Hit
    const accuracy = Math.random();
    if (accuracy > 0.3) {
        other.health = Math.max(0, other.health - FLINTLOCK_DAMAGE);
        createHitEffect(end, 0xffcc00);
        showWeaponStatus(playerIdx, 'Flintlock hit!');
    } else {
        showWeaponStatus(playerIdx, 'Flintlock missed!');
    }
    createMuzzleFlash(start);
}

function swordAttack(playerIdx) {
    const player = Game.players[playerIdx];
    if (player.cooldowns.sword > 0) return;

    const otherIdx = 1 - playerIdx;
    const other = Game.players[otherIdx];
    const dist = player.ship.position.distanceTo(other.ship.position);

    if (dist > BOARD_RANGE) {
        showWeaponStatus(playerIdx, 'Too far for swords!');
        return;
    }

    player.cooldowns.sword = SWORD_COOLDOWN;

    // Sword swing effect
    const swingPos = player.ship.position.clone();
    swingPos.y = 5;
    createSwordSwing(swingPos, player.color);

    const hit = Math.random() > 0.2;
    if (hit) {
        other.health = Math.max(0, other.health - SWORD_DAMAGE);
        createHitEffect(other.ship.position.clone().setY(5), 0xff4444);
        showWeaponStatus(playerIdx, 'Sword strike!');
    } else {
        showWeaponStatus(playerIdx, 'Sword parried!');
    }
}

function fireMusket(playerIdx) {
    const player = Game.players[playerIdx];
    if (player.cooldowns.musket > 0) return;

    const otherIdx = 1 - playerIdx;
    const other = Game.players[otherIdx];
    const dist = player.ship.position.distanceTo(other.ship.position);

    if (dist > MUSKET_RANGE) {
        showWeaponStatus(playerIdx, 'Too far for musket!');
        return;
    }

    player.cooldowns.musket = MUSKET_COOLDOWN;

    const start = player.ship.position.clone();
    start.y = 6;
    const end = other.ship.position.clone();
    end.y = 5;

    // Smoke trail
    const trailGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const trailMat = new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.8 });
    const trail = new THREE.Line(trailGeo, trailMat);
    trail.userData = { life: 0.5, type: 'trail' };
    Game.scene.add(trail);
    Game.projectiles.push(trail);

    createMuzzleFlash(start);

    const accuracy = Math.random();
    if (accuracy > 0.25) {
        other.health = Math.max(0, other.health - MUSKET_DAMAGE);
        createHitEffect(end, 0xff8800);
        showWeaponStatus(playerIdx, 'Musket hit! Heavy damage!');
    } else {
        showWeaponStatus(playerIdx, 'Musket missed!');
    }
}

function boardEnemy(playerIdx) {
    const player = Game.players[playerIdx];
    if (player.cooldowns.board > 0) return;

    const otherIdx = 1 - playerIdx;
    const other = Game.players[otherIdx];
    const dist = player.ship.position.distanceTo(other.ship.position);

    if (dist > BOARD_RANGE) {
        showWeaponStatus(playerIdx, 'Get closer to board!');
        return;
    }

    player.cooldowns.board = 2.0;
    Game.boardingActive[playerIdx] = true;

    showCenterMessage('BOARDING ACTION!', 1.5);

    // Boarding deals crew damage and gives temporary raid bonus
    other.health = Math.max(0, other.health - 15);
    player.cooldowns.raid = 0; // Reset raid cooldown on successful board

    setTimeout(() => { Game.boardingActive[playerIdx] = false; }, 3000);
    showWeaponStatus(playerIdx, 'Boarding! Raid now!');
}

function raidEnemy(playerIdx) {
    const player = Game.players[playerIdx];
    if (player.cooldowns.raid > 0) return;

    const otherIdx = 1 - playerIdx;
    const other = Game.players[otherIdx];
    const dist = player.ship.position.distanceTo(other.ship.position);

    if (dist > RAID_RANGE) {
        showWeaponStatus(playerIdx, 'Too far to raid!');
        return;
    }

    player.cooldowns.raid = 3.0;
    const stolen = Math.min(RAID_COINS, other.coins + 5); // Can raid even if they have 0
    player.coins += stolen;
    other.coins = Math.max(0, other.coins - stolen);
    player.raidCount++;

    createCoinEffect(player.ship.position.clone());
    showWeaponStatus(playerIdx, `Raided ${stolen} doubloons!`);
    showCenterMessage(`${player.name} raids for ${stolen} coins!`, 1.5);
}

// ---- Visual Effects ----
function createMuzzleFlash(pos) {
    const flash = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9 })
    );
    flash.position.copy(pos);
    flash.userData = { life: 0.15, type: 'effect' };
    Game.scene.add(flash);
    Game.particles.push(flash);

    // Smoke
    for (let i = 0; i < 5; i++) {
        const smoke = new THREE.Mesh(
            new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 })
        );
        smoke.position.copy(pos).add(new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2,
            (Math.random() - 0.5) * 2
        ));
        smoke.userData = { life: 1.0, type: 'smoke', vy: 2 + Math.random() * 2 };
        Game.scene.add(smoke);
        Game.particles.push(smoke);
    }
}

function createHitEffect(pos, color) {
    for (let i = 0; i < 10; i++) {
        const spark = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 4, 4),
            new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 })
        );
        spark.position.copy(pos);
        spark.userData = {
            life: 0.5 + Math.random() * 0.5,
            type: 'spark',
            vx: (Math.random() - 0.5) * 15,
            vy: Math.random() * 10,
            vz: (Math.random() - 0.5) * 15
        };
        Game.scene.add(spark);
        Game.particles.push(spark);
    }

    // Wood splinters
    const splinterMat = new THREE.MeshBasicMaterial({ color: 0x8B6914 });
    for (let i = 0; i < 6; i++) {
        const splinter = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), splinterMat);
        splinter.position.copy(pos);
        splinter.userData = {
            life: 1.0,
            type: 'spark',
            vx: (Math.random() - 0.5) * 10,
            vy: 5 + Math.random() * 8,
            vz: (Math.random() - 0.5) * 10
        };
        Game.scene.add(splinter);
        Game.particles.push(splinter);
    }
}

function createSwordSwing(pos, color) {
    const arc = new THREE.Mesh(
        new THREE.TorusGeometry(2, 0.1, 4, 16, Math.PI),
        new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.8 })
    );
    arc.position.copy(pos);
    arc.userData = { life: 0.3, type: 'effect' };
    Game.scene.add(arc);
    Game.particles.push(arc);
}

function createCoinEffect(pos) {
    const coinMat = new THREE.MeshPhongMaterial({ color: 0xffcc00, emissive: 0xaa8800, emissiveIntensity: 0.5 });
    for (let i = 0; i < 8; i++) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 8), coinMat);
        coin.position.copy(pos);
        coin.position.y = 5;
        coin.userData = {
            life: 1.5,
            type: 'spark',
            vx: (Math.random() - 0.5) * 8,
            vy: 5 + Math.random() * 5,
            vz: (Math.random() - 0.5) * 8
        };
        Game.scene.add(coin);
        Game.particles.push(coin);
    }
}

function createSplash(pos) {
    const splashMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 });
    for (let i = 0; i < 8; i++) {
        const drop = new THREE.Mesh(new THREE.SphereGeometry(0.3, 4, 4), splashMat);
        drop.position.copy(pos);
        drop.userData = {
            life: 0.8,
            type: 'spark',
            vx: (Math.random() - 0.5) * 6,
            vy: 3 + Math.random() * 5,
            vz: (Math.random() - 0.5) * 6
        };
        Game.scene.add(drop);
        Game.particles.push(drop);
    }
}

// ---- Spawn Hazards ----
function spawnHazards() {
    // Clear existing hazards
    Game.hazards.forEach(h => Game.scene.remove(h));
    Game.hazards = [];

    if (Game.currentMap === 'open_sea') {
        createKraken(30, 50);
        createLeviathan(-40, -50);
        createWhirlpool(0, -30);
        createWhirlpool(50, 30);
    } else {
        createKraken(0, 40);
        createWhirlpool(-40, 20);
        createWhirlpool(40, 20);
        createLeviathan(0, 70);
    }
}

// ---- Game Logic ----
function updatePlayer(playerIdx, dt) {
    const player = Game.players[playerIdx];
    const ship = player.ship;
    const controls = player.controls;

    // Update cooldowns
    for (const key in player.cooldowns) {
        player.cooldowns[key] = Math.max(0, player.cooldowns[key] - dt);
    }

    // Movement
    if (Game.keys[controls.forward]) {
        player.speed = Math.min(player.speed + SHIP_SPEED * dt, SHIP_SPEED);
    } else if (Game.keys[controls.back]) {
        player.speed = Math.max(player.speed - SHIP_SPEED * dt * 0.5, -SHIP_SPEED * 0.3);
    } else {
        player.speed *= 0.98; // Drift
    }

    if (Game.keys[controls.left]) {
        ship.rotation.y += TURN_SPEED * dt;
    }
    if (Game.keys[controls.right]) {
        ship.rotation.y -= TURN_SPEED * dt;
    }

    // Apply movement
    const forward = new THREE.Vector3(Math.sin(ship.rotation.y), 0, Math.cos(ship.rotation.y));
    ship.position.add(forward.multiplyScalar(player.speed * dt));

    // Boundary clamping
    ship.position.x = Math.max(-WORLD_SIZE, Math.min(WORLD_SIZE, ship.position.x));
    ship.position.z = Math.max(-WORLD_SIZE, Math.min(WORLD_SIZE, ship.position.z));

    // Ship bob
    ship.position.y = 2 + Math.sin(Game.waveTime * 1.5 + playerIdx * 3) * 0.5;
    ship.rotation.x = Math.sin(Game.waveTime * 1.2 + playerIdx) * 0.03;
    ship.rotation.z = Math.sin(Game.waveTime * 0.8 + playerIdx * 2) * 0.02;

    // Animate flag
    if (ship.userData.flag) {
        ship.userData.flag.rotation.y = Math.sin(Game.waveTime * 3) * 0.3;
    }

    // Wake effect behind ship
    if (Math.abs(player.speed) > 2 && Math.random() > 0.5) {
        const wakePos = ship.position.clone();
        const back = new THREE.Vector3(-Math.sin(ship.rotation.y), 0, -Math.cos(ship.rotation.y));
        wakePos.add(back.multiplyScalar(8));
        wakePos.y = 0.5;
        createWakeParticle(wakePos);
    }

    // Weapons
    if (Game.keys[controls.cannon]) fireCannonball(playerIdx);
    if (Game.keys[controls.flintlock]) fireFlintlock(playerIdx);
    if (Game.keys[controls.sword]) swordAttack(playerIdx);
    if (Game.keys[controls.musket]) fireMusket(playerIdx);
    if (Game.keys[controls.board]) boardEnemy(playerIdx);
    if (Game.keys[controls.raid]) raidEnemy(playerIdx);

    // Passive coin generation (1 coin per 5 seconds)
    if (!player._coinTimer) player._coinTimer = 0;
    player._coinTimer += dt;
    if (player._coinTimer >= 5) {
        player.coins += 1;
        player._coinTimer = 0;
    }

    // Check death
    if (player.hull <= 0 || player.health <= 0) {
        Game.winner = 1 - playerIdx;
        endGame();
    }
}

function createWakeParticle(pos) {
    const wake = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
    );
    wake.rotation.x = -Math.PI / 2;
    wake.position.copy(pos);
    wake.userData = { life: 1.5, type: 'wake', scale: 1 };
    Game.scene.add(wake);
    Game.particles.push(wake);
}

function updateProjectiles(dt) {
    for (let i = Game.projectiles.length - 1; i >= 0; i--) {
        const proj = Game.projectiles[i];
        proj.userData.life -= dt;

        if (proj.userData.life <= 0) {
            Game.scene.remove(proj);
            Game.projectiles.splice(i, 1);
            continue;
        }

        if (proj.userData.type === 'trail') {
            proj.material.opacity -= dt * 2;
            continue;
        }

        if (proj.userData.type === 'cannonball') {
            const vel = proj.userData.velocity;
            proj.position.x += vel.x * dt;
            proj.position.y += vel.y * dt;
            proj.position.z += vel.z * dt;
            vel.y -= 20 * dt; // Gravity

            // Hit water
            if (proj.position.y < 0) {
                createSplash(proj.position.clone().setY(0.5));
                Game.scene.remove(proj);
                Game.projectiles.splice(i, 1);
                continue;
            }

            // Hit enemy ship
            const targetIdx = 1 - proj.userData.owner;
            const target = Game.players[targetIdx];
            if (proj.position.distanceTo(target.ship.position) < 8) {
                target.hull = Math.max(0, target.hull - proj.userData.damage);
                createHitEffect(proj.position.clone(), 0xff6600);
                showCenterMessage('Direct hit!', 0.8);
                Game.scene.remove(proj);
                Game.projectiles.splice(i, 1);
            }
        }
    }
}

function updateParticles(dt) {
    for (let i = Game.particles.length - 1; i >= 0; i--) {
        const p = Game.particles[i];
        p.userData.life -= dt;

        if (p.userData.life <= 0) {
            Game.scene.remove(p);
            Game.particles.splice(i, 1);
            continue;
        }

        if (p.userData.type === 'spark') {
            p.position.x += (p.userData.vx || 0) * dt;
            p.position.y += (p.userData.vy || 0) * dt;
            p.position.z += (p.userData.vz || 0) * dt;
            p.userData.vy = (p.userData.vy || 0) - 15 * dt;
            if (p.material.opacity !== undefined) {
                p.material.opacity = Math.max(0, p.userData.life);
            }
        } else if (p.userData.type === 'smoke') {
            p.position.y += (p.userData.vy || 1) * dt;
            p.scale.multiplyScalar(1 + dt);
            p.material.opacity = Math.max(0, p.userData.life * 0.5);
        } else if (p.userData.type === 'wake') {
            p.userData.scale += dt * 2;
            p.scale.set(p.userData.scale, p.userData.scale, 1);
            p.material.opacity = Math.max(0, p.userData.life * 0.3);
        } else if (p.userData.type === 'effect') {
            p.material.opacity = Math.max(0, p.userData.life * 3);
            p.scale.multiplyScalar(1 + dt * 5);
        }
    }
}

function updateHazards(dt) {
    Game.hazardTimer += dt;

    Game.hazards.forEach(hazard => {
        const data = hazard.userData;
        if (!data.active) return;

        if (data.type === 'kraken') {
            // Animate tentacles
            hazard.children.forEach(child => {
                if (child.userData.baseAngle !== undefined) {
                    const t = Game.waveTime * 2 + child.userData.index;
                    child.rotation.x = -0.5 + Math.sin(t) * 0.4;
                    child.rotation.z = Math.cos(t * 0.7) * 0.3;
                }
            });

            // Rise up periodically
            data.timer += dt;
            const risePhase = Math.sin(data.timer * 0.5);
            hazard.position.y = -5 + risePhase * 4;

            // Attack nearby ships
            Game.players.forEach((player, idx) => {
                const dist = new THREE.Vector2(
                    player.ship.position.x - hazard.position.x,
                    player.ship.position.z - hazard.position.z
                ).length();
                if (dist < 20 && risePhase > 0.5) {
                    player.hull = Math.max(0, player.hull - data.damage * dt);
                    player.ship.position.y += Math.sin(Game.waveTime * 5) * 0.3;
                }
            });
        }

        if (data.type === 'leviathan') {
            data.timer += dt;
            // Serpentine movement
            hazard.rotation.y += dt * 0.3;
            const moveDir = new THREE.Vector3(
                Math.sin(data.timer * 0.3), 0, Math.cos(data.timer * 0.3)
            );
            hazard.position.add(moveDir.multiplyScalar(dt * 5));

            // Animate body segments
            hazard.children.forEach((seg, idx) => {
                if (seg.type === 'Mesh' && idx < 12) {
                    seg.position.y = -3 + Math.sin(data.timer * 2 + idx * 0.5) * 3;
                }
            });

            // Surface periodically
            const surfacePhase = Math.sin(data.timer * 0.4);
            hazard.position.y = -6 + surfacePhase * 5;

            // Damage nearby ships
            Game.players.forEach((player, idx) => {
                const dist = new THREE.Vector2(
                    player.ship.position.x - hazard.position.x,
                    player.ship.position.z - hazard.position.z
                ).length();
                if (dist < 15 && surfacePhase > 0.3) {
                    player.hull = Math.max(0, player.hull - data.damage * dt);
                    createSplash(player.ship.position.clone());
                }
            });

            // Keep in bounds
            if (hazard.position.x > WORLD_SIZE) hazard.position.x = -WORLD_SIZE;
            if (hazard.position.x < -WORLD_SIZE) hazard.position.x = WORLD_SIZE;
            if (hazard.position.z > WORLD_SIZE) hazard.position.z = -WORLD_SIZE;
            if (hazard.position.z < -WORLD_SIZE) hazard.position.z = WORLD_SIZE;
        }

        if (data.type === 'whirlpool') {
            // Rotate rings
            hazard.children.forEach(child => {
                if (child.userData.ringIndex !== undefined) {
                    child.rotation.z += dt * (2 + child.userData.ringIndex * 0.5);
                }
                if (child.userData.angle !== undefined) {
                    child.userData.angle += dt * 1.5;
                    const r = 16;
                    child.position.x = Math.cos(child.userData.angle) * r;
                    child.position.z = Math.sin(child.userData.angle) * r;
                }
            });

            // Pull and damage ships
            Game.players.forEach((player, idx) => {
                const dx = hazard.position.x - player.ship.position.x;
                const dz = hazard.position.z - player.ship.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < data.radius) {
                    const pullForce = (1 - dist / data.radius) * data.pullStrength * dt;
                    player.ship.position.x += (dx / dist) * pullForce;
                    player.ship.position.z += (dz / dist) * pullForce;
                    player.ship.rotation.y += dt * 0.5;

                    if (dist < 5) {
                        player.hull = Math.max(0, player.hull - data.damage * dt * 5);
                    }
                }
            });
        }
    });
}

// ---- Camera ----
function updateCamera() {
    const p1 = Game.players[0].ship.position;
    const p2 = Game.players[1].ship.position;

    const center = p1.clone().add(p2).multiplyScalar(0.5);
    const dist = p1.distanceTo(p2);
    const height = Math.max(50, dist * 0.6 + 30);
    const back = Math.max(30, dist * 0.3 + 20);

    const targetPos = new THREE.Vector3(center.x, height, center.z + back);

    Game.camera.position.lerp(targetPos, 0.03);
    Game.camera.lookAt(center);
}

// ---- HUD ----
function updateHUD() {
    const p1 = Game.players[0];
    const p2 = Game.players[1];

    document.getElementById('p1-hull').style.width = (p1.hull / MAX_HULL * 100) + '%';
    document.getElementById('p1-health').style.width = (p1.health / MAX_HEALTH * 100) + '%';
    document.getElementById('p1-coins').textContent = `Doubloons: ${p1.coins}`;

    document.getElementById('p2-hull').style.width = (p2.hull / MAX_HULL * 100) + '%';
    document.getElementById('p2-health').style.width = (p2.health / MAX_HEALTH * 100) + '%';
    document.getElementById('p2-coins').textContent = `Doubloons: ${p2.coins}`;

    // Weapon status
    const getWeaponText = (p) => {
        const weapons = [];
        if (p.cooldowns.cannon <= 0) weapons.push('Cannons');
        if (p.cooldowns.flintlock <= 0) weapons.push('Flintlock');
        if (p.cooldowns.sword <= 0) weapons.push('Sword');
        if (p.cooldowns.musket <= 0) weapons.push('Musket');
        return weapons.length > 0 ? 'Ready: ' + weapons.join(', ') : 'Reloading...';
    };

    document.getElementById('p1-weapon').textContent = getWeaponText(p1);
    document.getElementById('p2-weapon').textContent = getWeaponText(p2);
}

function showWeaponStatus(playerIdx, text) {
    document.getElementById(`p${playerIdx + 1}-weapon`).textContent = text;
}

function showCenterMessage(text, duration) {
    const el = document.getElementById('center-message');
    el.textContent = text;
    el.style.display = 'block';
    el.style.opacity = '1';
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => { el.style.display = 'none'; }, 300);
    }, duration * 1000);
}

// ---- Game Flow ----
Game.startGame = function(mapType) {
    Game.currentMap = mapType;
    document.getElementById('menu-screen').classList.remove('active');

    // Reset players
    Game.players.forEach((p, i) => {
        p.hull = MAX_HULL;
        p.health = MAX_HEALTH;
        p.coins = 0;
        p.speed = 0;
        p.kills = 0;
        p.raidCount = 0;
        p._coinTimer = 0;
        for (const key in p.cooldowns) p.cooldowns[key] = 0;
    });

    Game.players[0].ship.position.set(-60, 2, 0);
    Game.players[0].ship.rotation.y = Math.PI / 2;
    Game.players[1].ship.position.set(60, 2, 0);
    Game.players[1].ship.rotation.y = -Math.PI / 2;

    // Clear projectiles/particles
    Game.projectiles.forEach(p => Game.scene.remove(p));
    Game.projectiles = [];
    Game.particles.forEach(p => Game.scene.remove(p));
    Game.particles = [];

    setupMap(mapType);
    spawnHazards();

    Game.gameActive = true;
    Game.winner = null;

    showCenterMessage(mapType === 'port' ? 'PORT BATTLE!' : 'OPEN SEA BATTLE!', 2);
};

function endGame() {
    Game.gameActive = false;
    const winner = Game.players[Game.winner];
    const loser = Game.players[1 - Game.winner];

    document.getElementById('winner-text').textContent = 'VICTORY!';
    document.getElementById('winner-name').textContent = winner.name + ' Wins!';
    document.getElementById('game-stats').innerHTML = `
        ${winner.name}: ${winner.coins} doubloons | Hull: ${Math.round(winner.hull)}%<br>
        ${loser.name}: ${loser.coins} doubloons | Hull: ${Math.round(loser.hull)}%<br><br>
        Raids: ${winner.raidCount} vs ${loser.raidCount}
    `;
    document.getElementById('game-over').classList.add('active');
}

Game.returnToMenu = function() {
    document.getElementById('game-over').classList.remove('active');
    document.getElementById('menu-screen').classList.add('active');
};

// ---- Resize ----
function onResize() {
    Game.camera.aspect = window.innerWidth / window.innerHeight;
    Game.camera.updateProjectionMatrix();
    Game.renderer.setSize(window.innerWidth, window.innerHeight);
}

// ---- Main Loop ----
function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(Game.clock.getDelta(), 0.05);

    animateWater(dt);

    if (Game.gameActive) {
        updatePlayer(0, dt);
        updatePlayer(1, dt);
        updateProjectiles(dt);
        updateParticles(dt);
        updateHazards(dt);
        updateCamera();
        updateHUD();
    } else {
        // Idle animation even on menu
        Game.waveTime += dt;
    }

    Game.renderer.render(Game.scene, Game.camera);
}

// ---- Start ----
window.addEventListener('load', init);
