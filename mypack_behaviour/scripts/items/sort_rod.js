import {
    system,
    world,
    ItemComponentUseEvent,
} from "@minecraft/server";

import Sorting from "../handlers/sorting.js"


// --- UTILS ---

/** logs message to console and world chat
 * @param {string} message
*/
function log(message) {
    console.log(message);
    world.sendMessage(message);
}

/** logs message to world chat
 * @param {string} message
*/
function chat(message) {
    world.sendMessage(message);
}

/** logs error message
 * @param {string} message
*/
function logErr(message)
{
    console.log("error: " + message);
    world.sendMessage("error: " + message);
}

// --- CLASS ---

/** SortRodComponent
 * @implements {ItemCustomComponent}
 */
export default class SortRodComponent {

    // item mode
    m_depositMode = true;
    m_sorting = new Sorting();

    constructor() {
        this.onUse = this.onUse.bind(this);
    }

    /**
     * @param {ItemComponentUseEvent} event 
     * @param {CustomComponentParameters} params 
     */
    onUse(event, params) {
        if(!this.CheckCooldown()) return;

        var player = event.source;
        const sorting = this.m_sorting;

        if(player.test === undefined)
            player.test = 0;
        else
            player.test += 1;

        chat("player.test: " + player.test)

        if(player.isSneaking)
        {
            this.m_depositMode = !this.m_depositMode;
            chat("mode: " + ((this.m_depositMode === true) ? "deposit" : "take"));

            var range = sorting.GetRange(player.location);
            sorting.HighlightRange(player, range.pos1, range.pos2);
        }
        else
        {
            sorting.Sort(player, player.location, this.m_depositMode)
        }
    }

    // item use cooldown
    m_cooldownTicks = 16;
    m_cooldownTimestamp = -1;

    /** Returns true if cooldown passed
     * @returns {boolean}
     */
    CheckCooldown()
    {
        var result = false;
        var tick = system.currentTick;
        if(this.m_cooldownTimestamp == -1 || tick - this.m_cooldownTimestamp > this.m_cooldownTicks)
        {
            result = true;
            this.m_cooldownTimestamp = tick;
        }
        return result;
    }
}