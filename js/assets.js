// ═══════════════════════════════════════════════════════════════════════════
//  ASSET MANAGER
// ═══════════════════════════════════════════════════════════════════════════

const tileset = new Image();
const walkSheet = new Image();
const idleSheet = new Image();
const attackSheet = new Image();
const hitSheet = new Image();
const deathSheet = new Image();
const healthBarUI = new Image();
const torchImages = [new Image(), new Image(), new Image(), new Image()];
const skelImages = [new Image(), new Image(), new Image(), new Image(), new Image()];
const skelDeath2Sheet = new Image();

// Loot & Item images
const coinImages = [new Image(), new Image(), new Image(), new Image()];
const potionImages = [new Image(), new Image(), new Image(), new Image()];
const chestImages = [new Image(), new Image(), new Image(), new Image()];
const chestOpenImages = [new Image(), new Image(), new Image(), new Image()];
const pixelUISheet = new Image();
const xpBarSheet = new Image();

function loadAssets(onComplete) {
    const allImages = [
        { img: tileset, src: 'spritesheet.png' },
        { img: walkSheet, src: 'Tiny RPG Character Asset Pack -Demo Soldier&Orc/Soldier/Soldier_Walk.png' },
        { img: idleSheet, src: 'Tiny RPG Character Asset Pack -Demo Soldier&Orc/Soldier/Soldier_Idle.png' },
        { img: attackSheet, src: 'Tiny RPG Character Asset Pack -Demo Soldier&Orc/Soldier/Soldier_Attack02.png' },
        { img: hitSheet, src: 'Tiny RPG Character Asset Pack -Demo Soldier&Orc/Soldier/Soldier_Hit.png' },
        { img: deathSheet, src: 'Tiny RPG Character Asset Pack -Demo Soldier&Orc/Soldier/Soldier_Death.png' },
        { img: healthBarUI, src: 'UIBundleFree/freefantasy.png' },
        { img: pixelUISheet, src: 'pixel ui/06.png' },
        { img: xpBarSheet, src: 'pixel ui/04.png' },
        { img: torchImages[0], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/torch/torch_1.png' },
        { img: torchImages[1], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/torch/torch_2.png' },
        { img: torchImages[2], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/torch/torch_3.png' },
        { img: torchImages[3], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/torch/torch_4.png' },
        { img: skelImages[0], src: 'Enemy_Animations_Set/enemies-skeleton1_idle.png' },
        { img: skelImages[1], src: 'Enemy_Animations_Set/enemies-skeleton1_movement.png' },
        { img: skelImages[2], src: 'Enemy_Animations_Set/enemies-skeleton1_attack.png' },
        { img: skelImages[3], src: 'Enemy_Animations_Set/enemies-skeleton1_death.png' },
        { img: skelImages[4], src: 'Enemy_Animations_Set/enemies-skeleton1_take_damage.png' },
        { img: skelDeath2Sheet, src: 'Enemy_Animations_Set/enemies-skeleton2_death.png' },
        { img: coinImages[0], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/coin/coin_1.png' },
        { img: coinImages[1], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/coin/coin_2.png' },
        { img: coinImages[2], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/coin/coin_3.png' },
        { img: coinImages[3], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/coin/coin_4.png' },
        { img: potionImages[0], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/flasks/flasks_1_1.png' },
        { img: potionImages[1], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/flasks/flasks_1_2.png' },
        { img: potionImages[2], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/flasks/flasks_1_3.png' },
        { img: potionImages[3], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/flasks/flasks_1_4.png' },
        { img: chestImages[0], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/mini_chest/mini_chest_1.png' },
        { img: chestImages[1], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/mini_chest/mini_chest_2.png' },
        { img: chestImages[2], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/mini_chest/mini_chest_3.png' },
        { img: chestImages[3], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/mini_chest/mini_chest_4.png' },
        { img: chestOpenImages[0], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/mini_chest/mini_chest_open_1.png' },
        { img: chestOpenImages[1], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/mini_chest/mini_chest_open_2.png' },
        { img: chestOpenImages[2], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/mini_chest/mini_chest_open_3.png' },
        { img: chestOpenImages[3], src: '2D Pixel Dungeon Asset Pack/items and trap_animation/mini_chest/mini_chest_open_4.png' }
    ];

    let loaded = 0;
    let done = false;
    const TOTAL_ASSETS = allImages.length;

    function handleItemLoad() {
        if (done) return;
        loaded++;
        if (loaded >= TOTAL_ASSETS) {
            done = true;
            if (typeof onComplete === 'function') onComplete();
        }
    }

    // Attach handlers BEFORE setting src, and handle already-complete cached images
    allImages.forEach(item => {
        item.img.onload = handleItemLoad;
        item.img.onerror = handleItemLoad; // Continue even if an image fails
        item.img.src = item.src;
        if (item.img.complete) {
            handleItemLoad();
        }
    });

    // Safety fallback timeout: guarantee completion within 1 second even on slow networks
    setTimeout(() => {
        if (!done) {
            done = true;
            if (typeof onComplete === 'function') onComplete();
        }
    }, 1000);
}
