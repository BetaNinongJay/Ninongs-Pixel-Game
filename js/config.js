// ═══════════════════════════════════════════════════════════════════════════
//  GAME CONFIGURATION & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TILE = 16;          // Tile size in the sprite sheet (px)
const SCALE = 4;           // Display scale — each tile = 64px on screen
const TS = TILE * SCALE;   // 64px — tile size on screen

// Logical Canvas Resolution
const LOGICAL_WIDTH = 960;
const LOGICAL_HEIGHT = 540;

// Soldier configuration
const WALK_FRAMES = 8;
const IDLE_FRAMES = 6;
const ATTACK_FRAMES = 6;
const HIT_FRAMES = 5;       // Soldier_Hit.png: 500x100 = 5 frames
const DEATH_FRAMES = 4;     // Soldier_Death.png: 400x100 = 4 frames
const SPRITE_W = 100;
const SPRITE_H = 100;
const SOLDIER_DRAW = Math.round(TS * 4); // 320px visual size
const HB_HALF = Math.round(TS * 0.2);   // Collision hitbox half-width at feet
const MOVE_SPEED = 3.5;

const WALK_SPEED = 7;
const IDLE_SPEED = 14;
const ATTACK_SPEED = 5;

// Skeleton configuration
const SKEL_IDLE_FRAMES = 6;
const SKEL_MOVE_FRAMES = 10;
const SKEL_ATTACK_FRAMES = 9;
const SKEL_TAKE_DAMAGE_FRAMES = 5; // 160x32 = 5 frames
const SKEL_DEATH2_FRAMES = 15;     // 480x32 = 15 frames
const SKEL_SPRITE_W = 32;
const SKEL_SPRITE_H = 32;
const SKEL_DRAW = Math.round(TS * 1.2); // ~77px
const SKEL_MOVE_SPEED = 2.0;
const SKEL_AGGRO_RANGE = 200;       // Aggro range to detect and chase player (px)
const SKEL_PATROL_SPEED = 0.8;      // Slow wandering speed during patrol mode

// Health & Combat configuration
const SOLDIER_MAX_HP = 100;
const SKELETON_DAMAGE = 12;          // Damage per skeleton attack hit
const SKEL_MAX_HP = 20;              // Skeleton health (4 hits @ 5 dmg)
const SOLDIER_DAMAGE = 5;            // Damage dealt by soldier per hit
const HIT_ANIM_SPEED = 6;            // Ticks per frame for hit animation
const DEATH_ANIM_SPEED = 10;         // Ticks per frame for death animation
const HIT_COOLDOWN = 40;             // Invulnerability frames after being hit

// Pixel UI Health Bar configuration from pixel ui/06.png (256x240)
// 5 stages of 42x7 healthbar sprites at Y=69 (X=3, 51, 99, 147, 195)
const PIXEL_HB_Y = 69;
const PIXEL_HB_SW = 42;
const PIXEL_HB_SH = 7;
const PIXEL_HB_STAGES = [3, 51, 99, 147, 195]; // X coordinates for 100%, 75%, 50%, 25%, 0%
const PIXEL_HB_DRAW_SCALE_X = 3.2; // Scale 42px width to 134.4px
const PIXEL_HB_DRAW_SCALE_Y = 2.0; // Scale 7px height to 14px (thin, sleek healthbar)

// Torch animation configuration
const TORCH_SPEED = 10;
const TORCH_FRAMES = 4;

// UI Buttons & Menu Board coordinates from freefantasy.png (256x256)
const BTN_PAUSE_SX = 32, BTN_PAUSE_SY = 176;
const BTN_HELP_SX = 0, BTN_HELP_SY = 224;
const BTN_STATS_SX = 32, BTN_STATS_SY = 224; // Status glowing diamond button in freefantasy.png
const BTN_SRC_SIZE = 16;
const BTN_DISPLAY_SIZE = 36; // Screen size of HUD icon buttons

// Wooden Menu Board (Play / Load / Exit blank banner - Board 2 in freefantasy.png)
const MENU_BOARD_SX = 84, MENU_BOARD_SY = 48, MENU_BOARD_SW = 71, MENU_BOARD_SH = 112;

// Medieval Wooden Frame Board from UIBundleFree/MediavelFree.png (256x128)
const MEDIEVAL_BOARD_SX = 0, MEDIEVAL_BOARD_SY = 0, MEDIEVAL_BOARD_SW = 64, MEDIEVAL_BOARD_SH = 128;

// Loot & Item configuration
const COIN_FRAMES = 4;
const COIN_ANIM_SPEED = 10;          // Ticks per coin spin frame
const COIN_VALUE = 10;                // Gold gained per coin pickup
const COIN_DRAW = 36;                 // Coin draw size on screen (px)

const POTION_FRAMES = 4;
const POTION_ANIM_SPEED = 12;         // Ticks per potion bob frame
const POTION_HEAL = 25;               // HP restored per health potion
const POTION_DRAW = 36;               // Potion draw size on screen (px)

const CHEST_FRAMES = 4;
const CHEST_DRAW = 48;                // Chest draw size on screen (px)
const CHEST_OPEN_ANIM_SPEED = 8;      // Ticks per chest open frame

const LOOT_PICKUP_RANGE = 40;         // Distance to auto-pickup loot (px)
const CHEST_INTERACT_RANGE = 75;      // Distance to interact with chest (px)

// Leveling & Stats configuration
const XP_PER_SKELETON = 25;           // XP gained per skeleton kill
const BASE_XP_TO_LEVEL = 50;          // XP needed for level 2
const XP_LEVEL_MULTIPLIER = 1.5;      // Each level needs 1.5x more XP
const MAX_LEVEL = 10;
const HP_PER_LEVEL = 15;              // +15 max HP per level
const DMG_PER_LEVEL = 2;              // +2 damage per level

// XP Bar sprite from pixel ui/04.png (336x240)
// Frame: X=0, Y=3, W=48, H=11  |  Fill stages (42x5) at Y=6
const XP_BAR_FRAME_SX = 0, XP_BAR_FRAME_SY = 3, XP_BAR_FRAME_SW = 48, XP_BAR_FRAME_SH = 11;
const XP_BAR_FILL_SY = 6, XP_BAR_FILL_SW = 42, XP_BAR_FILL_SH = 5;
const XP_BAR_FILL_STAGES = [51, 99, 147, 195, 243, 291]; // X coords: 100%→0%
const XP_BAR_DRAW_SCALE_X = 3.0;     // 48*3 = 144px frame width
const XP_BAR_DRAW_SCALE_Y = 1.8;     // 11*1.8 ≈ 20px frame height

// Skeleton Respawn
const SKEL_RESPAWN_DELAY = 300;       // 5 seconds at 60fps
