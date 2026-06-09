
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
    MolangVariableMap
} from "@minecraft/server";

import { log, log_err, chat } from '../logging.js'
import utils from '../utils.js'


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


// --- SUBCLASSES ---

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

// --- HANDLER CLASS ---

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
        [ "minecraft:chest", "minecraft:barrel" ];

    // Members
    predicates = new Predicates(this);
    m_message = null;

    /** Transfers items from players inventory to/from nearby containers
     * @param {Player} player subject player
     * @param {Vector3} origin container search area center i.e. the location of the sorter block
     * @param {boolean} deposit deposit / take
     */
    TransferToContainers(player, origin, deposit) {
        if (!player) return;
        const dimension = player.dimension;
        var didTransferAny = false;
        var range = this.GetRange(origin);
        var containerBlocks = this.GetContainersInRange(range, dimension);
        for (var containerBlock of containerBlocks)
        {
            var didTransfer = false;
            if (deposit) didTransfer = this.DepositToContainer(player, containerBlock.container);
            else         didTransfer = this.TakeFromContainer(player, containerBlock.container);
            if(didTransfer) this.HighlightContainer(containerBlock.block);
            didTransferAny |= didTransfer;
        }
        if (didTransferAny)
        {
            this.TransferBeginMessage(player, deposit);
            if(deposit)
            {
                this.PlayDepositSound(player, origin);
            }
            else
            {
                this.PlayTakeSound(player, origin);
            }
        }
        else
        {
            this.PlayNoTransferSound(player, origin);
        }
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

        var blockList = dimension.getBlocks(searchVolume, searchFilter, /*allowUnloadedChunks:*/ true);
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
                    results.set(key, { amount: results.get(key) + stack.amount, localizationKey: stack.localizationKey });
                else
                    results.set(key, { amount: stack.amount, localizationKey: stack.localizationKey });
            }
        }

        // filter by amount decending
        if(sorted === true)
            results = new Map([...results].sort((lhs, rhs) => { return rhs[1].amount - lhs[1].amount; }));
        if(sorted === false)
            results = new Map([...results].sort((lhs, rhs) => { return lhs[1].amount - rhs[1].amount; }));

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

                    this.TransferMessage(player, iItem.localizationKey, takenAmount);
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

    /** Swaps contents of both given containers
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

                    if(player)
                        this.TransferMessage(player, iItem.localizationKey, -1 * takenAmount, iItem.localizationKey);

                    result = true;
                }
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
     * @param {Player} player target to play sound to
     * @param {Vector3 | null} location optional location to eminate from
     */
    PlayDepositSound(player, location) {
        var options =
        {
            location: location
        };
        player.playSound("random.pop2", options);
    }

    /** Plays successfull take transfer sound to player
     * @param {Player} player target to play sound to
     * @param {Vector3 | null} location optional location to eminate from
     */
    PlayTakeSound(player, location) {
        var options =
        {
            pitch: 1.5,
            volume: 0.3,
            location: location
        };
        player.playSound("random.pop", options);
    }

    /** Plays deposit sound to player when nothing was transfered
     * @param {Player} player target to play sound to
     * @param {Vector3 | null} location optional location to eminate from
     */
    PlayNoTransferSound(player, location)
    {
        var options =
        {
            volume: 0.4,
            location: location
        };
        player.playSound("block.click", options);
    }

    /**
     * Sends translated headline message to player before transfered items are listed
     * 
     * messages are accumulated in m_message instead to be sent collectively 
     * at the end via MessageEnd()
     * @param {Player} player 
     * @param {boolean} deposit 
     */
    TransferBeginMessage(player, deposit)
    {
        var title = deposit ? "Deposited Items:" : "Took Items:";
        this.m_message.rawtext.unshift({ text: "§7" + title + "§r\n" });
    }

    /**
     * Sends translated message to player representing a transfered item + amount
     * 
     * messages are accumulated in m_message instead to be sent collectively 
     * at the end via MessageEnd()
     * @param {Player} player
     * @param {string} itemId
     */
    TransferMessage(player, itemId,  amount)
    {
        var colorToken = amount > 0 ? "§3" : "§c";
        this.m_message.rawtext.push({ text: "§7 - " });
        this.m_message.rawtext.push({ translate: itemId });
        this.m_message.rawtext.push({ text: " " + colorToken + amount + "x§r\n" });
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
     * @param {Map<string, { amount: number, localizationKey: string }>} map tally data, a map of itemIds <-> { amount, locId }
     * @see Sorting.TallyItems
     */
    TallyMessage(player, map)
    {
        map.forEach((value, key) => {
            const amount = value.amount;
            const translationId = value.localizationKey;
            const rawMessage = { rawtext: [ { text: "§7 - " }, { translate: translationId }, { text: "§r§3 x" + amount + "§r" } ] };
            player.sendMessage(rawMessage);
        });
    }

    /** Begins collecting raw messages
     */
    MessageBegin()
    {
        this.m_message = { rawtext: [] };
    }

    /** Stop collecting raw messages and send accumulated to player
     * @param {Player} player optoinal message receiver
     */
    MessageEnd(player)
    {
        if(this.m_message.rawtext.length != 0)
        {
            (player ? player : world).sendMessage(this.m_message);
        }
        this.m_message = null;
    }

    /** 
     * Highlights (container) block with particle effects on
     * each side
     * @param {Block} block 
     */
    HighlightContainer(block)
    {
        const dimension = block.dimension;
        //const particleType = "minecraft:blue_flame_particle";
        const particleType = "minecraft:colored_flame_particle";

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

        var molang = new MolangVariableMap();
        molang.setColorRGB('variable.color', { red: 0, green: 0xAA/0xFF, blue: 0xAA/0xFF }); // TODO: move to utils if reuse required

        dimension.spawnParticle(particleType, p1, molang);
        dimension.spawnParticle(particleType, p2, molang);
        dimension.spawnParticle(particleType, p3, molang);
        dimension.spawnParticle(particleType, p4, molang);
    }
}