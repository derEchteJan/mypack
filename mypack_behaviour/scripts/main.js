// Run the setup.cmd to install node modules for auto-complete and doc

import {
  world,
  system,
  EquipmentSlot,
  EntityComponentTypes,

  EntityLoadAfterEvent,
  EntityLoadAfterEventSignal,
  EntityIsTamedComponent,
  PlayerInteractWithEntityAfterEvent
} from "@minecraft/server";

import CombinerComponent from "./combiner.js"
import SpeziBlockComponent from "./spezi_block.js"
import VacuumRodComponent from "./vacuum_rod.js"
import DataRodComponent from "./data_rod.js"
import SortRodComponent from "./sort_rod.js"
import PetRodComponent from "./pet_rod.js"
import SharedChestComponent from "./shared_chest.js"
import KennelComponent from "./kennel.js"
import SorterComponent from "./sorter.js"

import Pets from "./handlers/pets.js"
var pets = new Pets(); /**< pet handler for pet rod and kennel */
pets.RegisterHandlers();

// no shared instance required as of now
//import Sorting from "./handlers/sorting.js"
//var sorting = new Sorting(); /**< item sorting handler for sort rod and sorter block */

// --- UTILS ---

/** logs message to console and world chat
 * @param {string} message
*/
function log(message) {
  console.log("script: " + message);
  world.sendMessage("script: " + message);
}

/** logs message to world chat
 * @param {string} message
*/
function chat(message) {
  world.sendMessage("script: " + message);
}

// --- FUNCTIONS ---

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
var lastTimeTick = system.currentTick;

/**
 * Adjusts day time to make days longer, needs to run every tick
 */
function adjustDayTime() {
  var absTime = world.getAbsoluteTime();
  var time = world.getTimeOfDay()
  if (system.currentTick % 4 === 0) {
  }
  else {
    absTime = (absTime - 1);
    time = (time - 1);
    if(time === -1)
      time = daylightCycleLen - 1;
  }
  world.setAbsoluteTime(absTime);
  world.setTimeOfDay(time);
}

// --- REGISTER CUSTOM COMPONENTS ---

world.beforeEvents.worldInitialize.subscribe(initEvent => {
  // block components
  initEvent.blockComponentRegistry.registerCustomComponent('mypack:spezi_block_component', new SpeziBlockComponent());
  initEvent.blockComponentRegistry.registerCustomComponent('mypack:combiner_component', new CombinerComponent());
  initEvent.blockComponentRegistry.registerCustomComponent('mypack:shared_chest_component', new SharedChestComponent());
  initEvent.blockComponentRegistry.registerCustomComponent('mypack:kennel_component', new KennelComponent(pets));
  initEvent.blockComponentRegistry.registerCustomComponent('mypack:sorter_component', new SorterComponent());

  // item components
  initEvent.itemComponentRegistry.registerCustomComponent('mypack:vacuum_rod_component', new VacuumRodComponent());
  initEvent.itemComponentRegistry.registerCustomComponent('mypack:data_rod_component', new DataRodComponent());
  initEvent.itemComponentRegistry.registerCustomComponent('mypack:sort_rod_component', new SortRodComponent());
  initEvent.itemComponentRegistry.registerCustomComponent('mypack:pet_rod_component', new PetRodComponent(pets));

  log("custom components registered");
});

// --- MAIN TICK LOOP ---

function mainTick() {
  var tick = system.currentTick;
  if (tick % 10 === 0) {
    checkPlayersHoldingMap();
  }
  if (tick % 1 === 0) {
    adjustDayTime(); // TODO: check if gamerule doDaylightCycle == true
  }
  if (tick % 40 === 0)
  {

  }
  system.run(mainTick);
}

system.run(mainTick);

console.log("main.js initialized");