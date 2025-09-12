import {
    system,
    world,
    Player,
    ItemStack,
    EntityComponentTypes,
    EquipmentSlot,
} from "@minecraft/server";


/**
 * Foundatinoal code that is reused across the project
 */
export default class utils
{
    /**
     * Returns translation key for given text
     * @param {string} str text
     * @returns {string} translation id
     */
    static tr(str)
    {
        const mc_prefix = "minecraft:";
        var translationId = (str.startsWith(mc_prefix) ? str.substring(mc_prefix.length) : str);
        translationId = "tile." + translationId + ".name";
        return translationId;
    }

    /**
     * @param {Player} player
     * @returns {ItemStack|null}
     */
    static GetHeldItem(player)
    {
        const equipment = player.getComponent(EntityComponentTypes.Equippable);
        if (equipment)
        {
            var heldStack = equipment.getEquipment(EquipmentSlot.Mainhand);
            return heldStack;
        }
        return null;
    }

    /**
     * Sets given ItemStack into players hand
     * 
     * A clone of the stack will be created, as it is necessary
     * 
     * Any pre-existing stack in the players hand will be dropped on the ground as
     * item stack entity unless the override parameter is specified as 'true'
     * @param {Player} player
     * @param {ItemStack} itemStack
     * @param {boolean|undefined} override true: deletes currently held item, false | undefined: drops currently held item on the ground
     */
    static SetHeldItem(player, itemStack, override)
    {
        const equipment = player.getComponent(EntityComponentTypes.Equippable);
        if (equipment)
        {
            var slot = equipment.getEquipmentSlot(EquipmentSlot.Mainhand);
            if(!override)
            {
                var currentStack = slot.getItem();
                if(currentStack)
                {
                    var dropStack = currentStack.clone();
                    slot.setItem(null);
                    player.dimension.spawnItem(dropStack, player.location);
                }
            }
            var newItemStack = null;
            if(itemStack) newItemStack = itemStack.clone();
            slot.setItem(newItemStack);
        }
    }
}