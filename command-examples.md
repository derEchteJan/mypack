# Command examples:

check if player is holding the custom test item in hand:

/execute as @a[hasitem={item=mypack:test, location=slot.weapon.mainhand}] run say playerhas test item in hand


# scoreboards

/scoreboard players set @a scoreboard_demo_objective 0

# display toast message:

/title @a actionbar my message

# dyn props:

player.setDynamicProperty("number_value", 12); // sets a number property on the player.

# udpate scoreborards example

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

# swap contianers

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

# register inventory component

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

# list container

/** list inventory component of a block
 * @param {Container} container
 * @returns
 */
function listInventory(container)
{
  // lists contents of a container

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
    chat("container is null");
  }
}


# listen to entitiy spawn envent

import { world, system, EntitySpawnAfterEvent, DimensionLocation } from "@minecraft/server";
import { Vector3Utils } from "@minecraft/math";

function logEntitySpawnEvent(
  log: (message: string, status?: number) => void,
  targetLocation: DimensionLocation
) {
  // register a new function that is called when a new entity is created.
  world.afterEvents.entitySpawn.subscribe((entityEvent: EntitySpawnAfterEvent) => {
    if (entityEvent && entityEvent.entity) {
      log(`New entity of type ${entityEvent.entity.typeId} created!`, 1);
    } else {
      log(`The entity event did not work as expected.`, -1);
    }
  });

  system.runTimeout(() => {
    targetLocation.dimension.spawnEntity(
      "minecraft:horse<minecraft:ageable_grow_up>",
      Vector3Utils.add(targetLocation, { x: 0, y: 1, z: 0 })
    );
  }, 20);
}