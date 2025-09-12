
import {
    system,
    world,
    Block,
    ItemStack,
    EntityInventoryComponent,
    BlockVolume,
    Player,
    Container,
    BlockInventoryComponent,
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


// --- DATA TYPES ---

class Vector3
{
    x = 0; y = 0; z = 0;
}

class Range3
{
    pos1 = Vector3;
    pos2 = Vector3;
}

class ContainerBlock
{
    block = Block;
    container = Container;
}


// --- CLASSES ---

class Predicates
{
    //sorting = new Sorting();

    /**
     * @param {Sorting} sorting 
     */
    constructor(sorting)
    {
        this.sorting = sorting;
    }

    /**
     * Sorts by max stack size descending
     * @param {ItemStack | null} lhs
     * @param {ItemStack | null} rhs
     * @returns {boolean}
     */
    stackSizeDesc(lhs, rhs)
    {
        if(lhs === undefined) return false;
        if(rhs === undefined) return true;
        return lhs.maxAmount >= rhs.maxAmount;
    }

    /**
     * Rturns predicate that sorts by total item amount descending
     * @param {Container} container
     * @returns {(lhs: ItemStack | null, rhs: ItemStack | null) => boolean}
     */
    totalAmountDesc(container)
    {
        var tally = this.sorting.TallyItems(container, true);
        return this.byWeighting(tally);
    }

    /**
     * Returns a predicate for a given map of itemIds to weightings
     * @param {Map<string,number>} map map of itemIds to sort weighting, e.g. from Sorting::TallyItems
     * @returns {(lhs: ItemStack | null, rhs: ItemStack | null) => boolean} predicate
     */
    byWeighting(map)
    {
        return (lhs, rhs) => {                                  // sort order:
            if(lhs === undefined) return false;                 // empty slot: to back
            if(rhs === undefined) return true;
            var amountL = map.get(lhs.typeId);
            var amountR = map.get(rhs.typeId)
            if(!amountL) return false;                          // types not in map: to back
            if(!amountR) return true;
            if(amountL !== amountR) return amountL > amountR;   // higher total amount per type to front
            if(lhs.typeId === rhs.typeId) 
                return lhs.amount > rhs.amount;                 // higher amount within same type to front
            return lhs.typeId.localeCompare(rhs.typeId) < 0;    // alphabetical ascending
        };
    }
}


/**
 * Item sorting handler class, used by sort_rod and sorter
 */
export default class Sorting {

    // Constants
    m_rangeVert = 5;            // vertical container search range diameter
    m_rangeHor = 15;            // horizontal container search range diameter
    m_rangeVertOffset = -1;     // vertical range offset from origin.y
    m_maxContainerCount = 50;   // max containers iterated over in search range before aborting      
    m_containerBlockTypes =     // types of container blocks considered for transfering items
        [ "minecraft:chest", "minecraft:barrel" ]

    predicates = new Predicates(this);

    /** Transfers items from players inventory to/from nearby containers
     * @param {Player} player subject player
     * @param {Vector3} origin container search area center
     * @param {boolean} deposit deposit / take
     */
    TransferToContainers(player, origin, deposit) {
        if (!player) return;

        const dimension = player.dimension;
        
        var didTransfer = false;

        this.TransferBeginMessage(player, deposit);

        var range = this.GetRange(origin);

        var containerBlocks = this.GetContainersInRange(range, dimension);
        for (var containerBlock of containerBlocks)
        {
            if (deposit) didTransfer = this.DepositToContainer(player, containerBlock.container);
            else         didTransfer = this.TakeFromContainer(player, containerBlock.container);
        }
        if (didTransfer)
            this.PlayDepositSound(player);
        else
            this.PlayNoTransferSound(player);
    }

    /**
     * Deposits item stacks from given hopper to containers in search range around origin
     * @param {Block} hopper hopper block
     * @param {Vector3} origin origin position of search range
     */
    DepositFromHopper(hopper, origin)
    {
        const dimension = hopper.dimension;
        
        if(hopper.typeId !== "minecraft:hopper") return;
        
        var container = hopper.getComponent(BlockInventoryComponent.componentId).container;
        if(!container) return;

        const range = this.GetRange(origin);

        var containerBlocks = this.GetContainersInRange(range, dimension);

        for (var containerBlock of containerBlocks)
        {
            this.DepositContainerToContainer(container, containerBlock.container);
        }
    }

    /**
     * Highlights sorting range around given origin block
     * and containers found in range with particles
     * @param {Block} block origin position block
     */
    HighlightSortingRange(block)
    {
        const origin = block.location;
        const dimension = block.dimension;

        var range = this.GetRange(origin);
        this.HighlightRange(dimension, range.pos1, range.pos2);

        var containerBlocks = this.GetContainersInRange(range, dimension);
        for(var containerBlock of containerBlocks)
        {
            this.HighlightContainer(containerBlock.block);
        }
    }

    /**
     * Returns available Blocks/Containers in given range
     * @param {Range3} range
     * @param {Dimension} dimension
     * @returns {[ContainerBlock]} list of ContainerBlocks [{ block: Block, container: Container }]
     */
    GetContainersInRange(range, dimension)
    {
        var results = [];

        const searchVolume = new BlockVolume(range.pos1, range.pos2);
        const searchFilter = {
            includeTypes: this.m_containerBlockTypes
        }

        var blockList = dimension.getBlocks(searchVolume, searchFilter, /*allowUnloadedChunks:*/ false);
        var blockIterator = blockList.getBlockLocationIterator();

        var count = 0;
        var maxCount = this.m_maxContainerCount;

        for (var blockPos of blockIterator) {
            var block = dimension.getBlock(blockPos);
            var inventory = block.getComponent(BlockInventoryComponent.componentId);
            if (inventory && inventory.container) {
                results.push({ block: block, container: inventory.container});
                count += 1;
            }
            if(count >= maxCount) break;
        }

        return results;
    }

    // --- SORTING CONTAINERS ---

    /**
     * Tallies total amount of each item in given contianer
     * and returns result of a map consisitng of itemIds <-> total amounts
     * @param {Container} container subject
     * @param {boolean | null} sorted optional, sort by total amount?, true = desc, false = asc
     * @returns { Map<string,number> }
     */
    TallyItems(container, sorted)
    {
        var results = new Map();
        const slots = container.size;
        for(var i = 0; i < slots; i++)
        {
            var stack = container.getItem(i);
            if(stack)
            {
                var key = stack.typeId;
                var value = results.get(key);
                if(value)
                    results.set(key, results.get(key) + stack.amount);
                else
                    results.set(key, stack.amount);
            }
        }

        // filter by amount decending
        if(sorted === true)
            results = new Map([...results].sort((lhs, rhs) => { return rhs[1] - lhs[1]; }));
        if(sorted === false)
            results = new Map([...results].sort((lhs, rhs) => { return lhs[1] - rhs[1]; }));

        //chat("tally:");
        //results.forEach((value, key) => {
        //    chat(key + " : " + value);
        //});

        return results;
    }

    /**
     * Compacts / Stacks together stackable items in a given container
     * @param {Container} container container to compact
     */
    CompactItems(container)
    {
        const slots = container.size;

        // compact stacks
        for(var i = 0; i < slots; i++)
        {
            var stack = container.getItem(i);
            if(!stack) continue;
            if(stack.amount < stack.maxAmount)
            {
                var capLeft = stack.maxAmount - stack.amount;
                
                for(var ii = 0; ii < slots; ii++)
                {
                    if(ii === i) continue;
                    var otherStack = container.getItem(ii);
                    if(!otherStack) continue;
                    if(!otherStack.isStackableWith(stack)) continue;

                    var transferAmount = capLeft;
                    if(transferAmount > otherStack.amount) transferAmount = otherStack.amount;
                    var leftAmount = otherStack.amount - transferAmount;
                    capLeft -= transferAmount;
                    var newAmount = stack.amount + transferAmount;

                    var stack = stack.clone();
                    stack.amount = newAmount
                    if(leftAmount > 0)
                    {
                        otherStack = otherStack.clone();
                        otherStack.amount = leftAmount;
                    }
                    else 
                        otherStack = null;

                    container.setItem(i, stack);
                    container.setItem(ii, otherStack);

                    if(capLeft === 0) break;
                }
            }
        }

        // move stacks to front
        for(var i = 0; i < slots; i++)
        {
            var stack = container.getItem(i);
            if(!stack) continue;
            var emptySlot = null;
            for(var ii = 0; ii < i; ii++)
            {
                if(!container.getItem(ii)) { emptySlot = ii; break; }
            }
            if(emptySlot)
            {
                container.swapItems(i, emptySlot, container);
            }
        }
    }

    /**
     * Sorts container inventory by given predicate
     * @param {Container} container container to be sorted
     * @param {(lhs: ItemStack | null, rhs: ItemStack | null) => boolean} predicate should return false if lhs and rhs should be swapped in their order
     * @param {Player | null} player actor for feedback, optional
     */
    SortContainerBy(container, predicate, player)
    {
        const slots = container.size;
        for(var repeats = 0; repeats < slots; repeats++)
        {
            var anySwapped = false;
            for(var i = 0; i < slots - 1; i++)
            {
                var lhs = container.getItem(i);
                var rhs = container.getItem(i + 1);
                var swap = !predicate(lhs, rhs);
                if(swap === true)
                {
                    container.swapItems(i, i + 1, container);
                    anySwapped = true;
                }
            }
            if(!anySwapped) break;
        }
    }


    // --- PRIVATE METHODS ---

    /** PRIVATE METHOD
     * 
     * Transfers items from given container to the players
     * inventory if it already contains a non-full stack of the
     * same item.
     * 
     * Only stackable items are considered.
     * 
     * Additionally displays an info chat message to the player.
     * 
     * @param {Player} player subject player
     * @param {Container} container block container
     * @returns {boolean} any items were transfered
     */
    TakeFromContainer(player, container) {
        
        //chat("taking from container");

        var result = false;
        var inventory = player.getComponent(EntityInventoryComponent.componentId).container;

        for (var ii = 0; ii < inventory.size; ii++) {
            var iItem = inventory.getItem(ii);

            if (iItem && iItem.isStackable) {
                var countLeft = iItem.maxAmount - iItem.amount;
                var takenAmount = 0;

                //chat("trying to take to " + iItem.typeId);

                for (var ci = 0; ci < container.size && countLeft > 0; ci++) {
                    var cItem = container.getItem(ci);

                    if (cItem && cItem.typeId === iItem.typeId && cItem.isStackableWith(iItem)) {
                        var subtractAmount = cItem.amount;
                        if (subtractAmount > countLeft) subtractAmount = countLeft;

                        countLeft -= subtractAmount;
                        takenAmount += subtractAmount;

                        var newCItemAmount = cItem.amount - subtractAmount;
                        if (newCItemAmount > 0) {
                            var newCItem = cItem.clone();
                            newCItem.amount = newCItemAmount;
                            container.setItem(ci, newCItem);
                            ci -= 1;
                        }
                        else {
                            container.setItem(ci, null);
                        }
                    }
                }

                if (takenAmount > 0) {
                    var newIItem = iItem.clone();
                    newIItem.amount = iItem.maxAmount - countLeft;
                    inventory.setItem(ii, newIItem);
                    result = true;

                    //chat("taken " + iItem.typeId + " (" + takenAmount + "x)");

                    this.TransferMessage(player, iItem.typeId, takenAmount, iItem.localizationKey);
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
        var result = false;
        var inventory = player.getComponent(EntityInventoryComponent.componentId).container;

        result = this.DepositContainerToContainer(inventory, container, player);

        return result;
    }

    /**
     * @param {Container} source
     * @param {Container} dest
     * @param {Player | null} player optional player for message feedback
     * @returns {boolean} any stacks transfered
     */
    DepositContainerToContainer(source, dest, player) {
        var result = false;

        for (var ii = 0; ii < source.size; ii++) {
            var iItem = source.getItem(ii);

            if (iItem && iItem.isStackable) {

                //chat("trying to deposit " + iItem.typeId);

                var countLeft = iItem.amount;
                var takenAmount = 0;

                for (var ci = 0; ci < dest.size && countLeft > 0; ci++) {
                    var cItem = dest.getItem(ci);
                    if (cItem && cItem.typeId === iItem.typeId && cItem.isStackableWith(iItem)) {
                        var subtractAmount = countLeft;
                        if (subtractAmount > cItem.maxAmount - cItem.amount) subtractAmount = cItem.maxAmount - cItem.amount;

                        countLeft -= subtractAmount;
                        takenAmount += subtractAmount;
                        var newAmount = cItem.amount + subtractAmount;

                        var newCItem = cItem.clone();
                        newCItem.amount = newAmount;
                        dest.setItem(ci, newCItem);

                        //chat("setting " + cItem.typeId + " at slot " + ci + " from " + cItem.amount + " to " + newAmount);
                    }
                }

                // deposit remainder into free slot

                if (takenAmount > 0 && countLeft > 0) {
                    for (var ci = 0; ci < dest.size && countLeft > 0; ci++) {
                        var cItem = dest.getItem(ci);
                        if (!cItem) {
                            var newCItem = iItem.clone();
                            newCItem.amount = countLeft;
                            takenAmount += countLeft;
                            countLeft = 0;
                            dest.setItem(ci, newCItem);
                        }
                    }
                }

                if (takenAmount > 0) {
                    if (countLeft > 0) {
                        var newIItem = iItem.clone();
                        newIItem.amount = countLeft;
                        source.setItem(ii, newIItem);
                        ii -= 1;
                    }
                    else {
                        source.setItem(ii, null);
                    }
                    //chat("deposited " + iItem.typeId + " (" + takenAmount + "x)");

                    if(player)
                        this.TransferMessage(player, iItem.typeId, -1 * takenAmount, iItem.localizationKey);

                    result = true;
                }
                //chat("didnt deposit " + iItem.typeId);
            }
        }

        return result;
    }

    /** PRIVATE METHOD
     * 
     * Returns container block search range around the given position
     * @param {Vector3} origin block position
     * @returns {Range3} Range3: search range
     */
    GetRange(origin)
    {
        const pos1 = {
            x: Math.floor(origin.x - this.m_rangeHor / 2),
            y: Math.floor(origin.y + this.m_rangeVertOffset),
            z: Math.floor(origin.z - this.m_rangeHor / 2)
        };
        const pos2 = {
            x: Math.floor(origin.x + this.m_rangeHor / 2),
            y: Math.floor(origin.y + this.m_rangeVert + this.m_rangeVertOffset),
            z: Math.floor(origin.z + this.m_rangeHor / 2)
        };
        return { pos1: pos1, pos2: pos2 };
    }

    /**
     * @param {Vector3} pos1 
     * @param {Vector3} pos2 
     */
    PrintRange(pos1, pos2) {
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
     * 
     * @param {Block} block range origin block
     * @param {Player} player subject player
     */
    ListContainersInSortingRange(block, player)
    {
        const origin = block.location;
        const dimension = block.dimension;

        var range = this.GetRange(origin);
        var containers = this.GetContainersInRange(range, dimension);
        this.ContainerCountMessage(player, containers.length);
    }

    /**
     * @param {Player} player target player
     * @param {Vector3} from area start pos
     * @param {Vector3} to area end pos
     */
    HighlightRange(player, from, to) {
        var vertexes = this.GetCubeBoundaryVertexes(from, to);
        for (var vertex of vertexes) {
            this.HighlightVertex(player, vertex.start, vertex.end);
        }
    }

    /**
     * @param {Dimension} dimension target dimension for particles
     * @param {Vector3} from vertex start pos
     * @param {Vector3} to vertex end pos
     */
    HighlightVertex(dimension, from, to) {
        const intervals = 8;
        const particleType = "minecraft:endrod"; // enum list see: https://wiki.bedrock.dev/particles/vanilla-particles

        var pos = {
            x: from.x,
            y: from.y,
            z: from.z
        }

        var dx = (to.x - from.x) / intervals;
        var dy = (to.y - from.y) / intervals;
        var dz = (to.z - from.z) / intervals;

        for (var i = 0; i < intervals + 1; i++) {
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
    GetCubeBoundaryVertexes(from, to) {
        const d = {
            x: to.x - from.x,
            y: to.y - from.y,
            z: to.z - from.z,
        }

        var vertexes = [
            { start: { x: from.x, y: from.y, z: from.z }, end: { x: from.x + d.x, y: from.y + 0, z: from.z + 0 }, },
            { start: { x: from.x, y: from.y, z: from.z }, end: { x: from.x + 0, y: from.y + d.y, z: from.z + 0 }, },
            { start: { x: from.x, y: from.y, z: from.z }, end: { x: from.x + 0, y: from.y + 0, z: from.z + d.z }, },

            { start: { x: from.x + d.x, y: from.y + 0, z: from.z + 0 }, end: { x: from.x + d.x, y: from.y + d.y, z: from.z + 0 }, },
            { start: { x: from.x + d.x, y: from.y + 0, z: from.z + 0 }, end: { x: from.x + d.x, y: from.y + 0, z: from.z + d.z }, },

            { start: { x: from.x + 0, y: from.y + d.y, z: from.z + 0 }, end: { x: from.x + d.x, y: from.y + d.y, z: from.z + 0 }, },
            { start: { x: from.x + 0, y: from.y + d.y, z: from.z + 0 }, end: { x: from.x + 0, y: from.y + d.y, z: from.z + d.z }, },

            { start: { x: from.x + 0, y: from.y + 0, z: from.z + d.z }, end: { x: from.x + d.x, y: from.y + 0, z: from.z + d.z }, },
            { start: { x: from.x + 0, y: from.y + 0, z: from.z + d.z }, end: { x: from.x + 0, y: from.y + d.y, z: from.z + d.z }, },

            { start: { x: to.x, y: to.y, z: to.z }, end: { x: to.x - d.x, y: to.y + 0, z: to.z + 0 }, },
            { start: { x: to.x, y: to.y, z: to.z }, end: { x: to.x + 0, y: to.y - d.y, z: to.z + 0 }, },
            { start: { x: to.x, y: to.y, z: to.z }, end: { x: to.x + 0, y: to.y + 0, z: to.z - d.z }, },
        ]

        return vertexes;
    }


    // --- USER FEEDBACK ---

    /** Plays successfull deposit transfer sound to player
     * @param {Player} player
     */
    PlayDepositSound(player) {
        player.playSound("random.pop2");
    }

    /** Plays successfull take transfer sound to player
     * @param {Player} player
     */
    PlayTakeSound(player) {
        player.playSound("random.pop");
    }

    /** Plays deposit sound to player when nothing was transfered
     * @param {Player} player
     */
    PlayNoTransferSound(player) {
        player.playSound("block.click");
    }

    /**
     * Sends translated headline message to player before transfered items are listed
     * @param {Player} player 
     * @param {boolean} deposit 
     */
    TransferBeginMessage(player, deposit)
    {
        var title = deposit ? "Depositing" : "Taking";
        const rawMessage = { rawtext: [ { text: "§7" + title + "§r" } ] };
        player.sendMessage(rawMessage);
    }

    /**
     * Sends translated message to player representing a transfered item + amount
     * @param {Player} player
     * @param {string} itemId
     */
    TransferMessage(player, itemId,  amount, localizationId) // <- doesnt work either..
    {
        var colorToken = amount > 0 ? "§2" : "§c";
        var translationId = this.GetItemTranslationKey(itemId);
        const rawMessage = { rawtext: [ { text: "" + colorToken + amount + "x§r " }, { translate: translationId } ] };
        player.sendMessage(rawMessage);
    }

    /**
     * @param {Player} player 
     * @param {number} count 
     */
    ContainerCountMessage(player, count)
    {
        const rawMessage = { rawtext: [ { text: "§7Linked§r " }, { text: "§3" + count + "§r " }, { text: "§7Containers§r" } ] };
        player.sendMessage(rawMessage);
    }

    /**
     * Sends tally result chat message to given player
     * @param {Player} player message target
     * @param {Map<string,number>} map tally data, a map of itemIds <-> total amounts
     * @see Sorting.TallyItems
     */
    TallyMessage(player, map)
    {
        map.forEach((amount, itemId) => {
            var translationId = this.GetItemTranslationKey(itemId);
            const rawMessage = { rawtext: [ { text: "§7 - " }, { translate: translationId }, { text: "§r§3 x" + amount + "§r" } ] };
            player.sendMessage(rawMessage);
        });
    }

    /**
     * Translates typeId to translationId e.g. for raw message translate
     * TODO: this doesnt work properly for some item types, find out why and fix it
     * @param {string} itemId item typeId
     * @returns {string}
     */
    GetItemTranslationKey(itemId)
    {
        var translationId = (itemId.startsWith("minecraft:") ? itemId.substring("minecraft:".length) : itemId);
        translationId = "tile." + translationId + ".name";
        return translationId;
    }

    /** 
     * Highlights (container) block with particle effects on
     * each side
     * @param {Block} block 
     */
    HighlightContainer(block)
    {
        const dimension = block.dimension;
        const particleType = "minecraft:blue_flame_particle";

        var p1 = block.location;
        var p2 = block.location;
        var p3 = block.location;
        var p4 = block.location;

        p1.x += 0.55;
        p2.z += 0.55;
        p3.x += 0.55;
        p4.z += 0.55;

        p3.z += 1;
        p4.x += 1;

        p1.y += 0.5;
        p2.y += 0.5;
        p3.y += 0.5;
        p4.y += 0.5;

        dimension.spawnParticle(particleType, p1, null);
        dimension.spawnParticle(particleType, p2, null);
        dimension.spawnParticle(particleType, p3, null);
        dimension.spawnParticle(particleType, p4, null);
    }
}