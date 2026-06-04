import {
    world,
    system,
    ItemComponentUseEvent,
    EntityInventoryComponent,
    EntityItemComponent,
    ItemComponentUseOnEvent,
    ItemComponentHitEntityEvent,
    Player,
    Entity,
    Block,
    ItemStack,
    EntityLeashableComponent,
    EntityProjectileComponent,
    EntityHealthComponent
} from "@minecraft/server";

import { ActionFormData } from "@minecraft/server-ui";

// --- UTILS ---

import { log, log_err, chat } from '../logging.js'
import utils from "../utils.js";
import Vector3 from "../vector.js";


// --- DRAG ENTITY TEST ---

var s_target = null;
var s_player = null;

function updateDrag() {
  var tick = system.currentTick;
  // put ontick handlers here if required
  // ...
  if(s_target)
  {
    s_target.clearVelocity();
  }
  if(tick % 3 == 0)
  {
    if(s_player && s_target)
    {
      let targetDistance = 2.2; // distance from player in look direction where entity is moved to
      let viewDir = s_player.getViewDirection();
      //log("view dir: " + viewDir.x + ", " + viewDir.y + ", " + viewDir.z);
      let playerPos = s_player.location;
      var targetPos = playerPos;
      targetPos.y += 1;
      targetPos.x += viewDir.x * targetDistance;
      targetPos.y += viewDir.y * targetDistance;
      targetPos.z += viewDir.z * targetDistance;
      
      if(Vector3.distance(s_target.location, targetPos) > 0.5)
      {
        let speed = 0.8;
        var impulse = new Vector3();

        impulse.x = targetPos.x - s_target.location.x;
        impulse.y = targetPos.y - s_target.location.y;
        impulse.z = targetPos.z - s_target.location.z;
        impulse.normalize();
        impulse.scale(speed);

        s_target.clearVelocity();
        s_target.applyImpulse(impulse);
      }      
    }
  }
  system.run(updateDrag);
}

//system.run(mainTick);


// --- CLASSES ---

class Mode
{
    static list            = "list";            // list all tags and dynmaic properties of nearest non player entity
    static clear           = "clear";           // remove all tags and dynmaic properties from nearest non player entity
    static clear_pack_only = "clear_pack_only";
    static set_dummy       = "set_dummy";
    static list_block      = "list_block";

    static _prop_id      = "mypack:data_rod_mode";
    static _values       = [ Mode.list,   Mode.clear,       Mode.clear_pack_only,     Mode.set_dummy,       Mode.list_block];
    static _displayNames = [ "List Data", "Clear All Data", "Clear Data (Pack Only)", "Set Dummy Property", "List Block data" ];

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

/** 
 * DataRodComponent
 * @implements {ItemCustomComponent}
 */
export default class DataRodComponent {

    static m_dummyCounter = 0;
    static m_raycastDistance = 4;

    constructor() {
        this.onUse = this.onUse.bind(this);
        this.onUseOn = this.onUseOn.bind(this);
    }

    /**
     * OnUseOnEvent handler - called when item is used on a block
     * @param {ItemComponentHitEntityEvent} event
     * @param {CustomComponentParameters} params
     */
    onHitEntity(event, params)
    {
        s_player = event.attackingEntity;
        s_target = event.hitEntity;
        s_target.nameTag = "drag target";
        log("entities set");
        system.run(updateDrag);
    }

    /**
     * OnUseOnEvent handler - called when item is used on a block
     * @param {ItemComponentUseOnEvent} event
     * @param {CustomComponentParameters} params
     */
    onUseOn(event, params)
    {
        const block = event.block;
        const player = event.source;
        const mode = this.GetMode(player);

        if(mode === Mode.list_block)
        {
            this.ListBlockData(block, player);
        }
    }

    /**
     * OnUse handler - called when item is used
     * @param {ItemComponentUseEvent} event 
     * @param {CustomComponentParameters} params 
     */
    onUse(event, params) {
        const player = event.source;
        if(player.isSneaking)
        {
            this.PresentModeForm(player);
        }
        else
        {
            const mode = this.GetMode(player);
            var entity = this.GetLookedAtEntity(player);
            if(!entity) entity = this.GetNearestEntity(player.location, player.dimension);

            if(!entity) { chat("no entity found"); return; }

            if(mode === Mode.list)
            {
                if(!entity) { chat("no entity found"); return; }
                this.ListData(entity, player);
                this.HighlightEntity(entity);
            }
            else if(mode === Mode.clear || mode === Mode.clear_pack_only)
            {
                if(!entity) { chat("no entity found"); return; }
                var packOnly = mode === Mode.clear_pack_only;
                this.ClearData(entity, packOnly);
                chat(packOnly ? "cleared pack data" : "cleared data");
            }
            else if(mode === Mode.set_dummy)
            {
                if(!entity) { chat("no entity found"); return; }
                this.SetDummyData(entity);
                var name = entity.typeId;
                if(entity.name)
                    name = entity.name;
                if(entity.nameTag)
                    name = entity.nameTag;
                chat("dummy data set on §3" + name + "§7");
            }
            else if(mode === Mode.list_block)
            {
                return;
            }
            else
            {
                chat("mode " + mode + " not implemented");
            }
        }
    }

    // --- CHANGE MODE ---

