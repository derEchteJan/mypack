import {
    system,
    world,
    Player,
    Entity,
    ItemComponentUseEvent,
    EntityInventoryComponent,
    EntityItemComponent,
} from "@minecraft/server";

import Pets from "../handlers/pets.js";

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

/** logs error message
 * @param {string} message
*/
function logErr(message) {
    console.log("error: " + message);
    world.sendMessage("error: " + message);
}

// --- CLASS ---

class Mode
{
    static list = "list";
    static store = "store";
    static unstore = "unstore";
    static register = "register";
    static unregister = "unregister";
    static change_owner = "change_owner"

    static _values = [ Mode.list, Mode.register, Mode.unregister, Mode.store, Mode.unstore, Mode.change_owner ];

    /** returns next enum value, wraps around
     * @param {string} mode Mode enum value
     * @returns {string|null} next Mode enum value or null if invalid
     */
    static next(mode)
    {
        var result = null;
        for(var i = 0; i < Mode._values.length; i++)
        {
            if(Mode._values[i] === mode)
            {
                result = Mode._values[(i + 1) % Mode._values.length];
                break;
            }
        }
        return result;
    }

    /** returns index of enum value
     * @param {string} mode Mode enum value
     * @returns {number} index
     */
    static indexOf(mode)
    {
        var result = -1;
        for(var i = 0; i < Mode._values.length; i++)
        {
            if(Mode._values[i] === mode)
            {
                result = i;
                break;
            }
        }
        return result;
    }
}

/* Companion Data Structure:
{
	name: string
	tag: 'mypack:companion'|undefined -> set if its an assigned companion
    tag: 'mypack:tamed'|undefined -> set if entity has been tamed
	
	DynamicProperties:
	{
		mypack:owner: string
		mypack:stored: bool
		vacuum_unlocked: bool
		vacuum_enabled: bool
		companion_id: string
	}
}
*/

/** PetRodComponent
 * @implements {ItemCustomComponent}
 */
export default class PetRodComponent {

    m_mode = Mode.list;
    m_storedCompanionsCount = 0;
    m_saveLocation = { x: 0, y: -63, z: 0 };
    m_pets = new Pets();

    /**
     * @param {Pets} pets
     */
    constructor(pets) {
        this.m_pets = pets;
        this.onUse = this.onUse.bind(this);
    }

    /**
     * @param {ItemComponentUseEvent} event 
     * @param {CustomComponentParameters} params 
     */
    onUse(event, params)
    {
        const player = event.source;
        const pets = this.m_pets;
        
        if(player.isSneaking)
        {
            this.m_mode = Mode.next(this.m_mode);
            var idx = Mode.indexOf(this.m_mode);
            chat("mode: " + this.m_mode + " (" + (idx + 1) + "/" + Mode._values.length + ")" );
        }
        else
        {
            if(this.m_mode === Mode.list)
            {
                //this.ListPets(player);
                pets.ListPets(player);
            }
            else if(this.m_mode === Mode.register)
            {
                pets.RegisterClosestEntity(player, true); // todo: get who is looked at instead? (use raycast thing from entity)
            }
            else if(this.m_mode === Mode.unregister)
            {
                pets.RegisterClosestEntity(player, false);
            }
            else if(this.m_mode === Mode.store)
            {
                var pet = pets.GetNearestPet(player, player.location, /*stored:*/ false);
                if(pet)
                {
                    pets.Store(pet);
                    chat("stored " + pet.nameTag);
                }
                else
                    chat("no pet nearby");
            }
            else if(this.m_mode === Mode.unstore)
            {
                var pet = pets.GetNearestPet(player, player.location, /*stored:*/ true); // todo: get nearest stored, how to get closest filter + js filtering
                if(pet)
                {
                    pets.Unstore(pet, player.location);
                    chat("unstored " + pet.nameTag);
                }
                else
                    chat("no stored pet found");
            }
            else if(this.m_mode === Mode.change_owner)
            {
                var pet = pets.GetNearestPet(player, player.location, /*stored:*/ false);
                if(pet)
                {
                    pet.setDynamicProperty("mypack:owner", null);
                    chat("changed owner to null");
                }
                else
                    chat("no pet nearby");
            }
            else
            {
                chat("mode " + this.m_mode + " not implemented");
            }
        }
    }
}