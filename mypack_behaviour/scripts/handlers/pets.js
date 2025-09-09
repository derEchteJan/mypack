
import {
    system,
    world,
    Player,
    Entity,
    Dimension,
    EntityIsTamedComponent,
    PlayerInteractWithEntityAfterEvent
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


/** Pets handler class,
 *  For pet_rod and kennel block
 */
export default class Pets {

    static COMPANION_TAG = "mypack:companion";
    static TAMED_TAG = "mypack:tamed";
    static OWNER_PROPERTY = "mypack:owner";
    static STORED_PROPERTY = "mypack:stored";

    m_storedCompanionsCount = 0;
    m_saveLocation = { x: 0, y: 63, z: 0 };
    m_saveDimension = "overworld";

    constructor()
    {
    }

    RegisterHandlers()
    {
        world.afterEvents.entityLoad.subscribe((event) => {
            this.OnEntityLoad(event);
        });
        world.afterEvents.playerInteractWithEntity.subscribe((event) => {
            this.OnPlayerInteractWithEntity(event);
        })
    }

    // --- EVENT HANDLERS ---

    /**
     * @param {EntityLoadAfterEvent} event 
     */
    OnEntityLoad(event) {
        var entity = event.entity;
        if (entity)
        {
            if (entity.hasComponent(EntityIsTamedComponent.componentId))
            {
                entity.addTag(Pets.TAMED_TAG);
            }
        }
    }

    /**
     * @param {PlayerInteractWithEntityAfterEvent} event 
     */
    OnPlayerInteractWithEntity(event) {
      const entity = event.target;
      const player = event.player;
      if (entity && entity.hasComponent(EntityIsTamedComponent.componentId)) {
        entity.addTag(Pets.TAMED_TAG);
        
        if (!entity.hasTag(Pets.COMPANION_TAG)) {
          this.Register(entity, player);
          chat("pet registered");
        }
      }
    }

    // --- METHODS

    /**
     * Get pets of player
     * @param {Player} player owner player
     * @param {boolean?} stored stored / not stored pets, optional
     * @returns {[Entity]} list of registered pets
     */
    GetPets(player, stored)
    {
        // EntityQueryOptions
        const queryOptions =
        {
            tags: [ Pets.COMPANION_TAG ],
        }

        var entities = player.dimension.getEntities(queryOptions);

        entities = entities.filter((entity) => {
            var included = entity.getDynamicProperty(Pets.OWNER_PROPERTY) === player.name;
            if(stored !== undefined)
            {
                included &= entity.getDynamicProperty(Pets.STORED_PROPERTY) === stored;
            }
            return included;
        });

        //for(var pet of entities) pet.owner = pet.getDynamicProperty("mypack.owner"); // do we do this?
        return entities;
    }

    /**
     * Get closest pet to player
     * @param {Player} player owner player
     * @param {Vector3} position search radius center
     * @param {boolean} stored sored / not stored pets
     * @returns {Entity} closest registered pet
     */
    GetNearestPet(player, position, stored)
    {
        // EntityQueryOptions
        const queryOptions =
        {
            tags: [ Pets.COMPANION_TAG ],
            closest: 10, // range sort test
            location: position,
            maxDistance: 3
        }
        var entities = player.dimension.getEntities(queryOptions);

        entities = entities.filter((entity) => {
            return entity.getDynamicProperty(Pets.OWNER_PROPERTY) === player.name && entity.getDynamicProperty(Pets.STORED_PROPERTY) === stored;
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
            tags: [ Pets.COMPANION_TAG ],
        }
        var entities = player.dimension.getEntities(queryOptions);

        entities = entities.filter((entity) => {
            return entity.getDynamicProperty(Pets.OWNER_PROPERTY) === player.name && entity.nameTag === name;
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
            tags: [ Pets.TAMED_TAG ],
            excludeTags: [ Pets.COMPANION_TAG ],
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
        pet.removeTag(Pets.COMPANION_TAG);
        pet.setDynamicProperty(Pets.OWNER_PROPERTY, null);
        pet.setDynamicProperty(Pets.STORED_PROPERTY, null);
    }

    /**
     * @param {Entity} pet 
     * @param {Player} toPlayer 
     */
    Register(pet, toPlayer)
    {
        pet.addTag(Pets.COMPANION_TAG);
        pet.setDynamicProperty(Pets.OWNER_PROPERTY, toPlayer.name);
        pet.setDynamicProperty(Pets.STORED_PROPERTY, false);
    }

    /**
     * @param {Entity} pet
     */
    Store(pet)
    {
        var preTpPos = pet.location;
        var preTpDimension = pet.dimension;
        var teleportOptions = { dimension: world.getDimension(this.m_saveDimension) };

        var teleported = pet.tryTeleport(this.m_saveLocation, teleportOptions);
        if(teleported)
        {
            //pet.setDynamicProperty(Pets.STORED_PROPERTY, true);
            this.ShowParticles(preTpPos, preTpDimension);
        }
        else
            logErr("unable to teleport pet to store");
    }

    /**
     * @param {Entity} pet
     * @param {Vector3} position
     */
    Unstore(pet, position)
    {
        var teleported = pet.tryTeleport(position);
        if(teleported)
        {
            pet.setDynamicProperty(Pets.STORED_PROPERTY, false);
            this.ShowParticles(pet.location, pet.dimension);
        }
        else
            logErr("unable to teleport pet to player");
    }

    /**
     * Shows teleport particles
     * @param {Vector3} location
     * @param {Dimension} dimension
     */
    ShowParticles(location, dimension)
    {
        const particleType = "minecraft:ice_evaporation_emitter";
        dimension.spawnParticle(particleType, location, null);
    }
}

export const SHARED_PETS = new Pets();