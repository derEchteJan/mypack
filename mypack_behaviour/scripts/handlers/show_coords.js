
import {
    system, 
    world,
    Dimension,
    Entity,
    Player,
    EntityComponentTypes,
    EquipmentSlot
} from "@minecraft/server"

/** ShowCoords handler class,
 *  Displays coordinates to players while they hold certain items like maps
 */
export default class ShowCoords {

    constructor()
    {
    }

    static UpdatePlayers() {
        world.getPlayers().forEach((player) => {
            const equipment = player.getComponent(EntityComponentTypes.Equippable);
            if (equipment)
            {
                var showCoords = false;
                var showAimPos = false;
                
                var mainHand = equipment.getEquipment(EquipmentSlot.Mainhand);
                showCoords |= mainHand && ShowCoords.IsNavItem(mainHand.typeId);
                
                var offHand = equipment.getEquipment(EquipmentSlot.Offhand);
                showCoords |= offHand && ShowCoords.IsNavItem(offHand.typeId);

                showAimPos = mainHand.typeId === 'minecraft:spyglass';

                if(showCoords)
                {
                    ShowCoords.DisplayPosition(player);
                }
                if(showAimPos)
                {
                    ShowCoords.DisplayLookAtPos(player);
                }
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

    static DisplayLookAtPos(player)
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

    RegisterHandlers()
    {
        system.runInterval(ShowCoords.UpdatePlayers, 10);
    }
}