# Add Skeleton Enemy AI

This plan outlines the addition of a simple Skeleton AI enemy to the pixel game, which will chase the player and attack when in range.

## Proposed Changes

### `viewer.html`

1.  **Asset Loading**
    *   Load all 5 provided skeleton spritesheets (`enemies-skeleton1_attack.png`, `enemies-skeleton1_death.png`, `enemies-skeleton1_idle.png`, `enemies-skeleton1_movement.png`, `enemies-skeleton1_take_damage.png`).
    *   Wait for all skeleton sprites to load before starting the game.

2.  **Entity State Management**
    *   Create a `skeleton` object to track its state:
        *   `x`, `y`: Position coordinates.
        *   `state`: Current action (`idle`, `movement`, `attack`).
        *   `frame`, `tick`: Animation trackers.
        *   `facingRight`: Boolean for sprite flipping.
    *   Define frame counts based on sprite sizes (32x32px frames):
        *   Attack: 9 frames
        *   Movement: 10 frames
        *   Idle: 6 frames

3.  **AI Logic (in `update()`)**
    *   Calculate the distance between the skeleton and the player's soldier.
    *   **Movement**: If the player is outside of attack range, the skeleton will update its `x` and `y` to move directly towards the player using basic pathfinding (moving in the direction of the player while respecting `isBlocked()` map collisions).
    *   **Attack**: If the skeleton is within a threshold distance (e.g., adjacent), it will switch to the `attack` state and lock into the attack animation until the animation completes.
    *   Update animation frames based on the current state and speed.

4.  **Rendering (in `render()`)**
    *   Draw the skeleton sprite at its `x`, `y` coordinates.
    *   Apply `ctx.scale(-1, 1)` if `facingRight === false` to ensure the skeleton faces the player correctly.
    *   Adjust the rendering offset so the 32x32px sprite is drawn cleanly relative to the 64x64px tile scale.

5.  **Spawning**
    *   Create a `spawnSkeleton()` function similar to `spawnSoldier()`.
    *   It will search the map for a valid walkable floor tile that is reasonably far from the player's center spawn, ensuring the enemy doesn't spawn directly on top of the player.

## User Review Required

> [!NOTE]
> Since you requested no health or damage indicators for now, the player will not be able to "kill" the skeleton, and the skeleton will not actually kill the player. It will simply chase you continuously and play its attack animation whenever it catches up to you. Does this sound good for this testing phase?
