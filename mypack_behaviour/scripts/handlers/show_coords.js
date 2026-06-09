
import {
    system, 
    world,
    Dimension,
    Entity,
    Player,
    EntityComponentTypes,
    EquipmentSlot,
    PlayerHotbarSelectedSlotChangeAfterEvent,
    ItemStartUseAfterEvent,
    ItemStopUseAfterEvent
} from "@minecraft/server"

import { chat } from '../logging.js'

const s_updateInterval = 3;

/** ShowCoords handler class,
 *  Displays coordinates to players while they hold certain items like maps
 */
export default class ShowCoords {

    constructor()
    {
    }

    static UpdatePlayers() {
        world.getPlayers().forEach((player) => {
            if(player.showPosition)
            {
                ShowCoords.DisplayPosition(player);
            }
            if(player.showDistance)
            {
                ShowCoords.DisplayDistance(player);
            }
        });
    }

    /** Display position to given player
     * @param {Player} player 
     */
    static DisplayPosition(player)
    {
        var px = Math.round(player.location.x - 0.5);
        var py = Math.round(player.location.y - 0.5);
        var pz = Math.round(player.location.z - 0.5);
        var text = "x:" + px + " y:" + py + " z:" + pz;
        world.getDimension("overworld").runCommand("title \"" + player.name + "\" actionbar " + text);
    }

    static DisplayDistance(player)
    {
        const hit = player.getBlockFromViewDirection();
        if(hit && hit.block)
        {
            const block = hit.block;

            var px = Math.round(player.location.x - 0.5);
            var py = Math.round(player.location.y - 0.5);
            var pz = Math.round(player.location.z - 0.5);

            var bx = Math.round(block.location.x - 0.5);
            var by = Math.round(block.location.y - 0.5);
            var bz = Math.round(block.location.z - 0.5);

            var dx = /*Math.round*/(bx - px);
            var dy = /*Math.round*/(by - py);
            var dz = /*Math.round*/(bz - pz);

            var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            d = Math.round(d * 10) / 10;

            var text = "d:" + d + " (dx:" + dx + " dy:" + dy + " dz:" + dz + ")"
            world.getDimension("overworld").runCommand("title \"" + player.name + "\" actionbar " + text);
        }
    }

    /**
     * @param {Player} player 
     */
    static BeginDisplayDistance(player)
    {
        player.showDistance = true;
    }

    /**
     * @param {Player} player 
     */
    static BeginDisplayPosition(player)
    {
        player.showPosition = true;
    }

    /**
     * @param {Player} player 
     */
    static StopDisplayAny(player)
    {
        player.showPosition = false;
        player.showDistance = false;
        world.getDimension("overworld").runCommand("title \"" + player.name + "\" reset"); // does nothing, great
        world.getDimension("overworld").runCommand("title \"" + player.name + "\" clear");
    }

    /**
     * Returns wether given item id qualifies as a navigation item
     * that shows coords when held
     * @param {string} itemId 
     */
    static IsNavItem(itemId)
    {
        return itemId === "minecraft:filled_map"
            || itemId === "minecraft:compass"
            || itemId === "minecraft:lodestone_compass"
            || itemId === "minecraft:recovery_compass"
    }

    /**
     * @param {PlayerHotbarSelectedSlotChangeAfterEvent} event 
     * @param {object} params
     */
    static OnHeldItemChanged(event, params)
    {
        const player = event.player;
        if(event.itemStack)
        {
            const itemId = event.itemStack.typeId;
            if(ShowCoords.IsNavItem(itemId))
            {
                ShowCoords.BeginDisplayPosition(player);
            }
            else
            {
                ShowCoords.StopDisplayAny(player);
            }
        }
        else
        {
            ShowCoords.StopDisplayAny(player);
        }
    }

    /**
     * @param {ItemStartUseAfterEvent} event 
     * @param {object} params
     */
    static OnItemStartUse(event, params)
    {
        const player = event.source;
        const itemId = event.itemStack.typeId;
        if(itemId === 'minecraft:spyglass')
        {
            ShowCoords.BeginDisplayDistance(player);
        }
    }

    /**
     * @param {ItemStopUseAfterEvent} event 
     * @param {object} params
     */
    static OnItemStopUse(event, params)
    {
        if(!event.itemStack) return;
        const player = event.source;
        const itemId = event.itemStack.typeId;
        if(itemId === 'minecraft:spyglass')
        {
            ShowCoords.StopDisplayAny(player);
        }
    }

    RegisterHandlers()
    {
        system.runInterval(ShowCoords.UpdatePlayers, s_updateInterval);
        world.afterEvents.playerHotbarSelectedSlotChange.subscribe(ShowCoords.OnHeldItemChanged);
        world.afterEvents.itemStartUse.subscribe(ShowCoords.OnItemStartUse);
        world.afterEvents.itemStopUse.subscribe(ShowCoords.OnItemStopUse);
    }
}