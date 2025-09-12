import {
    world,
    ItemComponentUseEvent,
    EntityInventoryComponent,
    EntityItemComponent,
    ItemComponentUseOnEvent,
    Player,
    Entity,
    Block,
    ItemStack,
    EntityLeashableComponent,
    EntityProjectileComponent
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
    static list = "list";                       /**< list all tags and dynmaic properties of nearest non player entity >*/
    static clear = "clear";                     /**< remove all tags and dynmaic properties from nearest non player entity >*/
    static clear_pack_only = "clear_pack_only"
    static set_dummy = "set_dummy"

    static _values = [ Mode.list, Mode.clear, Mode.clear_pack_only, Mode.set_dummy ];

    /**
     * Returns next enum value, wraps around
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

    /**
     * Returns index of enum value
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

/** SortRodComponent
 * @implements {ItemCustomComponent}
 */
export default class DataRodComponent {

    m_mode = Mode._values.at(0);
    m_dummyCounter = 0;

    constructor() {
        this.onUse = this.onUse.bind(this);
        this.onUseOn = this.onUseOn.bind(this);
    }

    /**
     * @param {Block|ItemStack|undefined} object 
     * @returns {string}
     */
    getKey(object)
    {
        if(object instanceof Block)
        {
            return "minecraft:block";
        }
        if(object instanceof ItemStack)
        {
            return "minecraft:item_stack";
        }
        return "" + object;
    }

    /**
     * OnUseOnEvent handler - called when item is used on a block
     * @param {ItemComponentUseOnEvent} event
     * @param {CustomComponentParameters} params
     */
    onUseOn(event, params)
    {
        const block = event.block;
        const item = block.getItemStack(1, true);
        chat("blockKey: " + this.getKey(block) + " itemKey: " + this.getKey(item));
    }

    /**
     * @param {ItemComponentUseEvent} event 
     * @param {CustomComponentParameters} params 
     */
    onUse(event, params) {
        var player = event.source;

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
                var entity = this.GetNearestEntity(player.location, player.dimension);
                if(!entity) { chat("no entity found"); return; }
                this.ListData(entity);
                this.HighlightEntity(entity);
            }
            else if(this.m_mode === Mode.clear || this.m_mode === Mode.clear_pack_only)
            {
                var entity = this.GetNearestEntity(player.location, player.dimension);
                if(!entity) { chat("no entity found"); return; }
                var packOnly = this.m_mode === Mode.clear_pack_only;
                this.ClearData(entity, packOnly);
                chat(packOnly ? "cleared pack data" : "cleared data");
            }
            else if(this.m_mode === Mode.set_dummy)
            {
                var entity = this.GetNearestEntity(player.location, player.dimension);
                if(!entity) { chat("no entity found"); return; }
                this.SetDummyData(entity);
                chat("dummy data set");
            }
            else
            {
                chat("mode " + this.m_mode + " not implemented");
            }
        }
    }

    /**
     * @param {Vector3} location
     * @param {Dimension} dimension
     * @returns {Entity|null} entity
     */
    GetNearestEntity(/*to:*/ location, /*in:*/ dimension)
    {
        if(!dimension) dimension = world.getDimension("overworld");
        const queryOptions = {
            closest: 1,
            location: location,
            excludeTypes: ["minecraft:player"]
        }
        var entities = dimension.getEntities(queryOptions);
        return (entities.length > 0) ? entities.at(0) : null;
    }

    /**
     * @param {Entity} entity 
     */
    HighlightEntity(entity)
    {
        const particle = "minecraft:villager_happy";
        var pos = entity.location;
        pos.y += 2.5;
        var inc = 0.2;
        entity.dimension.spawnParticle(particle, pos);
        entity.dimension.spawnParticle(particle, { x: pos.x + inc, y: pos.y + inc, z: pos.z + inc });
        entity.dimension.spawnParticle(particle, { x: pos.x - inc, y: pos.y + inc, z: pos.z - inc });
        inc += inc;
        entity.dimension.spawnParticle(particle, { x: pos.x + inc, y: pos.y + inc, z: pos.z + inc });
        entity.dimension.spawnParticle(particle, { x: pos.x - inc, y: pos.y + inc, z: pos.z - inc });
    }

    /**
     * @param {Entity} entity 
     */
    ListData(entity)
    {
        var dataEntity = entity;
        var typeName = entity.typeId;
        // values for item entities:
        var amount = null;
        var maxAmount = null;
        var stackable = null;

        var itemComponent = entity.getComponent(EntityItemComponent.componentId);
        if(itemComponent)
        {
            const stack = itemComponent.itemStack;
            dataEntity = stack; // for item stack entities the persisting data actually lives inside the item stack object
            typeName += "<" + stack.typeId + ">";
            amount = stack.amount;
            maxAmount = stack.maxAmount;
            stackable = stack.isStackable;
        }

        chat(typeName);

        if(dataEntity.nameTag && dataEntity.nameTag.length > 0)
        {
            chat("nameTag: " + dataEntity.nameTag);
        }

        if(amount) chat("amount: " + amount);
        if(maxAmount) chat("maxAmount: " + maxAmount);
        if(stackable) chat("stackable: " + stackable);

        var tags = dataEntity.getTags();
        if (tags.length > 0) {
            chat("tags:");
            chat("{");
            tags.forEach((tag) => {
                chat("   " + tag);
            });
            chat("}");
        }
        else {
            chat("tags: {}");
        }

        var dynPropIds = dataEntity.getDynamicPropertyIds();
        if (dynPropIds.length > 0) {
            chat("dnamic properties:");
            chat("{");
            dynPropIds.forEach(dynPropId => {
                var dynVal = dataEntity.getDynamicProperty(dynPropId);
                chat("   " + dynPropId + " = " + dynVal);
            });
            chat("}");
        }
        else {
            chat("dnamic properties: {}");
        }
        chat("");
    }

    /**
     * Clears tags and dynamic propeties given from entity
     * @param {Entity} entity
     * @param {boolean} packOnly
     */
    ClearData(entity, packOnly)
    {
        var dataEntity = entity;

        // todo: abstract out, reduce code duplication
        var itemComponent = entity.getComponent(EntityItemComponent.componentId);
        if(itemComponent)
        {
            dataEntity = itemComponent.itemStack; // for item stack entities the persisting data actually lives inside the item stack object
        }

        const prefix = "mypack:"

        if(packOnly)
        {
            var propIds = dataEntity.getDynamicPropertyIds();
            for(var propId of propIds)
            {
                if(propId.startsWith(prefix)) dataEntity.setDynamicProperty(propId, null);
            }
        }
        else
        {
            dataEntity.clearDynamicProperties();
        }

        var tags = dataEntity.getTags();
        for(var tag of tags)
        {
            if(!packOnly || tag.startsWith(prefix)) dataEntity.removeTag(tag);
        }    
    }

    /**
     * Adds dummy tag and counter dyn prop to entity
     * @param {Entity} entity
     */
    SetDummyData(entity)
    {
        entity.addTag("dummy");
        entity.setDynamicProperty("dummy", this.m_dummyCounter);
        this.m_dummyCounter += 1;
    }
}