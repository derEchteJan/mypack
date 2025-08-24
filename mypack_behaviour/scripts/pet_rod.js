import {
    system,
    world,
    Player,
    Entity,
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
    m_saveLocation = { x: 0, y: -63, z: 0 }

    constructor() {
        this.onUse = this.onUse.bind(this);
    }

    /**
     * @param {ItemComponentUseEvent} event 
     * @param {CustomComponentParameters} params 
     */
    onUse(event, params)
    {
        const player = event.source;
        
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
                this.ListPets(player);
            }
            else if(this.m_mode === Mode.register)
            {
                this.RegisterClosestEntity(player, true); // todo: get who is looked at instead?
            }
            else if(this.m_mode === Mode.unregister)
            {
                this.RegisterClosestEntity(player, false);
            }
            else if(this.m_mode === Mode.store)
            {
                var pet = this.GetNearestPet(player, /*stored:*/ false);
                if(pet)
                {
                    this.Store(pet);
                    chat("stored " + pet.nameTag);
                }
                else
                    chat("no pet nearby");
            }
            else if(this.m_mode === Mode.unstore)
            {
                var pet = this.GetNearestPet(player, /*stored:*/ true); // todo: get nearest stored, how to get closest filter + js filtering
                if(pet)
                {
                    this.Unstore(pet, player);
                    chat("unstored " + pet.nameTag);
                }
                else
                    chat("no stored pet found");
            }
            else if(this.m_mode === Mode.change_owner)
            {
                var pet = this.GetNearestPet(player, /*stored:*/ false);
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

    /**
     * Get pets of player
     * @param {Player} player owner player
     * @returns {[Entity]} list of registered pets
     */
    GetPets(player)
    {
        // EntityQueryOptions
        const queryOptions =
        {
            tags: [ "mypack:companion" ],
            //propertyOptions: [ { propertyId: "mypack:owner", value: { equals: player.name } } ],
        }
        // TODO: FILTER FOR mypack:owner === player
        var entities = player.dimension.getEntities(queryOptions);

        entities = entities.filter((entity) => {
            return entity.getDynamicProperty("mypack:owner") === player.name;
        });

        //for(var pet of entities) pet.owner = pet.getDynamicProperty("mypack.owner"); // do we do this?
        return entities;
    }

    /**
     * Get closest pet to player
     * @param {Player} player owner player
     * @param {boolean} stored sored / not stored pets
     * @returns {Entity} closest registered pet
     */
    GetNearestPet(player, stored)
    {
        // EntityQueryOptions
        const queryOptions =
        {
            tags: [ "mypack:companion" ],
            closest: 10, // range sort test
            location: player.location,
        }
        var entities = player.dimension.getEntities(queryOptions);

        entities = entities.filter((entity) => {
            return entity.getDynamicProperty("mypack:owner") === player.name && entity.getDynamicProperty("mypack:stored") === stored;
        });

        return entities.length > 0 ? entities.at(0) : null;
    }

    /**
     * Get pet of player by name
     * @param {Player} player owner player
     * @param {string} name pet name
     * @returns {[Entity]} list of registered pets
     */
    GetPet(player, name) {
        const queryOptions =
        {
            tags: [ "mypack:companion" ],
        }
        var entities = player.dimension.getEntities(queryOptions);

        entities = entities.filter((entity) => {
            return entity.getDynamicProperty("mypack:owner") === player.name && entity.nameTag === name;
        });

        return entities.length > 0 ? entities.at(0) : null;
    }

    /**
     * Get closest entity that is viable as pet
     * @param {Player} player player
     * @returns {Entity} viable entities
     */
    GetNearestRegisterableEntity(player)
    {
        const queryOptions =
        {
            excludeTypes: [ "player" ],
            tags: [ "mypack:tamed" ],
            excludeTags: [ "mypack:companion" ],
            closest: 1,
            location: player.location,
        }
        var entities = player.dimension.getEntities(queryOptions);
        if(entities.length > 0)
            return entities.at(0);
        else
            return null;
    }

    /**
     * @param {Player} player
     */
    ListPets(player)
    {
        var pets = this.GetPets(player);
        if(pets.length > 0)
        {
            for(var pet of pets)
            {
                var dispName = pet.nameTag;
                if(dispName && dispName.length != 0)
                {
                    chat(pet.typeId + " '" + dispName + "'");
                }
                else
                {
                    chat(pet.typeId);
                }
            }
        }
        else
        {
            chat("no registerd pets");
        }
    }

    /**
     * @param {Player} player
     * @param {boolean} register true: register, false: unregister
     */
    RegisterClosestEntity(player, register)
    {
        var closest = register ? this.GetNearestRegisterableEntity(player) : this.GetNearestPet(player, /*stored:*/ false);
        if(closest)
        {
            if(register)
            {
                this.Register(closest, player);
                chat("registered " + closest.typeId + " '" + closest.nameTag + "'");
            }
            else
            {
                this.Unregister(closest);
                chat("unergistered " + closest.typeId + " '" + closest.nameTag + "'");
            }
        }
        else
        {
            chat("no pet found");
        }
    }

    /**
     * @param {Entity} pet 
     */
    Unregister(pet)
    {
        pet.removeTag("mypack:companion");
        pet.setDynamicProperty("mypack:owner", null);
        pet.setDynamicProperty("mypack:stored", null);
    }

    /**
     * @param {Entity} pet 
     * @param {Player} toPlayer 
     */
    Register(pet, toPlayer)
    {
        pet.addTag("mypack:companion");
        pet.setDynamicProperty("mypack:owner", toPlayer.name);
        pet.setDynamicProperty("mypack:stored", false);
    }

    /**
     * @param {Entity} pet
     */
    Store(pet)
    {
        var teleported = pet.tryTeleport(this.m_saveLocation);
        if(teleported)
            pet.setDynamicProperty("mypack:stored", true);
        else
            logErr("unable to teleport pet to store");
    }

    /**
     * @param {Entity} pet
     * @param {Player} player
     */
    Unstore(pet, player)
    {
        var teleported = pet.tryTeleport(player.location);
        if(teleported)
            pet.setDynamicProperty("mypack:stored", false);
        else
            logErr("unable to teleport pet to player");
    }
}