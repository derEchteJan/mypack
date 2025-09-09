import {
    system,
    world,
    Block,
    BlockVolume,
    BlockComponentRandomTickEvent,
    BlockComponentPlayerInteractEvent
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

/** FarmlandSlabComponent
 * @implements { BlockCustomComponent }
 */
export default class FarmlandSlabComponent {

    constructor() {
        this.onRandomTick = this.onRandomTick.bind(this);
        this.onPlayerInteract = this.onPlayerInteract.bind(this);
    }

    /** PlayerInteractEvent handler
     * @param {BlockComponentPlayerInteractEvent} event
     * @param {CustomComponentParameters} params
     */
    onPlayerInteract(event, params) {
        // relay onInteract to onRandomTick to test faster
        //this.onRandomTick(event, params);
        
    }

    /** OnRandomTick handler
     * @param {BlockComponentRandomTickEvent} event
     * @param {CustomComponentParameters} params
     * @returns
     */
    onRandomTick(event, params) {

        const pos = event.block.location;
        const block = event.block;

        //chat("random tick");

        const wet = event.block.permutation.getState('mypack:is_wet');

        //chat("farmland at " + pos.x + "," + pos.z + " is wet: " + (wet === true ? "true" : "false"));

        const from = { x: pos.x - 3, y: pos.y, z: pos.z - 3 };
        const to = { x: pos.x + 3, y: pos.y, z: pos.z + 3 };
        var blockVolume = new BlockVolume(from, to);
        var blockFilter =
        {
            includeTypes: [ "water" ]
        }
        var waterNearby = block.dimension.containsBlock(blockVolume, blockFilter, false);
        if(waterNearby && wet === false)
        {
            // farmland transitions to wet state
            //chat("water nearby");
            block.setPermutation(block.permutation.withState('mypack:is_wet', true));
        }
        else if(!waterNearby && wet === true)
        {
            // farmland transitions to dry state
            //chat("no water nearby");
            block.setPermutation(block.permutation.withState('mypack:is_wet', false));

            // destroy crop above if any
            this.DestroyCropAbove(block);
        }
    }

    /**
     * Destroys crop above given farmland slab block (e.g. when drying out)
     * @param {Block} block the farmland slab block
     */
    DestroyCropAbove(block)
    {
        var cropBlock = block.above(1);
        if(cropBlock && cropBlock.typeId === "mypack:rice_crop")
        {
            const pos = cropBlock.location;
            var posArg = "" + pos.x + " " + pos.y + " " + pos.z;
            block.dimension.runCommand("/setblock " + posArg + " air destroy");
        }
    }
}