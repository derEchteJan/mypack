import {
    world,
    ItemComponentUseEvent,
    EntityInventoryComponent,
    EntityItemComponent,
    ItemStack
} from "@minecraft/server";

import utils from '../utils.js'
import { log, log_err, chat } from '../logging.js'

// --- MODE ENUM --

class Mode
{
    static instant  = "instant";  // pickup items in range instantly
    static pull     = "pull";     // pull items in range towards player

    static _prop_id      = "mypack:vacuum_rod_mode";
    static _values       = [ Mode.instant,   Mode.pull ];
    static _displayNames = [ "instant",      "pull" ];

    /**
     * @param {string} mode
     * @returns {string}
     */
    static DisplayName(mode)
    {
        if(!this._values.includes(mode)) return "";
        var idx = this._values.indexOf(mode);
        return this._displayNames[idx];
    }
}

// --- CLASS ---

/** VacuumRodComponent
 * @implements {ItemCustomComponent}
 */
export default class VacuumRodComponent {

    m_instantVacuum = true;
    m_vacuumRange = 5.1;

    constructor() {
        this.onUse = this.onUse.bind(this);
    }

    /**
     * @param {ItemComponentUseEvent} event 
     * @param {CustomComponentParameters} params 
     */
    onUse(event, params) {
        const player = event.source;
        const stack = event.itemStack;
        const mode = this.GetMode(stack);

        if(player.isSneaking)
        {
            this.SetMode(stack, (mode == Mode.instant) ? Mode.pull : Mode.instant, player);
            this.PlayModeChangedSound(player, mode);
        }
        else
        {
            this.Vacuum(event.source, mode == Mode.instant);
        }
    }

    /** Applies vacuum effect to given player (depending on mode)
     * @param {Player} player 
     * @param {boolean} instant
     */
    Vacuum(player, instant) {
        if (!player) { return; }
        
        const query = {
            location: player.location,
            maxDistance: this.m_vacuumRange,
            type: "minecraft:item"
        };

        var entities = player.dimension.getEntities(query);
        var inventoryContainer = player.getComponent(EntityInventoryComponent.componentId).container;
        var pickupCount = 0;

        if (instant) {
            // Mode == instant
            // instantly picks up items nearby and moves them to the players inventory
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
            // Mode == pull
            // pulls items nearby towards player and lets them pick up naturally
            const velocityFactor = 0.25;
            const velYMargin = 0.2;

            entities.forEach(entity => {

                var to = player.location;
                var from = entity.location;

                var dx = to.x - from.x
                var dy = to.y - from.y;
                var dz = to.z - from.z;

                dx *= velocityFactor;
                dy *= velocityFactor;
                dz *= velocityFactor;

                dy += velYMargin;

                entity.applyImpulse({ x: dx, y: dy, z: dz });

                pickupCount += 1;
            });
        }

        this.PlayUseSound(player);
        if(instant && pickupCount != 0)
        {
            this.PlayPickupSound(player);
        }
        
        if(utils.debug)
        {
            chat("picked up " + pickupCount + " items", player);
        }
    }

    /**
     * @param {Entity|ItemStack} object data storage object
     * @param {string} mode raw value
     */
    SetMode(object, mode, player)
    {
        object.setDynamicProperty(Mode._prop_id, mode);

        const modeName = Mode.DisplayName(mode);

        if(object instanceof ItemStack)
        {
            const rawLore = [ "§7Mode: §r§3'" + modeName + "'§r" ]; // raw lore cant be translated? what the helly
            object.setLore(rawLore);
            utils.SetHeldItem(player, object, /*override:*/ true);
        }
            
        const rawMessage = { rawtext: [ { text: "Set Mode §3'" }, { translate: modeName }, { text: "'§r" } ] };
        player.sendMessage(rawMessage);
    }

    /**
     * @param {Entity|ItemStack} object data storage object
     * @returns {string | undefined} mode value
     */
    GetMode(object)
    {
        var value = object.getDynamicProperty(Mode._prop_id);
        return value ? value : Mode._values[0];
    }

    /**
     * @param {Player} player target
     */
    PlayUseSound(player)
    {
        var options =
        {
            pitch: 1.6,
            volume: 0.5,
            location: player.location
        };
        player.playSound("brush.generic", options);
    }

    /**
     * @param {Player} player target
     */
    PlayPickupSound(player)
    {
        var options =
        {
            pitch: 1.5,
            volume: 0.3,
            location: player.location
        };
        player.playSound("random.pop", options);
    }

    /**
     * @param {Player} player target
     * @param {string} mode current mode value
     */
    PlayModeChangedSound(player, mode)
    {
        var options =
        {
            pitch: mode == Mode.instant ? 1.0 : 1.2,
            volume: 0.3,
            location: player.location
        };
        player.playSound("click_on.metal_pressure_plate", options);
    }

}