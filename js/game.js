// ═══════════════════════════════════════════════════════════════════════════
//  GAME ENGINE & LOGIC
// ═══════════════════════════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────────────────────────
let mapData = null;
let mapLayers = [];
let camX = 0, camY = 0;

// Player (Soldier) state
let soldierX = 0, soldierY = 0;
let facingRight = true;
let isMoving = false;
let isAttacking = false;
let isHit = false;
let isDead = false;
let soldierDead = false;
let frame = 0;
let tick = 0;
let soldierHP = SOLDIER_MAX_HP;
let animatedSoldierHP = SOLDIER_MAX_HP;
let hitCooldown = 0;
let damageFlashTimer = 0;
let soldierAttackHit = false;

// Skeleton state (Array of 5 skeletons)
let skeletons = [];
// Each skeleton: { id, x, y, hp, state, frame, tick, facingRight, attackHit, dead, disappearTimer, respawnTimer, patrolTimer, patrolDirX, patrolDirY, isPatrolling }

// UI & Menu state
let isPaused = false;
let showControlGuide = false;
let toastMessage = "";
let toastTimer = 0;

// Saved Game Checkpoint State (for Load function)
let savedState = null;

// Environment & Effects state
let torchFrame = 0;
let torchTick = 0;
let debugMapMode = false;
let damageTexts = []; // [{x, y, text, life, maxLife}]

// Loot & Items state
let goldCount = 0;
let lootDrops = [];    // [{type: 'coin'|'potion', x, y, frame, tick}]
let lootAnimTick = 0;  // Global tick for loot animation

// Chest state
let chest = null;      // {x, y, state: 'locked'|'closed'|'opening'|'open', frame, tick}

// Player Stats & Leveling
let playerLevel = 1;
let playerXP = 0;
let xpToNextLevel = BASE_XP_TO_LEVEL;
let animatedXPRatio = 0;               // Smooth animated XP bar fill
let currentMaxHP = SOLDIER_MAX_HP;     // Dynamic max HP (increases per level)
let currentDamage = SOLDIER_DAMAGE;    // Dynamic damage (increases per level)
let levelUpEffect = 0;                 // Timer for level-up visual glow
let skelRespawnTimer = 0;              // Countdown to skeleton respawn


const keys = {};

// ── Canvas Setup ───────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = LOGICAL_WIDTH;
canvas.height = LOGICAL_HEIGHT;
ctx.imageSmoothingEnabled = false;

function toggleControlGuideUI(show) {
    showControlGuide = show;
    const hudEl = document.getElementById('hud');
    if (hudEl) {
        if (showControlGuide) {
            hudEl.classList.add('visible');
        } else {
            hudEl.classList.remove('visible');
        }
    }
}

// ── Input Listeners ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
    }

    if (k === ' ' && !isAttacking && !isHit && !isDead && !soldierDead && !debugMapMode && !isPaused && !showControlGuide) {
        startAttack();
    }
    if (k === 'm' && !isPaused && !showControlGuide) {
        debugMapMode = !debugMapMode;
    }
    if (k === 'r') {
        restartGame();
    }
    if (k === 'p' || k === 'escape') {
        if (showControlGuide) {
            toggleControlGuideUI(false);
        } else {
            isPaused = !isPaused;
        }
    }
});

document.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
});

// Helper to convert browser mouse click coordinates to logical 960x540 canvas resolution
// Correctly accounts for CSS object-fit: contain letterboxing
function getCanvasMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const targetAspect = LOGICAL_WIDTH / LOGICAL_HEIGHT;
    const currentAspect = rect.width / rect.height;

    let renderW = rect.width;
    let renderH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (currentAspect > targetAspect) {
        renderW = rect.height * targetAspect;
        offsetX = (rect.width - renderW) / 2;
    } else {
        renderH = rect.width / targetAspect;
        offsetY = (rect.height - renderH) / 2;
    }

    const mouseX = e.clientX - rect.left - offsetX;
    const mouseY = e.clientY - rect.top - offsetY;

    return {
        x: (mouseX / renderW) * LOGICAL_WIDTH,
        y: (mouseY / renderH) * LOGICAL_HEIGHT
    };
}

canvas.addEventListener('mousedown', e => {
    const pos = getCanvasMousePos(e);

    // 1) HUD Buttons (Pause & Help Question Mark)
    const pauseBtnX = LOGICAL_WIDTH - 52, pauseBtnY = 8, btnSize = 44;
    const helpBtnX = LOGICAL_WIDTH - 104, helpBtnY = 8;

    // Check Pause Button click
    if (pos.x >= pauseBtnX && pos.x <= pauseBtnX + btnSize && pos.y >= pauseBtnY && pos.y <= pauseBtnY + btnSize) {
        isPaused = !isPaused;
        toggleControlGuideUI(false);
        return;
    }

    // Check Question Mark (?) Help Button click
    if (pos.x >= helpBtnX && pos.x <= helpBtnX + btnSize && pos.y >= helpBtnY && pos.y <= helpBtnY + btnSize) {
        toggleControlGuideUI(!showControlGuide);
        return;
    }

    // 2) If Control Guide Modal is open
    if (showControlGuide) {
        const guideW = 540, guideH = 340;
        const guideX = (LOGICAL_WIDTH - guideW) / 2;
        const guideY = (LOGICAL_HEIGHT - guideH) / 2;
        const closeX = guideX + guideW - 40, closeY = guideY + 15, closeSize = 26;

        if ((pos.x >= closeX && pos.x <= closeX + closeSize && pos.y >= closeY && pos.y <= closeY + closeSize) ||
            pos.x < guideX || pos.x > guideX + guideW || pos.y < guideY || pos.y > guideY + guideH) {
            toggleControlGuideUI(false);
        }
        return;
    }

    // 3) If Pause Menu is active (PLAY / LOAD / EXIT)
    if (isPaused) {
        const boardW = MENU_BOARD_SW * 3.0; // 213
        const boardH = MENU_BOARD_SH * 3.0; // 336
        const boardX = (LOGICAL_WIDTH - boardW) / 2;
        const boardY = (LOGICAL_HEIGHT - boardH) / 2;

        const btnW = 120, btnH = 40;
        const btnX = boardX + (boardW - btnW) / 2;

        const playY = boardY + 104;
        const loadY = boardY + 168;
        const exitY = boardY + 232;

        // PLAY button clicked
        if (pos.x >= btnX && pos.x <= btnX + btnW && pos.y >= playY && pos.y <= playY + btnH) {
            isPaused = false;
            return;
        }

        // LOAD button clicked
        if (pos.x >= btnX && pos.x <= btnX + btnW && pos.y >= loadY && pos.y <= loadY + btnH) {
            loadGameProgress();
            return;
        }

        // EXIT button clicked
        if (pos.x >= btnX && pos.x <= btnX + btnW && pos.y >= exitY && pos.y <= exitY + btnH) {
            exitGameToTitle();
            return;
        }
        return;
    }

    // 4) In-game Attack click
    if (!isAttacking && !isHit && !isDead && !soldierDead && !debugMapMode) {
        startAttack();
    }
});

