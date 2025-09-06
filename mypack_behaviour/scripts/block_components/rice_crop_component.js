import {
    system,
    world,
    BlockComponentRandomTickEvent
} from "@minecraft/server";

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

/** RiceCropComponent
 * @implements { BlockCustomComponent }
 */
export default class RiceCropComponent {

    constructor() {
        this.onRanodm
    }

    /** PlayerInteractEvent handler
     * @param {BlockComponentRandomTickEvent} event
     * @param {CustomComponentParameters} params
     * @returns
     */
    onRandomTick(event, params) {
        chat("random tick");

        // Grow the rice crop by incrementing its block permutation state

        const age = event.block.permutation.getState('mypack:crop_age');

        //chat("age is: " + age);

        if (age === undefined || typeof age !== 'number') return;
        
        else if (age === 4) {
            return; // fully grown
        }

        var pos = event.block.location;
        chat("growing crop at " + pos.x + "," + pos.z + " to crop_age=" + (age + 1));

        event.block.setPermutation(event.block.permutation.withState('mypack:crop_age', (age + 1)));
    }
}