import {
    system,
    world,
    Player,
    Block,
    Entity,
    ItemStack,
    EntityComponentTypes,
    EquipmentSlot,
} from "@minecraft/server";

// --- MANUAL TRANSLATION KEY REDEFINITIONS ---

// blocks

const block_loc_keys = new Map();
block_loc_keys.set("minecraft:sandstone_wall", "tile.cobblestone_wall.sandstone.name");

// items

const item_loc_keys = new Map();
item_loc_keys.set("mypack:test", "dieter");

const entity_loc_keys = new Map();

/**
 * Foundatinoal code that is reused across the project
 */
export default class utils
{
    static toString(object)
    {
        
    }

    /**
     * Returns translation id for given Block, ItemStack or Entity
     * Defaults to typeId if not implemented
     * @param {Block|ItemStack|Entity} object text
     * @returns {string} translation id
     */
    static tr(object)
    {
        const mc_prefix = "minecraft:";

        var result = object.typeId;

        if(object instanceof Block)
        {
            var remapped = block_loc_keys.get(object.typeId);
            if(remapped) return remapped;

            if(result.includes(mc_prefix)) result = result.replace(mc_prefix, "");
            result = "tile." + result + ".name";
        }
        if(object instanceof ItemStack)
        {
            var remapped = item_loc_keys.get(object.typeId);
            if(remapped) return remapped;

            if(result.includes(mc_prefix)) result = result.replace(mc_prefix, "");
            result = "item." + result + ".name";
        }
        if(object instanceof Entity)
        {
            var remapped = entity_loc_keys.get(object.typeId);
            if(remapped) return remapped;

            if(result.includes(mc_prefix)) result = result.replace(mc_prefix, "");
            result = "entity." + result + ".name";
        }
        return result;
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