function startAttack() {
    isAttacking = true;
    soldierAttackHit = false;
    frame = 0;
    tick = 0;
}

function saveGameProgress() {
    savedState = {
        soldierX,
        soldierY,
        soldierHP,
        skeletons: JSON.parse(JSON.stringify(skeletons))
    };
}

function loadGameProgress() {
    if (savedState) {
        soldierX = savedState.soldierX;
        soldierY = savedState.soldierY;
        soldierHP = savedState.soldierHP;
        if (savedState.skeletons) {
            skeletons = JSON.parse(JSON.stringify(savedState.skeletons));
        }
    } else {
        // Fallback load: restore full soldier health & reset status
        soldierHP = currentMaxHP;
        hitCooldown = 0;
    }

    isHit = false;
    isDead = false;
    soldierDead = false;
    isAttacking = false;
    isMoving = false;
    isPaused = false;
    damageTexts = [];

    toastMessage = "✓ Game Progress Loaded!";
    toastTimer = 120;
}

function exitGameToTitle() {
    restartGame();
    isPaused = false;
    toggleControlGuideUI(false);
    toastMessage = "Game Reset to Start";
    toastTimer = 120;
}

function restartGame() {
    // Reset leveling
    playerLevel = 1;
    playerXP = 0;
    xpToNextLevel = BASE_XP_TO_LEVEL;
    animatedXPRatio = 0;
    currentMaxHP = SOLDIER_MAX_HP;
    currentDamage = SOLDIER_DAMAGE;
    levelUpEffect = 0;
    skelRespawnTimer = 0;

    soldierHP = currentMaxHP;
    animatedSoldierHP = currentMaxHP;
    isHit = false;
    isDead = false;
    soldierDead = false;
    isAttacking = false;
    isMoving = false;
    hitCooldown = 0;
    damageFlashTimer = 0;
    frame = 0;
    tick = 0;
    damageTexts = [];
    goldCount = 0;
    lootDrops = [];
    lootAnimTick = 0;
    chest = null;
    skelDisappearTimer = 0;
    spawnSoldier();
    spawnSkeletons(5);
    spawnChest();
    saveGameProgress(); // Set initial checkpoint
}

// ── Map Loading ────────────────────────────────────────────────────────────
function loadMap() {
    function initGameWithData(data) {
        mapData = data;
        const W = mapData.mapWidth || mapData.width;
        const H = mapData.mapHeight || mapData.height;

        mapLayers = [];
        if (mapData.layers) {
            let sortedLayers = [...mapData.layers].sort((a, b) => {
                const aLen = a.tiles ? a.tiles.length : 0;
                const bLen = b.tiles ? b.tiles.length : 0;
                return bLen - aLen;
            });

            for (let layer of sortedLayers) {
                let grid = Array(H).fill(null).map(() => Array(W).fill(null));
                if (layer.tiles) {
                    for (let t of layer.tiles) {
                        grid[t.y][t.x] = parseInt(t.id, 10);
                    }
                }
                mapLayers.push(grid);
            }
        }

        spawnSoldier();
        spawnSkeletons(5);
        spawnChest();
        saveGameProgress(); // Save initial spawn as load checkpoint
        document.getElementById('loading').style.display = 'none';
        requestAnimationFrame(loop);
    }

    fetch('map.json')
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(data => initGameWithData(data))
        .catch(err => {
            console.warn('Fetch map.json failed, loading built-in map data:', err);
            initGameWithData(mapData || {});
        });
}

// ── Spawning ───────────────────────────────────────────────────────────────
function spawnSoldier() {
    soldierHP = currentMaxHP;
    animatedSoldierHP = currentMaxHP;
    const W = mapData.mapWidth || mapData.width || 18;
    const H = mapData.mapHeight || mapData.height || 11;
    const midX = Math.floor(W / 2);
    const midY = Math.floor(H / 2);

    if (isWalkable(midX * TS, midY * TS)) {
        soldierX = midX * TS - SOLDIER_DRAW / 2 + TS / 2;
        soldierY = midY * TS - SOLDIER_DRAW * 0.72 + TS / 2;
        snapCamera();
        return;
    }

    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            if (isWalkable(x * TS, y * TS)) {
                soldierX = x * TS - SOLDIER_DRAW / 2 + TS / 2;
                soldierY = y * TS - SOLDIER_DRAW * 0.72 + TS / 2;
                snapCamera();
                return;
            }
        }
    }
}

function spawnSkeletons(count = 5) {
    skeletons = [];
    const W = mapData.mapWidth || mapData.width || 18;
    const H = mapData.mapHeight || mapData.height || 11;

    // Collect all valid walkable floor positions far from soldier
    const validPositions = [];
    for (let y = 2; y < H - 2; y++) {
        for (let x = 2; x < W - 2; x++) {
            const testX = x * TS - SKEL_DRAW / 2 + TS / 2;
            const testY = y * TS - SKEL_DRAW * 0.72 + TS / 2;
            const testFX = testX + SKEL_DRAW / 2;
            const testFY = testY + SKEL_DRAW * 0.72;

            if (isWalkableForSkeleton(testFX, testFY)) {
                const dist = Math.hypot(testX - soldierX, testY - soldierY);
                if (dist > TS * 3.5) { // Far from soldier
                    validPositions.push({ x: testX, y: testY });
                }
            }
        }
    }

    // Shuffle valid positions for random directions
    for (let i = validPositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
    }

    // Spawn requested count of skeletons
    const spawnCount = Math.min(count, validPositions.length);
    for (let i = 0; i < spawnCount; i++) {
        skeletons.push({
            id: i + 1,
            x: validPositions[i].x,
            y: validPositions[i].y,
            hp: SKEL_MAX_HP,
            state: 'idle',
            frame: 0,
            tick: 0,
            facingRight: Math.random() < 0.5,
            attackHit: false,
            dead: false,
            disappearTimer: 0,
            respawnTimer: 0,
            patrolTimer: Math.floor(Math.random() * 60),
            patrolDirX: 0,
            patrolDirY: 0,
            isPatrolling: false
        });
    }
}

function spawnLootAtSkeleton(skel) {
    const dropX = skel.x + SKEL_DRAW / 2;
    const dropY = skel.y + SKEL_DRAW * 0.72;

    // Drop a coin slightly to the left
    lootDrops.push({ type: 'coin', x: dropX - 20, y: dropY });
    // Drop a health potion slightly to the right
    lootDrops.push({ type: 'potion', x: dropX + 20, y: dropY });
}

