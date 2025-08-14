import { 
    world,
    BlockComponentPlayerInteractEvent,
    BlockInventoryComponent,
    EntityInventoryComponent,
    Container,
    Block,
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

            if(heldItemName === 'minecraft:blaze_rod')
            {
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
                chat("attempting to insert item " + heldItemName);
                if(s_linkedContainer)
                {
                    playerInventory.container.transferItem(selectedSlot, s_linkedContainer);
                }
                else
                {
                    chat("no container linked, cant insert");
                }
            }
        }
        else
        {
            chat("attempting to retrieve item");
            if(s_linkedContainer)
            {
                for(var i = 0; i < s_linkedContainer.size; i++)
                {
                    var itemStack = s_linkedContainer.getItem(i);
                    if(itemStack)
                    {
                        chat("retrieving: " + itemStack.typeId);
                        s_linkedContainer.transferItem(i, playerInventory.container);
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