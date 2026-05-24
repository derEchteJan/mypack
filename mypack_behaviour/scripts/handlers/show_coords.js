
import {
    system, 
    world,
    Dimension,
    EntityComponentTypes,
    EquipmentSlot
} from "@minecraft/server"

/** ShowCoords handler class,
 *  Displays coordinates to players while they hold certain items like maps
 */
export default class ShowCoords {

    constructor() {
        this.RegisterHandlers = this.RegisterHandlers.bind(this);
        this.OnTick = this.OnTick.bind(this);
    }

    ShowCoords() {
        world.getPlayers().forEach((player) => {
            const equipment = player.getComponent(EntityComponentTypes.Equippable);
            if (equipment)
            {
                var showCoords = false;
                
                var mainHand = equipment.getEquipment(EquipmentSlot.Mainhand);
                showCoords |= mainHand && this.IsNavItem(mainHand.typeId);
                
                var offHand = equipment.getEquipment(EquipmentSlot.Offhand);
                showCoords |= offHand && this.IsNavItem(offHand.typeId);

                if(showCoords)
                {
                    var px = Math.round(player.location.x - 0.5);
                    var py = Math.round(player.location.y - 0.5);
                    var pz = Math.round(player.location.z - 0.5);
                    var text = "x:" + px + " y:" + py + " z:" + pz;
                    world.getDimension("overworld").runCommandAsync("title \"" + player.name + "\" actionbar " + text);
                }
            }
        });
    }

    /**
     * Returns wether given item id qualifies as a navigation item
     * that shows coords when held
     * @param {string} itemId 
     */
    IsNavItem(itemId)
    {
        return itemId === "minecraft:filled_map"
            || itemId === "minecraft:compass"
            || itemId === "minecraft:lodestone_compass"
            || itemId === "minecraft:recovery_compass"
    }

    OnTick() {
        if (system.currentTick % 10 === 0)
            this.ShowCoords();
        system.run(this.OnTick);
    }

    RegisterHandlers() {
        system.run(this.OnTick);
    }
}