// Run the setup.cmd to install node modules for auto-complete and doc

import { world, system, DisplaySlotId, ObjectiveSortOrder, ScoreboardIdentity, DimensionType, BlockInventoryComponent } from "@minecraft/server";
import { EquipmentSlot, ItemStack, Player, EntityComponentTypes } from '@minecraft/server';

/** logs message to console and world chat
 * @param {string} message
 */
function log(message) {
  console.log("main.js: " + message);
  world.sendMessage("main.js: " + message);
}

/** logs message to world chat
 * @param {string} message
 */
function chat(message) {
  world.sendMessage("main.js: " + message);
}

/** example of how to set a scoreboard value
 */
function updateScoreboard() {
  const scoreboardObjectiveId = "scoreboard_demo_objective";
  const scoreboardObjectiveDisplayName = "Demo Objective";

  const players = world.getPlayers();

  // Ensure a new objective.
  let objective = world.scoreboard.getObjective(scoreboardObjectiveId);

  if (!objective) {
    objective = world.scoreboard.addObjective(scoreboardObjectiveId, scoreboardObjectiveDisplayName);
  }

  // get the scoreboard identity for player 0
  const player = players[0].scoreboardIdentity;

  log("player count: " + players.length);

  if (player === undefined) {
    // if this fails here run:
    // > /scoreboard players set @a scoreboard_demo_objective 0
    // to be ran beforehand to add the player to the scoreboard
    log("Could not get a scoreboard identity for player 0.");
    return -1;
  }

  // initialize player score to 100;
  objective.setScore(player, 100);

  world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, {
    objective: objective,
    sortOrder: ObjectiveSortOrder.Descending,
  });

  const playerScore = objective.getScore(player) ?? 0;

  // score should now be 110.
  objective.setScore(player, playerScore + 10);
}

/** checks for players holding a map or compass and
 *  displays their coordinates as an action bar title
 */
function checkPlayersHoldingMap() {
  world.getPlayers().forEach((player) => {

    const equipmentComponent = player.getComponent(EntityComponentTypes.Equippable);
    if (equipmentComponent) {
      var mainHandEquipment = equipmentComponent.getEquipment(EquipmentSlot.Mainhand);
      if (mainHandEquipment) {
        if (mainHandEquipment.typeId === "minecraft:filled_map"
          || mainHandEquipment.typeId === "minecraft:compass"
          || mainHandEquipment.typeId === "minecraft:lodestone_compass"
          || mainHandEquipment.typeId === "minecraft:recovery_compass") {
          //log(player.name + " has map in hand");
          var px = Math.round(player.location.x);
          var py = Math.round(player.location.y);
          var pz = Math.round(player.location.z);
          var cordsText = "x:" + px + " y:" + py + " z:" + pz;
          world.getDimension("overworld").runCommandAsync("title \"" + player.name + "\" actionbar " + cordsText);
        }
      }
    }

  });
}

const daylightCycleLen = 24000;
var daylightCycleScale = 0.25;

/**
 * Adjusts day time to make days longer, needs to run every tick
 */
function setDayTime() {
  var absTime = world.getAbsoluteTime();
  var time = world.getTimeOfDay()
  if (system.currentTick % 4 === 0) {
  }
  else {
    absTime = absTime - 1;
    time = time - 1;
  }
  world.setAbsoluteTime(absTime);
  world.setTimeOfDay(time);
}

var lastTimeTick = system.currentTick;

/**
 * Adjusts day time to make days longer, todo: can run at any interval
 */
function setDayTime2() {
  deltaTicks = system.currentTick - lastTimeTick;

  var absTime = world.getAbsoluteTime();


  lastTimeTick = system.currentTick;
}

// ------------------------------------------------------------------------------------------------------------------------------------------

import { BlockComponentStepOnEvent } from "@minecraft/server";

/** SpeziBlockComponent - custom component for the spezi block, overrides event listeners
 * @implements {BlockCustomComponent}
 */
class SpeziBlockComponent {
  
  memberTest = false;
  
  constructor() {
    // bind this otherwise this is null in those functions and
    // internal state cannot be used (works fine though)
    this.onStepOn = this.onStepOn.bind(this);
    this.onPlayerInteract = this.onPlayerInteract.bind(this);
  }