function spawnChest() {
    // Place chest in the center-top area of the room
    const W = mapData.mapWidth || mapData.width || 18;
    const cx = Math.floor(W / 2) * TS + TS / 2 - CHEST_DRAW / 2;
    const cy = 2.5 * TS;
    chest = { x: cx, y: cy, state: 'locked', frame: 0, tick: 0 };
}

function checkLevelUp() {
    while (playerXP >= xpToNextLevel && playerLevel < MAX_LEVEL) {
        playerXP -= xpToNextLevel;
        playerLevel++;
        xpToNextLevel = Math.round(BASE_XP_TO_LEVEL * Math.pow(XP_LEVEL_MULTIPLIER, playerLevel - 1));
        currentMaxHP = SOLDIER_MAX_HP + HP_PER_LEVEL * (playerLevel - 1);
        currentDamage = SOLDIER_DAMAGE + DMG_PER_LEVEL * (playerLevel - 1);
        soldierHP = currentMaxHP; // Full heal on level up
        animatedSoldierHP = currentMaxHP;
        levelUpEffect = 120; // 2 second glow effect
        animatedXPRatio = 0; // Reset XP bar animation for new level
        toastMessage = `⚔ LEVEL UP! Lv.${playerLevel} — HP:${currentMaxHP} DMG:${currentDamage}`;
        toastTimer = 180;
    }
}

function respawnSingleSkeleton(skel) {
    skel.dead = false;
    skel.hp = SKEL_MAX_HP;
    skel.state = 'idle';
    skel.frame = 0;
    skel.tick = 0;
    skel.attackHit = false;
    skel.disappearTimer = 0;
    skel.respawnTimer = 0;
    skel.patrolTimer = 0;
    skel.isPatrolling = false;

    // Find a new random spawn position far from soldier
    const W = mapData.mapWidth || mapData.width || 18;
    const H = mapData.mapHeight || mapData.height || 11;
    const candidates = [];

    for (let y = 2; y < H - 2; y++) {
        for (let x = 2; x < W - 2; x++) {
            const testX = x * TS - SKEL_DRAW / 2 + TS / 2;
            const testY = y * TS - SKEL_DRAW * 0.72 + TS / 2;
            const testFX = testX + SKEL_DRAW / 2;
            const testFY = testY + SKEL_DRAW * 0.72;

            if (isWalkableForSkeleton(testFX, testFY)) {
                const dist = Math.hypot(testX - soldierX, testY - soldierY);
                if (dist > TS * 3.5) {
                    candidates.push({ x: testX, y: testY });
                }
            }
        }
    }

    if (candidates.length > 0) {
        const choice = candidates[Math.floor(Math.random() * candidates.length)];
        skel.x = choice.x;
        skel.y = choice.y;
    }
}

// ── Collision & Camera ─────────────────────────────────────────────────────
function isWalkable(wx, wy) {
    const minX = 1.2 * TS;    // ~76.8px (left wall)
    const maxX = 16.8 * TS;   // ~1075px (right wall)
    const minY = 2.05 * TS;   // ~131.2px (top wall base - perfect)
    const maxY = 10.4 * TS;   // ~665.6px (bottom wall - extended for full reach)

    if (wx < minX || wx > maxX || wy < minY || wy > maxY) {
        return false;
    }
    return true;
}

function isWalkableForSkeleton(wx, wy) {
    const minX = 1.2 * TS;    // ~76.8px (left wall)
    const maxX = 16.8 * TS;   // ~1075px (right wall)
    const minY = 2.05 * TS;   // ~131.2px (top wall base)
    const maxY = 9.4 * TS;    // ~601.6px (stops skeleton at lower wall face)

    if (wx < minX || wx > maxX || wy < minY || wy > maxY) {
        return false;
    }
    return true;
}

function isBlocked(wx, wy) {
    return !isWalkable(wx, wy);
}

function snapCamera() {
    camX = soldierX + SOLDIER_DRAW / 2 - canvas.width / 2;
    camY = soldierY + SOLDIER_DRAW / 2 - canvas.height / 2;
    clampCamera();
}

function clampCamera() {
    const W = mapData.mapWidth || mapData.width || 18;
    const H = mapData.mapHeight || mapData.height || 11;
    const mapPixW = W * TS;
    const mapPixH = H * TS;
    camX = Math.max(0, Math.min(camX, mapPixW - canvas.width));
    camY = Math.max(0, Math.min(camY, mapPixH - canvas.height));
}

// ── Damage System ──────────────────────────────────────────────────────────
function applyDamage(amount) {
    if (isDead || soldierDead) return;

    soldierHP = Math.max(0, soldierHP - amount);
    hitCooldown = HIT_COOLDOWN;
    damageFlashTimer = 8;

    if (soldierHP <= 0) {
        isDead = true;
        isHit = false;
        isAttacking = false;
        isMoving = false;
        frame = 0;
        tick = 0;
    } else {
        isHit = true;
        isAttacking = false;
        frame = 0;
        tick = 0;
    }
}

function applyDamageToSkeleton(skel, amount) {
    if (skel.dead || skel.hp <= 0) return;

    skel.hp = Math.max(0, skel.hp - amount);

    damageTexts.push({
        x: skel.x + SKEL_DRAW / 2,
        y: skel.y + 5,
        text: `-${amount}`,
        life: 45,
        maxLife: 45
    });

    if (skel.hp <= 0) {
        skel.state = 'death';
        skel.frame = 0;
        skel.tick = 0;
    } else {
        skel.state = 'hit';
        skel.frame = 0;
        skel.tick = 0;
    }
}

