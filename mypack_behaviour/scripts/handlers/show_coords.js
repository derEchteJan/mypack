
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
            if (equipment) {
                var mainHand = equipment.getEquipment(EquipmentSlot.Mainhand);
                if (mainHand) {
                    if (mainHand.typeId === "minecraft:filled_map"
                        || mainHand.typeId === "minecraft:compass"
                        || mainHand.typeId === "minecraft:lodestone_compass"
                        || mainHand.typeId === "minecraft:recovery_compass") {
                        //log(player.name + " has map in hand");
                        var px = Math.round(player.location.x);
                        var py = Math.round(player.location.y);
                        var pz = Math.round(player.location.z);
                        var text = "x:" + px + " y:" + py + " z:" + pz;
                        world.getDimension("overworld").runCommandAsync("title \"" + player.name + "\" actionbar " + text);
                    }
                }
            }

        });
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