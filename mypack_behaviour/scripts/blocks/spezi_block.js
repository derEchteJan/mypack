import {
    system,
    world,
    BlockComponentPlayerInteractEvent,
    BlockInventoryComponent,
    EntityInventoryComponent,
    Container,
    Block,
    EntityItemComponent,
} from "@minecraft/server";

import utils from '../utils.js';
import Vector3 from "../vector.js";
import { log, log_err, chat } from '../logging.js';

// --- CLASS ---

/** SpeziBlockComponent
 * Custom component for the spezi wool block, implements event listeners
 * 
 * @implements {BlockCustomComponent}
 */
export default class SpeziBlockComponent {

    static componentId = "mypack:spezi_block_component"

    m_touched = false;
    m_container1 = null;
    m_container2 = null;
    m_instantVacuum = true;
    m_vacuumRange = 10;

    constructor() {
        // bind this otherwise this is null in those functions and
        // internal state cannot be used (works fine though)
        this.onStepOn = this.onStepOn.bind(this);
        this.onPlayerInteract = this.onPlayerInteract.bind(this);
    }

    /** StepOnEvent handler
     * @param {BlockComponentStepOnEvent} event 
     * @param {CustomComponentParameters} params 
     */
    onStepOn(event, params)
    {
        if(!utils.debug) return;

        const entity = event.entity;
        //let block = event.block;
        //let location = block.location;

        if(!entity) return;
        if(!entity.isValid) return;

        var displayName = entity.typeId;
        if(entity.name)
        {
            displayName = entity.name;
        }
        
        const targetSpeed = 0.2;
        const currentSpeed = entity.getVelocity();
        var pushed = false;

        if(targetSpeed > currentSpeed.x)
        {
            var vec = new Vector3();
            vec.x = targetSpeed - currentSpeed.x;
            entity.applyImpulse(vec);
            pushed = true;
        }

        system.run(() => {
            chat("speed: " + entity.getVelocity().x + (pushed ? " (pushed)" : ""));
        });
    }

    /** PlayerInteractEvent handler
     * @param {BlockComponentPlayerInteractEvent} event
     * @param {CustomComponentParameters} params
     * @returns 
     */
    onPlayerInteract(event, params)
    {
        if(!utils.debug) return;
        
        const player = event.player;

        if(!player) return;

        var selectedSlot = player.selectedSlotIndex;
        var playerInventory = player.getComponent(EntityInventoryComponent.componentId);
        var heldItem = playerInventory.container.getItem(selectedSlot);
        
        chat("holding: " + (heldItem ? heldItem.typeId : "nothing") ); 

        if(heldItem)
        {
            var itemName = heldItem.typeId;
            if(itemName === "mypack:test")
            {
                chat("vacuum test");
                //this.Vacuum(player);
            }
            if(itemName === "minecraft:diamond")
            {
                this.m_instantVacuum = true;
                chat("set vacuum to instant");
            }
            if(itemName === "minecraft:redstone")
            {
                this.m_instantVacuum = false;
                chat("set vacuum to impulse");
            }
        }
        else // empty hand
        {
        }
    }

    /** Transfers one stack of items from lhs to rhs
     * @param {Container} lhs 
     * @param {Container} rhs 
     */
    TransferBetweenContainers(lhs, rhs) {
        if (lhs === undefined || rhs === undefined) { chat("please register 2 containers"); return; }

        const size = lhs.size;
        var transferedCount = 0;
        for (var i = 0; i < size; i++) {
            if (lhs.getItem(i)) {
                lhs.transferItem(i, rhs);
                transferedCount += 1;
            }
        }
        chat("containers swapped (transfered " + transferedCount + " stacks)");
    }

    /** Registers inventory for exchange
     * @param {Container} container
     */
    RegisterContainer(container) {
        if (container) {
            if (subject1 === undefined) { subject1 = container; chat("first container registered"); return; }
            if (subject2 === undefined) { subject2 = container; chat("first container registered"); return; }
            else { chat("2 containers already registered"); return; }
        }
        else {
            chat("inventory has no container");
        }
    }
};