  /** StepOnEvent handler
   * @param {BlockComponentStepOnEvent} event 
   * @param {CustomComponentParameters} params 
   */
  onStepOn(event, params) {
    if(event.entity !== undefined && event.entity.name !== undefined)
    {
      const bp = event.block.location;
      chat(event.entity.name + " stepped on the spezi block at " + bp.x + "," + bp.y + "," + bp.z + " touched: " + this.memberTest);
    }
    else
    {
      log("stepped on spezi block (unnamed entity)");
    }
    
    //e.block.setPermutation(BlockPermutation.resolve(MinecraftBlockTypes.Air));
  }

  /** PlayerInteractEvent handler
   * @param {BlockComponentPlayerInteractEvent} event
   * @param {CustomComponentParameters} params
   * @returns 
   */
  onPlayerInteract(event, params) {
    if (event.player === undefined) {
      chat("player interact event (no player)");
      return;
    }
    else {
      const bp = event.block.location;
      chat(event.player.name + " thouched the spezi block at " + bp.x + "," + bp.y + "," + bp.z);

      const aboveBlock = event.block.above(1);

      if(aboveBlock)
      {
        chat("above block id: " + aboveBlock.typeId);

        var inventory = aboveBlock.getComponent(BlockInventoryComponent.componentId);
        if(inventory)
        {
          chat("listing inventory of block");
          listInventory(inventory);
          registerInventory(inventory);
        }
        else
        {
          chat("block has no inventory");
          if(aboveBlock.typeId === "minecraft:cobblestone")
          {
            swapContainers(subject1, subject2);
          }
        }
      }
      else
      {
        chat("no above block found");
      }
    }
  }
};

/** list inventory component of a block
 * @param {BlockInventoryComponent} inventory
 * @returns
 */
function listInventory(inventory)
{
  // lists inventory, can be transfered to other chests containers
  // todo: backup original contents somewhere while special block is underneath, but where? (maybe custom component is capable)
  var container = inventory.container;
  if(container)
  {
    const containerSize = container.size;
    if(container.size === 0) chat("container empty");
    for(var i = 0; i < containerSize; i++)
    {
      var item = container.getItem(i);
      if(item)
      {
        chat("item: " + item.typeId + ", count: " + item.amount);
      }
    }
  }
  else
  {
    chat("inventory has no container");
  }
}

var subject1;
var subject2;

/** registers inventory for exchange
 * @param {BlockInventoryComponent} inventory
 * @returns
 */
function registerInventory(inventory)
{
  var container = inventory.container;
  if(container)
  {
    if(subject1 === undefined) { subject1 = container; chat("first container registered"); return; }
    if(subject2 === undefined) { subject2 = container; chat("first container registered"); return; }
    else { chat("2 containers already registered"); return; }
  }
  else
  {
    chat("inventory has no container");
  }
}

/**
 * @param {Container} lhs 
 * @param {Container} rhs 
 */
function swapContainers(lhs, rhs)
{
  if(lhs === undefined || rhs === undefined) { chat("please register 2 containers"); return; }

  const size = lhs.size;
  var transferedCount = 0;
  for(var i = 0; i < size; i++)
  {
    if(lhs.getItem(i))
    {
      lhs.transferItem(i, rhs);
      transferedCount += 1;
    }
  }
  chat("containers swapped (transfered " + transferedCount + " stacks)");
}

world.beforeEvents.worldInitialize.subscribe(initEvent => {
  initEvent.blockComponentRegistry.registerCustomComponent('mypack:spezi_block_component', new SpeziBlockComponent());
  log("mypack:spezi_block_component registered");
});

// ------------------------------------------------------------------------------------------------------------------------------------------


function mainTick() {
  if (system.currentTick % 250 === 0) {
    //log("my tick function");
    //updateScoreboard();
    //checkPlayersHoldingMap();
  }
  if (system.currentTick % 10 === 0) {
    checkPlayersHoldingMap();
  }
  if (system.currentTick % 1 === 0) {
    setDayTime();
  }
  system.run(mainTick);
}

system.run(mainTick);
console.log("main.js: initialized, running mainTick() loop");