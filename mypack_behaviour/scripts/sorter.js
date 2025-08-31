import {
    world,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerInteractEvent,
} from "@minecraft/server";

import Sorting from "./handlers/sorting.js"

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
function logErr(message) {
    console.log("error: " + message);
    world.sendMessage("error: " + message);
}

// --- CLASS ---

/** SorterComponent
 * @implements {BlockCustomComponent}
 */
export default class SorterComponent {

    m_sorting = new Sorting();

    constructor()
    {
        this.onPlayerInteract = this.onPlayerInteract.bind(this);
        this.onPlace = this.onPlace.bind(this);
    }

    /** PlayerInteractEvent handler
     * @param {BlockComponentPlayerInteractEvent} event
     * @param {CustomComponentParameters} params
     */
    onPlayerInteract(event, params) {
        chat("sorter used");
        const player = event.player;
        const origin = event.block.location;
        const sorting = this.m_sorting;
        
        if(!player) return;

        if(player.isSneaking)
        {
            sorting.Sort(player, origin, true);
        }
        else
        {
            sorting.Sort(player, origin, false);
        }
    }

    /** OnPlaceEvent handler
     * @param {BlockComponentOnPlaceEvent} event 
     * @param {CustomComponentParameters} params 
     */
    onPlace(event, params)
    {
        //chat("sorter placed");
        
        const sorting = this.m_sorting;
        const player = event.player;
        const origin = event.block.location;

        // when sorter is placed, highlight the effective sorting range around it

        var range = sorting.GetRange(origin);
        sorting.HighlightRange(player, range.pos1, range.pos2);
    }
}