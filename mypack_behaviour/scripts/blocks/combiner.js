import { 
    world,
    BlockComponentPlayerInteractEvent,
    BlockInventoryComponent,
    EntityInventoryComponent,
    Container,
    Block,
    ItemStack,
    EntityEquippableComponent,
    EquipmentSlot,
} from "@minecraft/server";

function log(message) {
  console.log("CombinerComponent.js: " + message);
  world.sendMessage("CombinerComponent.js: " + message);
}
function chat(message) {
  world.sendMessage("CombinerComponent.js: " + message);
}

var s_linkedContainer = null;

/** CombinerComponent handler
 * @implements {BlockCustomComponent}
 */
export default class CombinerComponent {

    constructor() {
        this.onPlayerInteract = this.onPlayerInteract.bind(this);
    }

    // unused
    onTick(event)
    {
    }

    /** PlayerInteractEvent handler
     * @param {BlockComponentPlayerInteractEvent} event
     * @param {CustomComponentParameters} params
     * @returns
     */
    onPlayerInteract(event, params) {
        
        var player = event.player;
        var block = event.block;

        var selectedSlot = player.selectedSlotIndex;
        var playerInventory = player.getComponent(EntityInventoryComponent.componentId);
        var heldItem = playerInventory.container.getItem(selectedSlot);

        if(heldItem)
        {
            var heldItemName = heldItem.typeId;
            chat("holding: " + heldItemName);

            if(heldItemName === 'mypack:test')
            {
                // when holding the test item a viable container block above is registered as target

                var aboveBlock = block.above(1);
                if(aboveBlock)
                {
                    var blockInventory = aboveBlock.getComponent(BlockInventoryComponent.componentId);
                    if(blockInventory && blockInventory.container)
                    {
                        s_linkedContainer = blockInventory.container;
                        chat("linked block container at " + aboveBlock.x + ", " + aboveBlock.z + " size: " + s_linkedContainer.size);
                    }
                    else
                    {
                        chat("block has no container");
                    }
                }
            }
            else
            {
                // player is holding any item other than test: transfer it to the target container

                chat("attempting to insert item " + heldItemName);
                if(s_linkedContainer)
                {
                    var addResult = s_linkedContainer.addItem(heldItem);
                    if(addResult === undefined)
                    {
                        var equipment = player.getComponent(EntityEquippableComponent.componentId);
                        equipment.setEquipment(EquipmentSlot.Mainhand, null);
                    }
                    else
                        chat("container is full!");
                    //layerInventory.container.transferItem(selectedSlot, s_linkedContainer); <-- removed
                }
                else
                {
                    chat("no container linked, cant insert");
                }
            }
        }
        else
        {
            // player isnt holding an item: transfer itens from target container to the player

            chat("attempting to retrieve item");
            if(s_linkedContainer)
            {
                for(var i = s_linkedContainer.size - 1; i >= 0; i--)
                {
                    var itemStack = s_linkedContainer.getItem(i);
                    if(itemStack)
                    {
                        chat("retrieving: " + itemStack.typeId);

                        var equipment = player.getComponent(EntityEquippableComponent.componentId);
                        var didSet = equipment.setEquipment(EquipmentSlot.Mainhand, itemStack);
                        if(didSet)
                        {
                            s_linkedContainer.setItem(i, null);
                        }
                        //s_linkedContainer.transferItem(i, playerInventory.container); <-- removed
                        break;
                    }
                }
                
            }
            else
            {
                chat("no container linked, cant retrieve");
            }
        }
    }
};