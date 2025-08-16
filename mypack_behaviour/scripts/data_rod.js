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

/** logs error message
 * @param {string} message
*/
function logErr(message) {
    console.log("error: " + message);
    world.sendMessage("error: " + message);
}

// --- CLASS ---

/** SortRodComponent
 * @implements {ItemCustomComponent}
 */
export default class DataRodComponent {

    m_counter = 0;

    constructor() {
        this.onUse = this.onUse.bind(this);
    }

    /**
     * @param {ItemComponentUseEvent} event 
     * @param {CustomComponentParameters} params 
     */
    onUse(event, params) {
        var player = event.source;
        const queryOptions = {
            location: player.location,
            closest: 1,
            excludeTypes: ["minecraft:player"]
        }
        var entities = player.dimension.getEntities(queryOptions);
        if (entities.length > 0) {
            var entity = entities.at(0);
            var name = entity.typeId;
            if (entity.nameTag) {
                name += " '" + entity.nameTag + "'";
            }
            chat("closest entity:");
            chat(name);
            var tags = entity.getTags();
            if (tags.length > 0) {
                chat("tags:");
                tags.forEach((tag) => {
                    chat(" - " + tag);
                });
            }
            else {
                chat("no tags");
            }
            var dynPropIds = entity.getDynamicPropertyIds();
            if (dynPropIds.length > 0) {
                chat("dnamic properties:");
                dynPropIds.forEach(dynPropId => {
                    var dynVal = entity.getDynamicProperty(dynPropId);
                    chat(" - " + dynPropId + " = " + dynVal);
                });
            }
            else {
                chat("no dynamic properties");
            }

            // add some test tags / properties if it doesnt yet have any

            var wasCounted = false;
            if (tags.length === 0) {
                entity.addTag("test_tag_" + this.m_counter);
                chat("set test_counter tag to " + this.m_counter);
                wasCounted = true;
            }

            if (dynPropIds.length === 0) {
                entity.setDynamicProperty("test_counter", this.m_counter);
                chat("set test_counter to " + this.m_counter);
                wasCounted = true;
            }
            if (wasCounted) this.m_counter += 1;
        }
        else {
            chat("found no entities");
        }
    }
}