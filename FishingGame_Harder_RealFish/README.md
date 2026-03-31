# FishingGame FSM

A browser fishing game built with HTML5 Canvas and JavaScript. The fish use a reusable finite state machine (FSM) with six distinct states.

## Play
Open `index.html` in a browser or deploy the `game` folder to GitHub Pages.

## Controls
- Mouse move: aim the rod
- Mouse down: charge cast and start reeling pressure
- Mouse up: release cast
- Click: splash interaction
- Right click: change bait
- Mouse wheel: zoom in/out
- `1`, `2`, `3`: choose bait directly
- `WASD` or arrow keys: fine aim adjustment
- `ESC`: pause
- `R`: restart

## Implemented Events
1. `load`
2. `resize`
3. `keydown`
4. `keyup`
5. `click`
6. `mousemove`
7. `mousedown`
8. `mouseup`
9. `contextmenu`
10. `wheel`
11. `blur`
12. `focus`
13. `visibilitychange`
14. Custom event: `gameCast`
15. Custom event: `fishHooked`
16. Custom event: `fishCaught`
17. Custom event: `lineBreak`
18. `requestAnimationFrame`

## FSM States
- `SWIM`
- `NOTICE_BAIT`
- `APPROACH`
- `BITE`
- `HOOKED`
- `ESCAPE_ATTEMPT`

## Transition Summary
| Current State | Condition | Next State | Action |
|---|---|---|---|
| SWIM | Hook enters notice radius | NOTICE_BAIT | Fish watches bait |
| NOTICE_BAIT | Fish gets closer | APPROACH | Fish moves toward bait |
| NOTICE_BAIT | Hook too far away | SWIM | Return to patrol |
| APPROACH | Fish reaches bite radius | BITE | Bite animation and sound |
| APPROACH | Hook gets far away | SWIM | Abandon chase |
| BITE | Bite timer ends | HOOKED | Attach fish to hook |
| HOOKED | Escape timer ends | ESCAPE_ATTEMPT | Burst movement away |
| ESCAPE_ATTEMPT | Fish moves far enough away | SWIM | Resume roaming |

## Repository Structure
```
/game
  /assets
    /images
    /sounds
  /js
    main.js
    player.js
    enemy.js
    fsm.js
  /css
    style.css
  index.html
  README.md
  fsm-diagram.svg
```

## Assets
The project includes realistic public-domain fish photos from Wikimedia Commons / U.S. Fish and Wildlife Service.

## Notes
- All code and comments are in English.
- The game includes menu, pause, HUD, score, level progression, sound toggle, and game-over screen.


## Harder Fishing Version
This version keeps the same visual style and fish PNG assets, but makes the fishing significantly harder:
- fewer fish spawn at the start
- fish swim faster and notice the hook later
- bite windows are shorter
- escape attempts are stronger and damage the line more
- hook casting and reeling are weaker
- bosses require more fish to progress

Updated boss requirements: Turtle 5, Shark 9, Whale 14, Hungry Shark 20.
