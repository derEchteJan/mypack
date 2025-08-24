import {
    system,
    world,
    ItemComponentUseEvent,
    EntityInventoryComponent,
    EntityItemComponent,
    BlockVolume,
    Player,
    Container,
    ItemStack,
    ListBlockVolume,
    BlockInventoryComponent,
    EntityEquippableComponent
} from "@minecraft/server";

class Vector3
{
    x = 0; y = 0; z = 0;
}

class Range3
{
    pos1 = Vector3;
    pos2 = Vector3;
}

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
    // item use cooldown
    m_cooldownTicks = 16;
    m_cooldownTimestamp = -1;
    // chest detection range
    m_rangeVert = 5;
    m_rangeHor = 15;
    m_rangeVertOffset = -1;

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

        if(player.isSneaking)
        {
            this.m_depositMode = !this.m_depositMode;
            chat("mode: " + ((this.m_depositMode === true) ? "deposit" : "take"));

            var range = this.GetRange(player);
            this.HighlightRange(player, range.pos1, range.pos2);
        }
        else
        {
            this.Sort(player);
        }
    }

    /**
     * @param {Player} player 
     */
    Sort(player) {
        if(!player) return;

        var didTransfer = false;
        const dimension = player.dimension;

        chat("sorting");
        
        var range = this.GetRange(player);

        const searchFilter = {
            includeTypes: [ "minecraft:chest" ]
        }
        const searchVolume = new BlockVolume(range.pos1, range.pos2);

        var blockList = dimension.getBlocks(searchVolume, searchFilter, /*allowUnloadedChunks:*/ false);
        var blockIterator = blockList.getBlockLocationIterator();
        
        for(var chestPos of blockIterator)
        {
            chat("found chest at " + chestPos.x + ", " + chestPos.z);
            var chestBlock = dimension.getBlock(chestPos);
            var inventory = chestBlock.getComponent(BlockInventoryComponent.componentId);
            if(inventory && inventory.container)
            {
                
                if(this.m_depositMode)
                {
                    didTransfer = this.DepositToContainer(player, inventory.container);
                }
                else
                {
                    didTransfer = this.TakeFromContainer(player, inventory.container);
                }
            }
        }

        if(didTransfer)
            this.PlayDepositSound(player);
        else
            this.PlayNoTransferSound(player);
    }

    /**
     * @param {Player} player 
     * @param {Container} container
     * @returns {boolean} any items were transfered
     */
    TakeFromContainer(player, container)
    {
        chat("taking");

        var result = false;
        var inventory = player.getComponent(EntityInventoryComponent.componentId).container;

        for (var ii = 0; ii < inventory.size; ii++)
        {
            var iItem = inventory.getItem(ii);
            
            if (iItem && iItem.isStackable)
            {
                var countLeft = iItem.maxAmount - iItem.amount;
                var takenAmount = 0;

                //chat("trying to take to " + iItem.typeId);

                for (var ci = 0; ci < container.size && countLeft > 0; ci++)
                {
                    var cItem = container.getItem(ci);

                    if(cItem && cItem.typeId === iItem.typeId && cItem.isStackableWith(iItem))
                    {
                        var subtractAmount = cItem.amount;
                        if(subtractAmount > countLeft) subtractAmount = countLeft;

                        countLeft -= subtractAmount;
                        takenAmount += subtractAmount;
       
                        var newCItemAmount = cItem.amount - subtractAmount;
                        if(newCItemAmount > 0)
                        {
                            var newCItem = cItem.clone();
                            newCItem.amount = newCItemAmount;
                            container.setItem(ci, newCItem);
                            ci -= 1;
                        }
                        else
                        {
                            container.setItem(ci, null);
                        }
                    }
                }

                if(takenAmount > 0)
                {
                    var newIItem = iItem.clone();
                    newIItem.amount = iItem.maxAmount - countLeft;
                    inventory.setItem(ii, newIItem);
                    result = true;

                    chat("taken " + iItem.typeId + " (" + takenAmount + "x)");
                }
            }
        }

        return result;
    }

    /**
     * @param {Player} player 
     * @param {Container} container 
     * @returns {boolean} any items were transfered
     */
    DepositToContainer(player, container) {
        chat("depositing");

        var result = false;
        var inventory = player.getComponent(EntityInventoryComponent.componentId).container;

        for (var ii = 0; ii < inventory.size; ii++)
        {
            var iItem = inventory.getItem(ii);
            if (iItem && iItem.isStackable)
            {
                //chat("trying to deposit " + iItem.typeId);
                var countLeft = iItem.amount;
                var takenAmount = 0;

                for (var ci = 0; ci < container.size && countLeft > 0; ci++)
                {
                    var cItem = container.getItem(ci);
                    if(cItem && cItem.typeId === iItem.typeId && cItem.isStackableWith(iItem))
                    {
                        var subtractAmount = countLeft;
                        if(subtractAmount > cItem.maxAmount - cItem.amount ) subtractAmount = cItem.maxAmount - cItem.amount;

                        countLeft -= subtractAmount;
                        takenAmount += subtractAmount;
                        var newAmount = cItem.amount + subtractAmount;

                        var newCItem = cItem.clone();
                        newCItem.amount = newAmount;
                        container.setItem(ci, newCItem);

                        //chat("setting " + cItem.typeId + " at slot " + ci + " from " + cItem.amount + " to " + newAmount);
                    }
                }

                // deposit remainder into free slot

                if(takenAmount > 0 && countLeft > 0)
                {
                    for (var ci = 0; ci < container.size && countLeft > 0; ci++)
                    {
                        var cItem = container.getItem(ci);
                        if(!cItem)
                        {
                            var newCItem = iItem.clone();
                            newCItem.amount = countLeft;
                            takenAmount += countLeft;
                            countLeft = 0;
                            container.setItem(ci, newCItem);
                        }
                    }
                }

                if(takenAmount > 0)
                {
                    if(countLeft > 0)
                    {
                        var newIItem = iItem.clone();
                        newIItem.amount = countLeft;
                        inventory.setItem(ii, newIItem);
                        ii -= 1;
                    }
                    else
                    {
                        inventory.setItem(ii, null);
                    }
                    chat("deposited " + iItem.typeId + " (" + takenAmount + "x)");
                    result = true;
                }
                //chat("didnt deposit " + iItem.typeId);
            }
        }

        return result;
    }

    /**
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

    /** Returns chest search range around the given player
     * @param {Player} player 
     * @returns {Range3} range
     */
    GetRange(player)
    {
        var origin = player.location;
        const pos1 = {
            x: Math.floor( origin.x - this.m_rangeHor / 2 ),
            y: Math.floor( origin.y + this.m_rangeVertOffset ),
            z: Math.floor( origin.z - this.m_rangeHor / 2 )
        };
        const pos2 = {
            x: Math.floor( origin.x + this.m_rangeHor / 2 ),
            y: Math.floor( origin.y + this.m_rangeVert + this.m_rangeVertOffset ),
            z: Math.floor( origin.z + this.m_rangeHor / 2 )
        };
        return { pos1: pos1, pos2: pos2 };
    }

    /**
     * @param {Vector3} pos1 
     * @param {Vector3} pos2 
     */
    PrintRange(pos1, pos2)
    {
        chat("from:");
        chat("x: " + pos1.x);
        chat("y: " + pos1.y);
        chat("z: " + pos1.z);
        chat("to:");
        chat("x: " + pos2.x);
        chat("y: " + pos2.y);
        chat("z: " + pos2.z);
    }

    /**
     * @param {Player} player target player
     * @param {Vector3} from area start pos
     * @param {Vector3} to area end pos
     */
    HighlightRange(player, from, to)
    {
        var vertexes = this.GetCubeBoundaryVertexes(from, to);
        for(var vertex of vertexes)
        {
            this.HighlightVertex(player, vertex.start, vertex.end);
        }
    }

    /**
     * @param {Player} player target player
     * @param {Vector3} from vertex start pos
     * @param {Vector3} to vertex end pos
     */
    HighlightVertex(player, from, to)
    {
        const intervals = 8;
        const particleType = "minecraft:endrod"; // see: https://wiki.bedrock.dev/particles/vanilla-particles
        const dimension = player ? player.dimension : world.getDimension("overworld");

        var pos = {
            x: from.x,
            y: from.y,
            z: from.z
        }

        var dx = ( to.x - from.x ) / intervals;
        var dy = ( to.y - from.y ) / intervals;
        var dz = ( to.z - from.z ) / intervals;

        for(var i = 0; i < intervals + 1; i++)
        {
            dimension.spawnParticle(particleType, pos, null);

            pos.x += dx;
            pos.y += dy;
            pos.z += dz;
        }
    }

    /**
     * @param {Vector3} from vertex start pos
     * @param {Vector3} to vertex end pos
     * @returns {[{start: Vector3, end: Vector3}]}
     */
    GetCubeBoundaryVertexes(from, to)
    {
        const d = {
            x: to.x - from.x,
            y: to.y - from.y,
            z: to.z - from.z,
        }

        var vertexes = [
            { start: { x: from.x, y: from.y, z: from.z }, end: { x: from.x + d.x, y: from.y + 0,   z: from.z + 0   }, },
            { start: { x: from.x, y: from.y, z: from.z }, end: { x: from.x + 0,   y: from.y + d.y, z: from.z + 0   }, },
            { start: { x: from.x, y: from.y, z: from.z }, end: { x: from.x + 0,   y: from.y + 0,   z: from.z + d.z }, },

            { start: { x: from.x + d.x, y: from.y + 0,   z: from.z + 0   }, end: { x: from.x + d.x, y: from.y + d.y, z: from.z + 0   }, },
            { start: { x: from.x + d.x, y: from.y + 0,   z: from.z + 0   }, end: { x: from.x + d.x, y: from.y + 0,   z: from.z + d.z }, },

            { start: { x: from.x + 0,   y: from.y + d.y, z: from.z + 0   }, end: { x: from.x + d.x, y: from.y + d.y, z: from.z + 0   }, },
            { start: { x: from.x + 0,   y: from.y + d.y, z: from.z + 0   }, end: { x: from.x + 0,   y: from.y + d.y, z: from.z + d.z }, },

            { start: { x: from.x + 0,   y: from.y + 0,   z: from.z + d.z }, end: { x: from.x + d.x, y: from.y + 0,   z: from.z + d.z }, },
            { start: { x: from.x + 0,   y: from.y + 0,   z: from.z + d.z }, end: { x: from.x + 0,   y: from.y + d.y, z: from.z + d.z }, },

            { start: { x: to.x, y: to.y, z: to.z }, end: { x: to.x - d.x, y: to.y + 0,   z: to.z + 0   }, },
            { start: { x: to.x, y: to.y, z: to.z }, end: { x: to.x + 0,   y: to.y - d.y, z: to.z + 0   }, },
            { start: { x: to.x, y: to.y, z: to.z }, end: { x: to.x + 0,   y: to.y + 0,   z: to.z - d.z }, },
        ]
        
        return vertexes;
    }

    /**
     * @param {Player} player
     */
    PlayDepositSound(player)
    {
        player.playSound("random.pop2");
    }

    /**
     * @param {Player} player
     */
    PlayTakeSound(player)
    {
        player.playSound("random.pop");
    }

    /**
     * @param {Player} player
     */
    PlayNoTransferSound(player)
    {
        player.playSound("block.click");
    }

}