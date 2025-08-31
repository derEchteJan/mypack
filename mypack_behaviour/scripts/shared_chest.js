import { 
    world,
    system,
    BlockComponentPlayerInteractEvent,
    BlockInventoryComponent,
    EntityInventoryComponent,
    Container,
    Block,
    ItemStack,
    EntityEquippableComponent,
    EquipmentSlot,
    BlockVolume
} from "@minecraft/server";

function log(message) {
  //console.log(message);
  //world.sendMessage(message);
}

function chat(message) {
  //world.sendMessage(message);
}

function logErr(message)
{
    console.log("error: " + message);
    world.sendMessage("error: " + message);
}

var s_linkedContainer = null;
var s_cooldownTicks = 6; // prevent spamming
var s_cooldownLastTick = -1;

/** SharedChestComponent handler
 * @implements {BlockCustomComponent}
 */
export default class SharedChestComponent {

    constructor() {
        this.onPlayerInteract = this.onPlayerInteract.bind(this);
    }

    /** PlayerInteractEvent handler
     * @param {BlockComponentPlayerInteractEvent} event
     * @param {CustomComponentParameters} params
     */
    onPlayerInteract(event, params) {
        
        if(!this.CheckCooldown()) return;

        var player = event.player;
        var block = event.block;

        var selectedSlot = player.selectedSlotIndex;
        var playerInventory = player.getComponent(EntityInventoryComponent.componentId);
        var heldItem = playerInventory.container.getItem(selectedSlot);

        var linkedContainer = this.GetSharedContainer();
        if(!linkedContainer) { logErr("linkedContainer is null"); return; }

        if(heldItem)
        {
            
                // player is holding any item other than test: transfer it to the target container

                chat("attempting to insert item " + heldItem.typeId);

                if(linkedContainer)
                {
                    var addResult = linkedContainer.addItem(heldItem);
                    if(addResult === undefined)
                    {
                        var equipment = player.getComponent(EntityEquippableComponent.componentId);
                        equipment.setEquipment(EquipmentSlot.Mainhand, null);
                        this.PlayInsertSound(player, block, linkedContainer);
                    }
                    else
                    {
                        chat("container is full!");
                        this.PlayFullSound(player, block);
                    }
                }
                else
                {
                    logErr("no container linked, cant insert"); return;
                }
        }
        else
        {
            // player isnt holding an item: transfer itens from target container to the player

            chat("attempting to retrieve item");
            if(linkedContainer)
            {
                var didTake = false;
                for(var i = linkedContainer.size - 1; i >= 0; i--)
                {
                    var itemStack = linkedContainer.getItem(i);
                    if(itemStack)
                    {
                        chat("retrieving: " + itemStack.typeId);

                        if(player.isSneaking)
                        {
                            var dropLocation = block.location;
                            var offset = { x: 0.5, y: 1.0, z: 0.5 };
                            dropLocation.x += offset.x;
                            dropLocation.y += offset.y;
                            dropLocation.z += offset.z;

                            var droppedStack = player.dimension.spawnItem(itemStack, dropLocation);
                            droppedStack.applyImpulse({x: 0, y: 0.1, z: 0 });

                            linkedContainer.setItem(i, null);
                            didTake = true;
                        }
                        else
                        {
                            var equipment = player.getComponent(EntityEquippableComponent.componentId);
                            var didSet = equipment.setEquipment(EquipmentSlot.Mainhand, itemStack);
                            if(didSet)
                            {
                                linkedContainer.setItem(i, null);
                                didTake = true;
                            }
                        }
                        //s_linkedContainer.transferItem(i, playerInventory.container); <-- removed
                        break;
                    }
                }
                if(!didTake) this.PlayEmptySound(player, block);
                else this.PlayRemoveSound(player, block);
            }
            else
            {
                logErr("no container linked, cant retrieve"); return;
            }
        }
    }

    /**
     * @return {boolean}
     */
    CheckCooldown()
    {
        var tick = system.currentTick;
        if(s_cooldownLastTick === -1 || (tick - s_cooldownLastTick) >= s_cooldownTicks)
        {
            s_cooldownLastTick = tick;
            return true;
        }
        return false;
    }

    /**
     * @returns {Container}
     */
    GetSharedContainer()
    {
        if(!s_linkedContainer)
        {
            const magicCoords = { x: 0, y: -64, z: 0 };

            var dimension = world.getDimension("overworld");
            var block = dimension.getBlock(magicCoords);
            var inventory = block.getComponent(BlockInventoryComponent.componentId);
            if(inventory && inventory.container)
            {
                chat("set shared container")
                s_linkedContainer = inventory.container;
            }
            else
            {
                const fillVolume = new BlockVolume(magicCoords, magicCoords);
                dimension.fillBlocks(fillVolume, "minecraft:hopper", null);
                chat("created shared container block");
                s_linkedContainer = this.GetSharedContainer();
            }
        }

        return s_linkedContainer;
    }

    /** Plays insert sound for player, at block location and with pitch scaled
     *  with the fill level of the shared container
     * @param {Player} player
     * @param {Block} block
     * @param {Container} container
     */
    PlayInsertSound(player, block, container)
    {
        var pitchRangeMax = 1;
        var pitchRangeMin = 0.5;
        var size = container.size;
        var free = container.emptySlotsCount;
        var pitch = pitchRangeMin + (pitchRangeMax - pitchRangeMin) * ((size - free) / size);
        player.playSound("block.decorated_pot.insert", { location: block.location, pitch: pitch });
    }

    /**
     * @param {Player} player
     * @param {Block} block
     */
    PlayRemoveSound(player, block)
    {
        player.playSound("bundle.remove_one", { location: block.location });
    }

    /**
     * @param {Player} player
     * @param {Block} block
     */
    PlayEmptySound(player, block)
    {
        player.playSound("block.click", { location: block.location });
    }

    /**
     * @param {Player} player
     * @param {Block} block
     */
    PlayFullSound(player, block)
    {
        player.playSound("block.decorated_pot.insert_fail", { location: block.location });
    }
};