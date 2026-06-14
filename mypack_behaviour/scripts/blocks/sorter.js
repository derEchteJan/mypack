import {
    system,
    world,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerInteractEvent,
    BlockComponentTickEvent,
    EntityComponentTypes,
    EquipmentSlot,
    BlockInventoryComponent
} from "@minecraft/server";

import { log, log_err, chat } from '../logging.js'
import Sorting from "../handlers/sorting.js"


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
        this.onTick = this.onTick.bind(this);
    }

    /** PlayerInteractEvent handler
     * @param {BlockComponentPlayerInteractEvent} event
     * @param {CustomComponentParameters} params
     */
    onPlayerInteract(event, params) {
        const player = event.player;
        const origin = event.block.location;
        const sorting = this.m_sorting;
        
        if(!player) return;
        if(this.IsHoldingSortRod(player)) return; // Sort rod handles special interaction

        const deposit = !player.isSneaking;
        sorting.MessageBegin();
        sorting.TransferToContainers(player, origin, deposit);
        sorting.MessageEnd(player);
    }

    /** OnPlaceEvent handler
     * @param {BlockComponentOnPlaceEvent} event 
     * @param {CustomComponentParameters} params 
     */
    onPlace(event, params)
    {
        const sorting = this.m_sorting;
        sorting.HighlightSortingRange(event.block);
        const closestPlayer = event.dimension.getPlayers({ closest: 1, location: event.block.location }).at(0);
        if(!closestPlayer || !closestPlayer.isValid) return;
        sorting.ListContainersInSortingRange(event.block, closestPlayer);
    }

    /**
     * @param {BlockComponentTickEvent} event
     * @param {CustomComponentParameters} params
     */
    onTick(event, params)
    {
        const block = event.block;
        const origin = block.location;
        const sorting = this.m_sorting;

        const tick = system.currentTick;
        const dir = tick % 4;

        var blocks = [ block.north(1), block.east(1), block.south(1), block.west(1) ];
        var facingDirs = [ 3, 4, 2, 5 ];
        var hopper = blocks.at(dir);

        if(hopper && hopper.isValid && hopper.typeId === "minecraft:hopper")
        {
            var container = hopper.getComponent(BlockInventoryComponent.componentId).container;
            if(!container) return;

            var hopperDir = hopper.permutation.getState("facing_direction");
            var isFacingTowards = facingDirs.at(dir) === hopperDir;
            if(isFacingTowards)
            {
                sorting.DepositFromHopper(hopper, origin);
            }
        }
    }

    /**
     * @param { Player } player
     * @returns { boolean }
     */
    IsHoldingSortRod(player)
    {
        const equipment = player.getComponent(EntityComponentTypes.Equippable);
        if (equipment)
        {
            var mainHand = equipment.getEquipment(EquipmentSlot.Mainhand);
            if (mainHand)
            {
                return mainHand.typeId === "mypack:sort_rod";
            }
        }
        return false;
    }
}