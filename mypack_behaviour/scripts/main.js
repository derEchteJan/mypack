// Run the setup.cmd to install node modules for auto-complete and doc

import { world, system, DisplaySlotId, ObjectiveSortOrder, ScoreboardIdentity } from "@minecraft/server";
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

/**
 * @implements {BlockCustomComponent}
 */
class SpeziBlockComponent /*implements BlockCustomComponent*/ {
  constructor() {
    this.onStepOn = this.onStepOn.bind(this);
  }

  /** StepOnEvent handler
   * @param {BlockComponentStepOnEvent} event 
   * @param {CustomComponentParameters} params 
   */
  onStepOn(event, params) {
    if(event.entity !== undefined && event.entity.name !== undefined)
    {
      const bp = event.block.location;
      chat(event.entity.name + " stepped on the spezi block at " + bp.x + "," + bp.y + "," + bp.z);
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
    }
    /*

    const blockPos = event.block.location;
    event.dimension.runCommand('loot spawn ' +
      blockPos.x + ' ' +
      blockPos.y + ' ' +
      blockPos.z + ' loot strawberry_grown_crop'
    );
    */
    //event.block.setPermutation(event.block.permutation.withState('example:crop_age', 0));
  }
};
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