// ── Update ─────────────────────────────────────────────────────────────────
function update() {
    // Toast notification timer
    if (toastTimer > 0) toastTimer--;

    // If game is paused or guide open, freeze game state updates
    if (isPaused || showControlGuide) return;

    if (hitCooldown > 0) hitCooldown--;
    if (damageFlashTimer > 0) damageFlashTimer--;

    if (soldierDead) return;

    // Soldier Death animation
    if (isDead) {
        tick++;
        if (tick >= DEATH_ANIM_SPEED) {
            tick = 0;
            frame++;
            if (frame >= DEATH_FRAMES) {
                frame = DEATH_FRAMES - 1;
                soldierDead = true;
            }
        }
        camX = soldierX + SOLDIER_DRAW / 2 - canvas.width / 2;
        camY = soldierY + SOLDIER_DRAW / 2 - canvas.height / 2;
        clampCamera();
        return;
    }

    // Soldier Hit / Attack / Move animation
    if (isHit) {
        tick++;
        if (tick >= HIT_ANIM_SPEED) {
            tick = 0;
            frame++;
            if (frame >= HIT_FRAMES) {
                isHit = false;
                frame = 0;
            }
        }
    } else if (isAttacking) {
        tick++;
        if (tick >= ATTACK_SPEED) {
            tick = 0;
            frame++;

            if ((frame === 2 || frame === 3) && !soldierAttackHit) {
                const soldierFaceX = soldierX + SOLDIER_DRAW * 0.5;
                const soldierFaceY = soldierY + SOLDIER_DRAW * 0.5;

                for (let skel of skeletons) {
                    if (skel.dead || skel.hp <= 0) continue;

                    const skelFaceX = skel.x + SKEL_DRAW * 0.5;
                    const skelFaceY = skel.y + SKEL_DRAW * 0.5;
                    const dist = Math.hypot(soldierFaceX - skelFaceX, soldierFaceY - skelFaceY);

                    const dx = skelFaceX - soldierFaceX;
                    const isFacingSkel = facingRight ? (dx >= -15) : (dx <= 15);

                    if (dist <= 65 && isFacingSkel) {
                        soldierAttackHit = true;
                        applyDamageToSkeleton(skel, currentDamage);
                        break;
                    }
                }
            }

            if (frame >= ATTACK_FRAMES) {
                isAttacking = false;
                frame = 0;
            }
        }
    } else {
        let dx = 0, dy = 0;
        if (keys['a'] || keys['arrowleft']) { dx -= MOVE_SPEED; facingRight = false; }
        if (keys['d'] || keys['arrowright']) { dx += MOVE_SPEED; facingRight = true; }
        if (keys['w'] || keys['arrowup']) dy -= MOVE_SPEED;
        if (keys['s'] || keys['arrowdown']) dy += MOVE_SPEED;

        isMoving = dx !== 0 || dy !== 0;

        const anchorX = soldierX + SOLDIER_DRAW / 2;
        const anchorY = soldierY + SOLDIER_DRAW * 0.72;

        if (dx !== 0) {
            const newAX = anchorX + dx;
            if (!isBlocked(newAX - HB_HALF, anchorY) && !isBlocked(newAX + HB_HALF, anchorY)) {
                soldierX += dx;
            }
        }

        if (dy !== 0) {
            const newAY = anchorY + dy;
            if (!isBlocked(anchorX - HB_HALF, newAY) && !isBlocked(anchorX + HB_HALF, newAY)) {
                soldierY += dy;
            }
        }

        const speed = isMoving ? WALK_SPEED : IDLE_SPEED;
        tick++;
        if (tick >= speed) {
            tick = 0;
            frame = (frame + 1) % (isMoving ? WALK_FRAMES : IDLE_FRAMES);
        }
    }

    // Torch Animation
    torchTick++;
    if (torchTick >= TORCH_SPEED) {
        torchTick = 0;
        torchFrame = (torchFrame + 1) % TORCH_FRAMES;
    }

    // Skeletons AI & State Loop
    const soldierFaceX = soldierX + SOLDIER_DRAW * 0.5;
    const soldierFaceY = soldierY + SOLDIER_DRAW * 0.5;

    for (let skel of skeletons) {
        if (skel.dead) {
            if (skel.disappearTimer > 0) {
                skel.disappearTimer--;
                if (skel.disappearTimer <= 0 && skel.respawnTimer <= 0) {
                    skel.respawnTimer = SKEL_RESPAWN_DELAY;
                }
            } else if (skel.respawnTimer > 0) {
                skel.respawnTimer--;
                if (skel.respawnTimer <= 0) {
                    respawnSingleSkeleton(skel);
                }
            }
            continue;
        }

        if (skel.state === 'death') {
            skel.tick++;
            if (skel.tick >= 6) {
                skel.tick = 0;
                skel.frame++;
                if (skel.frame >= SKEL_DEATH2_FRAMES) {
                    skel.frame = SKEL_DEATH2_FRAMES - 1;
                    skel.dead = true;
                    skel.disappearTimer = 60;
                    spawnLootAtSkeleton(skel);
                    playerXP += XP_PER_SKELETON;
                    checkLevelUp();
                    toastMessage = `+${XP_PER_SKELETON} XP`;
                    toastTimer = 90;
                }
            }
        } else if (skel.state === 'hit') {
            skel.tick++;
            if (skel.tick >= 5) {
                skel.tick = 0;
                skel.frame++;
                if (skel.frame >= SKEL_TAKE_DAMAGE_FRAMES) {
                    skel.frame = 0;
                    skel.state = 'idle';
                }
            }
        } else {
            const skelFX = skel.x + SKEL_DRAW / 2;
            const skelFY = skel.y + SKEL_DRAW * 0.72;
            const skelFaceX = skel.x + SKEL_DRAW * 0.5;
            const skelFaceY = skel.y + SKEL_DRAW * 0.5;

            // Un-stick safety: ensure skeleton Y stays within valid floor bounds
            const currentSkelFY = skel.y + SKEL_DRAW * 0.72;
            if (currentSkelFY > 9.4 * TS) {
                skel.y = 9.4 * TS - SKEL_DRAW * 0.72;
            } else if (currentSkelFY < 2.05 * TS) {
                skel.y = 2.05 * TS - SKEL_DRAW * 0.72;
            }

            const dist = Math.hypot(soldierFaceX - skelFaceX, soldierFaceY - skelFaceY);
            const ATTACK_RANGE = 24;

            if (skel.state === 'attack') {
                skel.facingRight = (soldierFaceX - skelFaceX) >= 0;
                skel.tick++;
                if (skel.tick >= 7) {
                    skel.tick = 0;
                    skel.frame++;

                    if (skel.frame >= 4 && !skel.attackHit && hitCooldown <= 0 && !isDead) {
                        if (dist <= ATTACK_RANGE + 20) {
                            skel.attackHit = true;
                            applyDamage(SKELETON_DAMAGE);
                        }
                    }

                    if (skel.frame >= SKEL_ATTACK_FRAMES) {
                        skel.frame = 0;
                        skel.attackHit = false;
                        skel.state = dist <= (ATTACK_RANGE + 6) ? 'attack' : 'movement';
                    }
                }
            } else if (dist <= ATTACK_RANGE) {
                skel.state = 'attack';
                skel.frame = 0;
                skel.tick = 0;
                skel.attackHit = false;
                skel.facingRight = (soldierFaceX - skelFaceX) >= 0;
            } else if (dist <= SKEL_AGGRO_RANGE) {
                // Aggro Range: Chase Player
                skel.state = 'movement';
                const angle = Math.atan2(soldierFaceY - skelFaceY, soldierFaceX - skelFaceX);
                const sdx = Math.cos(angle) * SKEL_MOVE_SPEED;
                const sdy = Math.sin(angle) * SKEL_MOVE_SPEED;

                if (sdx !== 0) skel.facingRight = sdx > 0;

                const nSkelAX = skelFX + sdx;
                if (isWalkableForSkeleton(nSkelAX - HB_HALF, skelFY) && isWalkableForSkeleton(nSkelAX + HB_HALF, skelFY)) {
                    skel.x += sdx;
                }
                const nSkelAY = skelFY + sdy;
                if (isWalkableForSkeleton(skelFX - HB_HALF, nSkelAY) && isWalkableForSkeleton(skelFX + HB_HALF, nSkelAY)) {
                    skel.y += sdy;
                }

                skel.tick++;
                if (skel.tick >= 6) {
                    skel.tick = 0;
                    skel.frame = (skel.frame + 1) % SKEL_MOVE_FRAMES;
                }
            } else {
                // Outside Aggro Range: Patrol Wandering AI
                skel.patrolTimer--;
                if (skel.patrolTimer <= 0) {
                    if (Math.random() < 0.65) {
                        skel.isPatrolling = true;
                        const randAngle = Math.random() * Math.PI * 2;
                        skel.patrolDirX = Math.cos(randAngle);
                        skel.patrolDirY = Math.sin(randAngle);
                        skel.patrolTimer = 80 + Math.floor(Math.random() * 100);
                    } else {
                        skel.isPatrolling = false;
                        skel.patrolDirX = 0;
                        skel.patrolDirY = 0;
                        skel.patrolTimer = 60 + Math.floor(Math.random() * 80);
                    }
                }

                if (skel.isPatrolling) {
                    skel.state = 'movement';
                    const pdx = skel.patrolDirX * SKEL_PATROL_SPEED;
                    const pdy = skel.patrolDirY * SKEL_PATROL_SPEED;

                    if (pdx !== 0) skel.facingRight = pdx > 0;

                    const nSkelAX = skelFX + pdx;
                    if (isWalkableForSkeleton(nSkelAX - HB_HALF, skelFY) && isWalkableForSkeleton(nSkelAX + HB_HALF, skelFY)) {
                        skel.x += pdx;
                    } else {
                        skel.patrolDirX *= -1;
                    }

                    const nSkelAY = skelFY + pdy;
                    if (isWalkableForSkeleton(skelFX - HB_HALF, nSkelAY) && isWalkableForSkeleton(skelFX + HB_HALF, nSkelAY)) {
                        skel.y += pdy;
                    } else {
                        skel.patrolDirY *= -1;
                    }

                    skel.tick++;
                    if (skel.tick >= 8) {
                        skel.tick = 0;
                        skel.frame = (skel.frame + 1) % SKEL_MOVE_FRAMES;
                    }
                } else {
                    skel.state = 'idle';
                    skel.tick++;
                    if (skel.tick >= 12) {
                        skel.tick = 0;
                        skel.frame = (skel.frame + 1) % SKEL_IDLE_FRAMES;
                    }
                }
            }
        }
    }

    // Damage texts update
    for (let i = damageTexts.length - 1; i >= 0; i--) {
        const dt = damageTexts[i];
        dt.y -= 0.7;
        dt.life--;
        if (dt.life <= 0) {
            damageTexts.splice(i, 1);
        }
    }

    // Loot animation tick
    lootAnimTick++;

    // Auto-pickup loot on proximity (using player body center)
    const playerCX = soldierX + SOLDIER_DRAW * 0.5;
    const playerCY = soldierY + SOLDIER_DRAW * 0.55;
    for (let i = lootDrops.length - 1; i >= 0; i--) {
        const loot = lootDrops[i];
        const dist = Math.hypot(playerCX - loot.x, playerCY - loot.y);
        if (dist <= 30) {
            if (loot.type === 'coin') {
                goldCount += COIN_VALUE;
                toastMessage = `+${COIN_VALUE} Gold`;
                toastTimer = 80;
            } else if (loot.type === 'potion') {
                const healed = Math.min(POTION_HEAL, currentMaxHP - soldierHP);
                soldierHP = Math.min(currentMaxHP, soldierHP + POTION_HEAL);
                toastMessage = `+${healed} HP Restored`;
                toastTimer = 80;
            }
            lootDrops.splice(i, 1);
        }
    }

    // Chest interaction (E key or Space near chest)
    if (chest && chest.state === 'closed' && !isDead && !soldierDead) {
        const chestCX = chest.x + CHEST_DRAW / 2;
        const chestCY = chest.y + CHEST_DRAW / 2;
        const chestDist = Math.hypot(playerCX - chestCX, playerCY - chestCY);
        if (chestDist <= CHEST_INTERACT_RANGE && (keys['e'] || keys['f'])) {
            chest.state = 'opening';
            chest.frame = 0;
            chest.tick = 0;
        }
    }

    // Chest opening animation
    if (chest && chest.state === 'opening') {
        chest.tick++;
        if (chest.tick >= CHEST_OPEN_ANIM_SPEED) {
            chest.tick = 0;
            chest.frame++;
            if (chest.frame >= CHEST_FRAMES) {
                chest.frame = CHEST_FRAMES - 1;
                chest.state = 'open';
                // Reward from chest
                goldCount += COIN_VALUE * 3;
                toastMessage = `🎁 Chest Opened! +${COIN_VALUE * 3} Gold`;
                toastTimer = 120;
            }
        }
    }

    // Unlock chest when any skeleton dies
    if (chest && chest.state === 'locked' && skeletons.some(s => s.dead)) {
        chest.state = 'closed';
    }

    // Smoothly animate health bar value
    animatedSoldierHP += (soldierHP - animatedSoldierHP) * 0.12;
    if (Math.abs(soldierHP - animatedSoldierHP) < 0.05) {
        animatedSoldierHP = soldierHP;
    }

    // Smoothly animate XP bar
    const targetXPRatio = (playerLevel >= MAX_LEVEL) ? 1 : playerXP / xpToNextLevel;
    animatedXPRatio += (targetXPRatio - animatedXPRatio) * 0.12;
    if (Math.abs(targetXPRatio - animatedXPRatio) < 0.005) animatedXPRatio = targetXPRatio;

    // Level-up effect countdown
    if (levelUpEffect > 0) levelUpEffect--;

    // Remove single skelRespawnTimer logic as it's now handled per skeleton in loop()

    camX = soldierX + SOLDIER_DRAW / 2 - canvas.width / 2;
    camY = soldierY + SOLDIER_DRAW / 2 - canvas.height / 2;
    clampCamera();
}

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    const W = mapData.mapWidth || mapData.width;
    const H = mapData.mapHeight || mapData.height;

    ctx.save();

    let renderCamX = camX;
    let renderCamY = camY;
    let startTX = Math.max(0, Math.floor(renderCamX / TS));
    let startTY = Math.max(0, Math.floor(renderCamY / TS));
    let endTX = Math.min(W - 1, Math.ceil((renderCamX + canvas.width) / TS));
    let endTY = Math.min(H - 1, Math.ceil((renderCamY + canvas.height) / TS));

    if (debugMapMode) {
        const mapPixW = W * TS;
        const mapPixH = H * TS;
        const scale = Math.min(canvas.width / mapPixW, canvas.height / mapPixH) * 0.95;

        const offsetX = (canvas.width - mapPixW * scale) / 2;
        const offsetY = (canvas.height - mapPixH * scale) / 2;

        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        startTX = 0;
        startTY = 0;
        endTX = W - 1;
        endTY = H - 1;
        renderCamX = 0;
        renderCamY = 0;
    }

    const SHEET_COLS = 128 / 16;

    // Render Tiles
    for (let ty = startTY; ty <= endTY; ty++) {
        for (let tx = startTX; tx <= endTX; tx++) {
            const dstX = Math.round(tx * TS - renderCamX);
            const dstY = Math.round(ty * TS - renderCamY);

            ctx.fillStyle = '#0f0f11';
            ctx.fillRect(dstX, dstY, TS, TS);

            for (let layer of mapLayers) {
                const tileId = layer[ty] && layer[ty][tx] !== null ? layer[ty][tx] : null;
                if (tileId !== null) {
                    if (tileId === 20 && torchImages[torchFrame]) {
                        ctx.drawImage(torchImages[torchFrame],
                            0, 0, TILE, TILE,
                            dstX, dstY, TS, TS
                        );
                    } else {
                        const srcX = tileId % SHEET_COLS;
                        const srcY = Math.floor(tileId / SHEET_COLS);

                        ctx.drawImage(tileset,
                            srcX * TILE, srcY * TILE, TILE, TILE,
                            dstX, dstY, TS, TS
                        );
                    }
                }
            }
        }
    }

    // Render Chest
    if (chest) {
        const cDrawX = Math.round(chest.x - renderCamX);
        const cDrawY = Math.round(chest.y - renderCamY);
        let chestImg = chestImages[0];

        if (chest.state === 'opening') {
            chestImg = chestOpenImages[Math.min(chest.frame, CHEST_FRAMES - 1)];
        } else if (chest.state === 'open') {
            chestImg = chestOpenImages[3];
        }

        ctx.drawImage(chestImg, cDrawX, cDrawY, CHEST_DRAW, CHEST_DRAW);

        // Interaction Prompt when player is near closed chest
        if (chest.state === 'closed' && !isDead && !soldierDead) {
            const playerCX = soldierX + SOLDIER_DRAW * 0.5;
            const playerCY = soldierY + SOLDIER_DRAW * 0.55;
            const chestCX = chest.x + CHEST_DRAW / 2;
            const chestCY = chest.y + CHEST_DRAW / 2;
            if (Math.hypot(playerCX - chestCX, playerCY - chestCY) <= CHEST_INTERACT_RANGE) {
                ctx.save();
                ctx.font = 'bold 12px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffe066';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.strokeText('Press [E] to Open', cDrawX + CHEST_DRAW / 2, cDrawY - 8);
                ctx.fillText('Press [E] to Open', cDrawX + CHEST_DRAW / 2, cDrawY - 8);
                ctx.restore();
            }
        }
    }

    // Render Dropped Loot (Coins & Health Potions)
    for (let loot of lootDrops) {
        const lDrawX = Math.round(loot.x - COIN_DRAW / 2 - renderCamX);
        const lDrawY = Math.round(loot.y - COIN_DRAW / 2 - renderCamY);

        if (loot.type === 'coin') {
            const cFrame = Math.floor(lootAnimTick / COIN_ANIM_SPEED) % COIN_FRAMES;
            ctx.drawImage(coinImages[cFrame], lDrawX, lDrawY, COIN_DRAW, COIN_DRAW);
        } else if (loot.type === 'potion') {
            const pFrame = Math.floor(lootAnimTick / POTION_ANIM_SPEED) % POTION_FRAMES;
            const bobY = Math.sin(lootAnimTick * 0.08) * 3;
            ctx.drawImage(potionImages[pFrame], lDrawX, lDrawY + bobY, POTION_DRAW, POTION_DRAW);
        }
    }

    // Render Soldier
    const sheet = isDead ? deathSheet
                : isHit ? hitSheet
                : isAttacking ? attackSheet
                : (isMoving ? walkSheet : idleSheet);
    const drawX = Math.round(soldierX - renderCamX);
    const drawY = Math.round(soldierY - renderCamY);

    ctx.save();
    if (hitCooldown > 0 && !isDead && Math.floor(hitCooldown / 3) % 2 === 0) {
        ctx.globalAlpha = 0.6;
    }

    if (!facingRight) {
        ctx.translate(drawX + SOLDIER_DRAW / 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sheet,
            frame * SPRITE_W, 0, SPRITE_W, SPRITE_H,
            -SOLDIER_DRAW / 2, drawY, SOLDIER_DRAW, SOLDIER_DRAW
        );
    } else {
        ctx.drawImage(sheet,
            frame * SPRITE_W, 0, SPRITE_W, SPRITE_H,
            drawX, drawY, SOLDIER_DRAW, SOLDIER_DRAW
        );
    }
    ctx.restore();

    // Floating "LEVEL UP!" dialogue bubble above soldier
    if (levelUpEffect > 0 && !isDead && !soldierDead) {
        ctx.save();
        const sCenterX = Math.round(soldierX + SOLDIER_DRAW / 2 - renderCamX);
        const floatOffset = (120 - levelUpEffect) * 0.25; // Gently floats upwards
        const bubbleY = Math.round(soldierY + SOLDIER_DRAW * 0.38 - 25 - floatOffset - renderCamY);
        const alpha = Math.min(1, levelUpEffect / 25);
        ctx.globalAlpha = alpha;

        const text = `⚡ LEVEL UP! (Lv.${playerLevel})`;
        ctx.font = 'bold 13px "Cinzel", "Inter", sans-serif';
        const textMetrics = ctx.measureText(text);
        const paddingX = 10;
        const bw = textMetrics.width + paddingX * 2;
        const bh = 22;
        const bx = sCenterX - bw / 2;
        const by = bubbleY - bh / 2;

        // Dialogue Bubble Container
        ctx.fillStyle = 'rgba(15, 12, 25, 0.92)';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 6);
        ctx.fill();
        ctx.stroke();

        // Dialogue Tail Pointer (pointing down towards soldier)
        ctx.beginPath();
        ctx.moveTo(sCenterX - 4, by + bh);
        ctx.lineTo(sCenterX, by + bh + 5);
        ctx.lineTo(sCenterX + 4, by + bh);
        ctx.fillStyle = '#ffd700';
        ctx.fill();

        // Dialogue Text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.5;
        ctx.strokeText(text, sCenterX, bubbleY);
        ctx.fillText(text, sCenterX, bubbleY);

        ctx.restore();
    }

    // Render Skeletons (fade out and disappear 1s after death)
    for (let skel of skeletons) {
        if (!skel.dead || skel.disappearTimer > 0) {
            const skelSheet = skel.state === 'death' ? skelDeath2Sheet
                : skel.state === 'hit' ? skelImages[4]
                : skel.state === 'attack' ? skelImages[2]
                : skel.state === 'movement' ? skelImages[1]
                : skelImages[0];

            const skelDrawX = Math.round(skel.x - renderCamX);
            const skelDrawY = Math.round(skel.y - renderCamY);

            ctx.save();
            if (skel.dead && skel.disappearTimer < 30) {
                ctx.globalAlpha = Math.max(0, skel.disappearTimer / 30);
            }

            if (!skel.facingRight) {
                ctx.translate(skelDrawX + SKEL_DRAW / 2, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(skelSheet,
                    skel.frame * SKEL_SPRITE_W, 0, SKEL_SPRITE_W, SKEL_SPRITE_H,
                    -SKEL_DRAW / 2, skelDrawY, SKEL_DRAW, SKEL_DRAW
                );
            } else {
                ctx.drawImage(skelSheet,
                    skel.frame * SKEL_SPRITE_W, 0, SKEL_SPRITE_W, SKEL_SPRITE_H,
                    skelDrawX, skelDrawY, SKEL_DRAW, SKEL_DRAW
                );
            }
            ctx.restore();
        }
    }

    // Render Floating Damage Text
    for (let dt of damageTexts) {
        const alpha = Math.max(0, dt.life / dt.maxLife);
        const dX = Math.round(dt.x - renderCamX);
        const dY = Math.round(dt.y - renderCamY);

        ctx.save();
        ctx.font = '900 18px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(255, 60, 60, ${alpha})`;
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.lineWidth = 3.5;
        ctx.strokeText(dt.text, dX, dY);
        ctx.fillText(dt.text, dX, dY);
        ctx.restore();
    }

    // Debug map mode hitbox
    if (debugMapMode && !isDead && !soldierDead) {
        const footX = soldierX + SOLDIER_DRAW / 2 - renderCamX;
        const footY = soldierY + SOLDIER_DRAW * 0.72 - renderCamY;
        ctx.fillStyle = 'lime';
        ctx.fillRect(footX - HB_HALF, footY - HB_HALF, HB_HALF * 2, HB_HALF * 2);
    }

    ctx.restore();

    // ── Pixel UI Animated Health Bar (Standalone Thin Healthbar) ──────────────
    const hbX = 16;
    const hbY = 12;
    const drawW = PIXEL_HB_SW * PIXEL_HB_DRAW_SCALE_X; // 42 * 3.2 = 134.4px
    const drawH = PIXEL_HB_SH * PIXEL_HB_DRAW_SCALE_Y; // 7 * 2.0 = 14px (thin bar)

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const hpRatio = Math.max(0, Math.min(1, animatedSoldierHP / currentMaxHP));

    // Choose stage index (0 = 100% full, 1 = 75%, 2 = 50%, 3 = 25%, 4 = 0% empty)
    let stageIdx = 4;
    if (hpRatio > 0.82) stageIdx = 0;
    else if (hpRatio > 0.58) stageIdx = 1;
    else if (hpRatio > 0.33) stageIdx = 2;
    else if (hpRatio > 0.08) stageIdx = 3;
    else if (hpRatio > 0) stageIdx = 4;

    const srcX = PIXEL_HB_STAGES[stageIdx];
    const srcY = PIXEL_HB_Y;

    if (pixelUISheet && pixelUISheet.complete) {
        ctx.drawImage(pixelUISheet,
            srcX, srcY, PIXEL_HB_SW, PIXEL_HB_SH,
            hbX, hbY, drawW, drawH
        );
    }

    // ── Standalone Gold Counter UI (Separated below healthbar) ─────────────────
    const goldX = 16;
    const goldY = hbY + drawH + 18; // y = 44px
    if (coinImages && coinImages[0]) {
        ctx.drawImage(coinImages[0], goldX, goldY - 13, 16, 16);
    }
    ctx.font = 'bold 12px "Cinzel", "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.strokeText(`GOLD: ${goldCount}`, goldX + 22, goldY);
    ctx.fillText(`GOLD: ${goldCount}`, goldX + 22, goldY);

    // ── XP Bar + Level Label (Below gold counter) ─────────────────────────────
    const xpX = 16;
    const xpY = goldY + 16;
    const xpFrameW = XP_BAR_FRAME_SW * XP_BAR_DRAW_SCALE_X; // 48*3 = 144px
    const xpFrameH = XP_BAR_FRAME_SH * XP_BAR_DRAW_SCALE_Y; // 11*1.8 ≈ 20px
    const xpFillW = XP_BAR_FILL_SW * XP_BAR_DRAW_SCALE_X;   // 42*3 = 126px
    const xpFillH = XP_BAR_FILL_SH * XP_BAR_DRAW_SCALE_Y;   // 5*1.8 = 9px

    // LV label
    ctx.font = 'bold 11px "Cinzel", "Inter", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8cf';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    const lvText = playerLevel >= MAX_LEVEL ? `LV.MAX` : `LV.${playerLevel}`;
    ctx.strokeText(lvText, xpX + xpFrameW + 2, xpY + xpFrameH / 2 + 4);
    ctx.fillText(lvText, xpX + xpFrameW + 2, xpY + xpFrameH / 2 + 4);

    if (xpBarSheet && xpBarSheet.complete) {
        // Draw XP bar frame (empty background frame at X=0, Y=3)
        ctx.drawImage(xpBarSheet,
            XP_BAR_FRAME_SX, XP_BAR_FRAME_SY, XP_BAR_FRAME_SW, XP_BAR_FRAME_SH,
            xpX, xpY, xpFrameW, xpFrameH
        );

        // Draw XP fill ONLY when player has XP / animatedXPRatio > 0
        const xpRatio = Math.max(0, Math.min(1, animatedXPRatio));
        if (xpRatio > 0.01) {
            let xpStage = 5; // empty stage
            if (xpRatio > 0.90) xpStage = 0;
            else if (xpRatio > 0.72) xpStage = 1;
            else if (xpRatio > 0.52) xpStage = 2;
            else if (xpRatio > 0.32) xpStage = 3;
            else if (xpRatio > 0.10) xpStage = 4;

            const fillSrcX = XP_BAR_FILL_STAGES[xpStage];
            const fillOffX = 3 * XP_BAR_DRAW_SCALE_X;
            const fillOffY = 3 * XP_BAR_DRAW_SCALE_Y;
            ctx.drawImage(xpBarSheet,
                fillSrcX, XP_BAR_FILL_SY, XP_BAR_FILL_SW, XP_BAR_FILL_SH,
                xpX + fillOffX, xpY + fillOffY, xpFillW, xpFillH
            );
        }
    }

    ctx.restore();

    // ── HUD Buttons: Pause Icon & Help Question Mark Icon ─────────────────────
    const pauseBtnX = LOGICAL_WIDTH - 52, pauseBtnY = 8, btnSize = 44;
    const helpBtnX = LOGICAL_WIDTH - 104, helpBtnY = 8;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1) Render Question Mark (?) Button
    ctx.fillStyle = 'rgba(15, 12, 25, 0.85)';
    ctx.strokeStyle = showControlGuide ? '#e8c97a' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(helpBtnX, helpBtnY, btnSize, btnSize, 8);
    ctx.fill();
    ctx.stroke();

    ctx.drawImage(healthBarUI,
        BTN_HELP_SX, BTN_HELP_SY, BTN_SRC_SIZE, BTN_SRC_SIZE,
        helpBtnX + 8, helpBtnY + 8, btnSize - 16, btnSize - 16
    );

    // 2) Render Pause Button (||)
    ctx.fillStyle = 'rgba(15, 12, 25, 0.85)';
    ctx.strokeStyle = isPaused ? '#e8c97a' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pauseBtnX, pauseBtnY, btnSize, btnSize, 8);
    ctx.fill();
    ctx.stroke();

    ctx.drawImage(healthBarUI,
        BTN_PAUSE_SX, BTN_PAUSE_SY, BTN_SRC_SIZE, BTN_SRC_SIZE,
        pauseBtnX + 8, pauseBtnY + 8, btnSize - 16, btnSize - 16
    );

    ctx.restore();

    // Damage Vignette Flash
    if (damageFlashTimer > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(200, 0, 0, ${0.25 * (damageFlashTimer / 8)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // ── Toast Notification Banner ──────────────────────────────────────────────
    if (toastTimer > 0 && toastMessage) {
        ctx.save();
        const toastAlpha = Math.min(1, toastTimer / 20);
        ctx.globalAlpha = toastAlpha;
        ctx.fillStyle = 'rgba(18, 14, 28, 0.9)';
        ctx.strokeStyle = '#e8c97a';
        ctx.lineWidth = 1.5;
        const tw = 260, th = 38;
        const tx = (LOGICAL_WIDTH - tw) / 2, ty = LOGICAL_HEIGHT - 65;
        ctx.beginPath();
        ctx.roundRect(tx, ty, tw, th, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 13px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e8c97a';
        ctx.fillText(toastMessage, LOGICAL_WIDTH / 2, ty + th / 2);
        ctx.restore();
    }

    // ── PAUSE MENU MODAL (Play / Load / Exit Banner) ─────────────────────────
    if (isPaused) {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 4, 10, 0.68)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Wooden Banner Board
        const boardW = MENU_BOARD_SW * 3.0; // 213
        const boardH = MENU_BOARD_SH * 3.0; // 336
        const boardX = (LOGICAL_WIDTH - boardW) / 2;
        const boardY = (LOGICAL_HEIGHT - boardH) / 2;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(healthBarUI,
            MENU_BOARD_SX, MENU_BOARD_SY, MENU_BOARD_SW, MENU_BOARD_SH,
            boardX, boardY, boardW, boardH
        );

        // Buttons inside Wooden Banner (perfectly centered inside inner wooden panel)
        const btnW = 120, btnH = 40;
        const btnX = boardX + (boardW - btnW) / 2;

        const playY = boardY + 104;
        const loadY = boardY + 168;
        const exitY = boardY + 232;

        // Render PLAY button
        renderMenuButton(btnX, playY, btnW, btnH, '▶  PLAY');
        // Render LOAD button
        renderMenuButton(btnX, loadY, btnW, btnH, '💾  LOAD');
        // Render EXIT button
        renderMenuButton(btnX, exitY, btnW, btnH, '🚪  EXIT');

        ctx.restore();
    }

    // ── CONTROL GUIDE MODAL (Question Mark Button Clicked) ────────────────────
    if (showControlGuide) {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 4, 10, 0.72)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const guideW = 540, guideH = 340;
        const guideX = (LOGICAL_WIDTH - guideW) / 2;
        const guideY = (LOGICAL_HEIGHT - guideH) / 2;

        // Modal Frame background
        ctx.fillStyle = '#120d1c';
        ctx.strokeStyle = '#e8c97a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(guideX, guideY, guideW, guideH, 12);
        ctx.fill();
        ctx.stroke();

        // Inner header line
        ctx.strokeStyle = 'rgba(232, 201, 122, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(guideX + 20, guideY + 52);
        ctx.lineTo(guideX + guideW - 20, guideY + 52);
        ctx.stroke();

        // Title
        ctx.font = 'bold 20px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e8c97a';
        ctx.fillText('⚔ CONTROLS & GAME GUIDE', LOGICAL_WIDTH / 2, guideY + 30);

        // Close Button [X]
        const closeX = guideX + guideW - 36, closeY = guideY + 15, closeSize = 24;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = '#e8c97a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(closeX, closeY, closeSize, closeSize, 4);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 13px "Inter", sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText('✕', closeX + closeSize / 2, closeY + closeSize / 2);

        // Control List Table
        const controls = [
            { key: 'W / A / S / D  or  Arrow Keys', desc: 'Move Soldier through dungeon' },
            { key: 'SPACE  or  Left Click', desc: 'Sword Attack against skeleton' },
            { key: 'M', desc: 'Toggle Full Map Overview mode' },
            { key: 'P  or  ESC', desc: 'Pause game & open Play/Load/Exit menu' },
            { key: 'R', desc: 'Restart dungeon & respawn all characters' }
        ];

        let itemY = guideY + 82;
        for (let item of controls) {
            // Key background pill
            ctx.fillStyle = 'rgba(232, 201, 122, 0.12)';
            ctx.strokeStyle = 'rgba(232, 201, 122, 0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(guideX + 30, itemY, 210, 36, 6);
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 12px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#e8c97a';
            ctx.fillText(item.key, guideX + 135, itemY + 18);

            // Description text
            ctx.font = '13px "Inter", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#d5d2e0';
            ctx.fillText(item.desc, guideX + 255, itemY + 18);

            itemY += 46;
        }

        ctx.restore();
    }

    // Death Overlay
    if (soldierDead) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 32px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c0392b';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText('YOU DIED', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText('YOU DIED', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '14px "Inter", sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 20);
        ctx.restore();
    }
}

// Helper to render stylized menu banner buttons inside Pause Menu
function renderMenuButton(x, y, w, h, text) {
    ctx.save();
    // Wooden texture gradient fill
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#5a3d24');
    grad.addColorStop(0.5, '#442d18');
    grad.addColorStop(1, '#2d1d0e');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#e8c97a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    // Inner shadow line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

    // Text label
    ctx.font = 'bold 15px "Cinzel", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5e4b8';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.strokeText(text, x + w / 2, y + h / 2);
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.restore();
}

// ── Game Loop ──────────────────────────────────────────────────────────────
function loop() {
    update();
    render();
    requestAnimationFrame(loop);
}

// Init Assets & Load Game Map
loadAssets(loadMap);