    /**
     * @param {Player} player
     */
    PresentModeForm(player) {
        var form = new ActionFormData()
            .title("Data Rod Mode")
            .body("Change what happens when rod is used");

        for(var modeIdx = 0; modeIdx < Mode._values.length; modeIdx++)
        {
            var dispName = Mode._displayNames.at(modeIdx);
            form = form.button(dispName);
        }

        form.show(player).then((result) => {
            if (result.canceled) return -1;
            var mode = Mode._values[result.selection];
            this.SetMode(player, mode);
        });
    }

    /**
     * @param {Player} player
     * @param {string} mode
     */
    SetMode(player, mode)
    {
        player.setDynamicProperty(Mode._prop_id, mode);
        this.ModeChangedFeedback(player, mode);
    }

    /**
     * @param {Player} player
     * @returns {string | undefined}
     */
    GetMode(player)
    {
        return player.getDynamicProperty(Mode._prop_id);
    }

    /**
     * @param {Player} player
     * @param {string} mode
     */
    ModeChangedFeedback(player, mode)
    {
        const modeName = Mode.DisplayName(mode);
        const rawMessage = { rawtext: [ { text: "Set Mode §3'" }, { translate: modeName }, { text: "'§r" } ] };
        var stack = utils.GetHeldItem(player);
        if(stack)
        {
            const rawLore = [ "§7Mode: §r§3'" + modeName + "'§r" ]; // raw lore cant be translated? what the helly
            stack.setLore(rawLore);
            utils.SetHeldItem(player, stack, /*override:*/ true);
        }

        player.sendMessage(rawMessage);
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
     * Returns first entity the given player/entity is looking at
     * @param {Entity|Player} entity - looker
     * @returns {Entity|null} first looked at entity
     */
    GetLookedAtEntity(entity)
    {
        const raycastOptions = {
            maxDistance: this.m_raycastDistance
        }
        const hits = entity.getEntitiesFromViewDirection(raycastOptions);
        return hits.length > 0 ? hits[0].entity : null;
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
     * @param {Player} player
     */
    ListData(entity, player)
    {
        var dataEntity = entity;

        // values for item entities:
        var itemType = null;
        var amount = null;
        var maxAmount = null;
        var stackable = null;
        var health = null; var maxHealth = null;

        const itemComponent = entity.getComponent(EntityItemComponent.componentId);
        if(itemComponent)
        {
            // for item stack entities the persisting data actually lives inside the item stack object
            const stack = itemComponent.itemStack;
            dataEntity = stack;
            itemType = stack.typeId;
            amount = stack.amount;
            maxAmount = stack.maxAmount;
            stackable = stack.isStackable;
        }

        const healthComponent = entity.getComponent(EntityHealthComponent.componentId);
        if(healthComponent){
            health = healthComponent.currentValue;
            maxHealth = healthComponent.effectiveMax;
        }

        var i = "   ";
        var i2 = i + i;
        var rawText = [ { text: "§7Entity\n{\n" } ];
        rawText.push({ text: i + "§3" });
        rawText.push({ translate: utils.tr(entity) });
        rawText.push({ text: "§7\n" });

        if(itemType)  rawText.push({ text: i + "itemType: §3"  + itemType + "§7\n" });
        if(dataEntity.nameTag && dataEntity.nameTag.length > 0) 
                      rawText.push({ text: i + "nameTag: '§5"  + dataEntity.nameTag + "§7'\n" });
        if(health)    rawText.push({ text: i + "health: §3"    + health + "§7/" + maxHealth + "\n" });
        if(amount)    rawText.push({ text: i + "amount: §3"    + amount + "§7\n" });
        if(maxAmount) rawText.push({ text: i + "maxAmount: §3" + maxAmount + "§7\n" });
        if(stackable) rawText.push({ text: i + "stackable: §3" + stackable + "§7\n" });

        var tags = dataEntity.getTags();
        if (tags.length > 0) {
            rawText.push({ text: i + "tags:\n" });
            rawText.push({ text: i + "[\n" });
            tags.forEach((tag) => {
                rawText.push({ text: i2 + tag + "\n" });
            });
            rawText.push({ text: i + "]\n" });
        }
        else {
            rawText.push({ text: i + "tags: []\n" });
        }

        var dynPropIds = dataEntity.getDynamicPropertyIds();
        if (dynPropIds.length > 0) {
            rawText.push({ text: i + "dyn-props:\n" });
            rawText.push({ text: i + "{\n" });
            dynPropIds.forEach(dynPropId => {
                var dynVal = dataEntity.getDynamicProperty(dynPropId);
                var dynType = dynVal.constructor.name.toLowerCase();
                rawText.push({ text: i2 + dynPropId + ": §3" + dynType + "§7 = '" + dynVal + "'\n" });
            });
            rawText.push({ text: i + "}\n" });
        }
        else {
            rawText.push({ text: i + "dyn-props: []\n" });
        }

        rawText.push({ text: "}"});

        player.sendMessage({ rawtext: rawText });
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
        entity.addTag("dummy_tag");
        entity.setDynamicProperty("mypack:dummy", DataRodComponent.m_dummyCounter);
        DataRodComponent.m_dummyCounter += 1;
    }

    ListBlockData(block, player)
    {
        var i = "   ";
        var i2 = i + i;
        var rawText = [ { text: "§7Block\n{\n" } ];
        rawText.push({ text: i + "§3" });
        rawText.push({ translate: utils.tr(block) });
        rawText.push({ text: "§7\n" });
        rawText.push({ text: "}"});
        player.sendMessage({ rawtext: rawText });
    }
}