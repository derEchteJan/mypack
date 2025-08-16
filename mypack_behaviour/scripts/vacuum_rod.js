import {
    world,
    ItemComponentUseEvent,
    EntityInventoryComponent,
    EntityItemComponent,
} from "@minecraft/server";

// --- UTILS ---

/** logs message to console and world chat
 * @param {string} message
*/
function log(message) {
    console.log(message);
    world.sendMessage(message);
}

/** logs message to world chat
 * @param {string} message
*/
function chat(message) {
    world.sendMessage(message);
}

// --- CLASS ---

/** VacuumRodComponent
 * @implements {ItemCustomComponent}
 */
export default class VacuumRodComponent {

    m_instantVacuum = true;
    m_vacuumRange = 10;

    constructor() {
        this.onUse = this.onUse.bind(this);
    }

    /**
     * @param {ItemComponentUseEvent} event 
     * @param {CustomComponentParameters} params 
     */
    onUse(event, params) {
        var player = event.source;
        if(player.isSneaking)
        {
            this.m_instantVacuum = !this.m_instantVacuum;
            chat("m_instantVacuum " + this.m_instantVacuum);
        }
        else
        {
            this.Vacuum(event.source);
        }
    }

    /**
     * @param {Player} player 
     */
    Vacuum(player) {
        //chat("vacuum")
        
        if (!player) { chat("no player"); return; }

        const query = {
            location: player.location,
            maxDistance: this.m_vacuumRange,
            type: "minecraft:item"
        };

        var entities = player.dimension.getEntities(query);
        var inventoryContainer = player.getComponent(EntityInventoryComponent.componentId).container;
        var pickupCount = 0;

        //chat("got components");

        if (this.m_instantVacuum) {
            entities.forEach(entity => {
                var itemComponent = entity.getComponent(EntityItemComponent.componentId);
                if (itemComponent) {
                    var itemStack = itemComponent.itemStack;
                    if(!inventoryContainer.addItem(itemStack))
                    {
                        entity.kill();
                        pickupCount += 1;
                    }
                }
            });
        }
        else {
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

                entity.applyImpulse({ x: dx, y: dy, z: dz });

                pickupCount += 1;
            });
        }

        //chat("vacuumed up " + pickupCount + " items");
    }

}