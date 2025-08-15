import { 
    world,
    BlockComponentPlayerInteractEvent,
    BlockInventoryComponent,
    EntityInventoryComponent,
    Container,
    Block,
    EntityItemComponent,
} from "@minecraft/server";

// --- UTILS ---

/** logs message to console and world chat
 * @param {string} message
*/
function log(message) {
    console.log("script: " + message);
    world.sendMessage("script: " + message);
}

/** logs message to world chat
 * @param {string} message
*/
function chat(message) {
    world.sendMessage("script: " + message);
}

// --- CLASS ---

/** SpeziBlockComponent
 * Custom component for the spezi wool block, implements event listeners
 * 
 * @implements {BlockCustomComponent}
 */
export default class SpeziBlockComponent {

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
    onStepOn(event, params) {
        if (event.entity && event.entity.name) {
            const bp = event.block.location;
            chat(event.entity.name + " stepped on the spezi block at " + bp.x + "," + bp.y + "," + bp.z + " touched: " + this.m_touched);
        }
        else {
            chat("stepped on spezi block (unnamed entity)");
        }
    }

    /** PlayerInteractEvent handler
     * @param {BlockComponentPlayerInteractEvent} event
     * @param {CustomComponentParameters} params
     * @returns 
     */
    onPlayerInteract(event, params) {
        if (!event.player) { chat("player interact event (no player)"); return; }
        var player = event.player;

        var selectedSlot = player.selectedSlotIndex;
        var playerInventory = player.getComponent(EntityInventoryComponent.componentId);
        var heldItem = playerInventory.container.getItem(selectedSlot);
        
        chat("holding: " + heldItem.typeId ); 

        if(heldItem)
        {
            var itemName = heldItem.typeId;
            if(itemName === "mypack:test")
            {
                chat("vacuum");
                this.Vacuum(player);
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

    /**
     * @param {Player} player 
     */
    Vacuum(player)
    {
        if(!player) return;

        const query = {
            location: player.location,
            maxDistance: this.m_vacuumRange,
            type: "minecraft:item"
        };

        var entities = player.dimension.getEntities(query);
        var inventoryContainer = player.getComponent(EntityInventoryComponent.componentId).container;
        var pickupCount = 0;

        if(this.m_instantVacuum)
        {
            entities.forEach(entity => {
                var itemComponent = entity.getComponent(EntityItemComponent.componentId);
                if(itemComponent)
                {
                    var itemStack = itemComponent.itemStack;
                    entity.kill();
                    inventoryContainer.addItem(itemStack);
                    pickupCount += 1;
                }
            });
        }
        else
        {
            const downscale = 4;

            entities.forEach(entity => {

                var to = player.location;
                var from = entity.location;

                var dx = to.x - from.x
                var dy = to.y - from.y;
                var dz = to.z - from.z;

                //chat("coords: " + " dx:"+dx+" dy:"+dy+" dz:"+dz);
                //var len = Math.sqrt(dx * dx + dy * dy);
                //len = Math.sqrt(len * len + dz * dz);

                dx /= downscale;
                dy /= downscale;
                dz /= downscale;

                entity.applyImpulse({x: dx, y: dy, z: dz});

                pickupCount += 1;
            });
        }

        chat("vacuumed up " + pickupCount + " items");
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