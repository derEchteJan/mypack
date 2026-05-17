import {
    system,
    world,
    Player,
    Entity,
    BlockComponentPlayerInteractEvent,
    EntityInventoryComponent,
    EntityItemComponent,
} from "@minecraft/server";

import { log, log_err, chat } from '../logging.js'
import Pets from "../handlers/pets.js";


// --- CLASS ---

/** KennelComponent
 * @implements {ItemCustomComponent}
 */
export default class KennelComponent {

    m_pets = new Pets();
    m_nextPetIdx = 0;

    /**
     * @param {Pets} pets
     */
    constructor(pets) {
        this.m_pets = pets;
        this.onPlayerInteract = this.onPlayerInteract.bind(this);
    }

    /** PlayerInteractEvent handler
     * @param {BlockComponentPlayerInteractEvent} event
     * @param {CustomComponentParameters} params
     * @returns
     */
    onPlayerInteract(event, params) {
        const player = event.player;
        const pets = this.m_pets;
        if(!player) return;

        //chat("kennel used");

        var storable = pets.GetNearestPet(player, event.block.location, false);
        if(storable)
        {
            pets.Store(storable);
        }
        else
        {
            var stored = pets.GetPets(player, true);
            if(stored.length > 0)
            {
                this.m_nextPetIdx %= stored.length;
                var nextPet = stored.at(this.m_nextPetIdx);
                var faceLocation = event.faceLocation;
                pets.Unstore(nextPet, (faceLocation ? faceLocation : player.location));
                this.m_nextPetIdx += 1;
                chat("retrieved next pet");
            }
            else
            {
                chat("no stored pets");
            }
        }

        // TODO: fix bug where pets teleport to owner when stored in another dimension than the save location

        /*
        const targetLocation = {
            dimension: world.getDimension("overworld"),
            x: 0,
            y: 64,
            z: 0,
        };

        const queryOptions =
        {
            closest: 10, // range sort test
            location: player.location,
            maxDistance: 3
        }

        //const cow = player.dimension.spawnEntity("cow", targetLocation);
        const entity = player.dimension.getEntities(queryOptions).at(1);

        if(!entity) { chat("no enitity nearby"); return; }

        chat("teleporting " + entity.typeId);

        system.runTimeout(() => {
            entity.teleport(
                targetLocation,
                {
                    dimension: targetLocation.dimension
                }
            );
        }, 20);
        */
    }
}