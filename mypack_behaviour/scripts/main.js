// Run the setup.cmd to install node modules for auto-complete and doc

import {
  world,
  system,
} from "@minecraft/server";

import { log, log_err, chat } from './logging.js'
import utils from './utils.js'

// block custom component classes
import FarmlandSlabComponent from "./blocks/farmland_slab.js"
import KennelComponent from "./blocks/kennel.js"
import RiceCropComponent from "./blocks/rice_crop.js"
import SharedChestComponent from "./blocks/shared_chest.js"
import SorterComponent from "./blocks/sorter.js"
import SpeziBlockComponent from "./blocks/spezi_block.js"

// item custom component classes
import VacuumRodComponent from "./items/vacuum_rod.js"
import DataRodComponent from "./items/data_rod.js"
import SortRodComponent from "./items/sort_rod.js"
import PetRodComponent from "./items/pet_rod.js"

// common logic / handler classes
import Pets from "./handlers/pets.js"
import Daytime from "./handlers/daytime.js"
import ShowCoords from "./handlers/show_coords.js"


// --- REGISTER EVENT HANDLERS ---

var daytime = new Daytime(); // daytime handler to elongate days
daytime.RegisterHandlers();

var pets = new Pets(); // pet handler for pet rod and kennel
pets.RegisterHandlers();

var showCoords = new ShowCoords(); // displays coordinates when holding maps etc.
showCoords.RegisterHandlers();


// --- REGISTER CUSTOM COMPONENTS ---

world.beforeEvents.worldInitialize.subscribe(initEvent => {
  // block custom components
  const blockComponents = initEvent.blockComponentRegistry;
  blockComponents.registerCustomComponent('mypack:spezi_block_component', new SpeziBlockComponent());
  blockComponents.registerCustomComponent('mypack:shared_chest_component', new SharedChestComponent());
  blockComponents.registerCustomComponent('mypack:kennel_component', new KennelComponent(pets));
  blockComponents.registerCustomComponent('mypack:sorter_component', new SorterComponent());
  blockComponents.registerCustomComponent('mypack:rice_crop_component', new RiceCropComponent());
  blockComponents.registerCustomComponent('mypack:farmland_slab_component', new FarmlandSlabComponent());
  
  // item custom components
  const itemComponents = initEvent.itemComponentRegistry;
  itemComponents.registerCustomComponent('mypack:vacuum_rod_component', new VacuumRodComponent());
  itemComponents.registerCustomComponent('mypack:data_rod_component', new DataRodComponent());
  itemComponents.registerCustomComponent('mypack:sort_rod_component', new SortRodComponent());
  itemComponents.registerCustomComponent('mypack:pet_rod_component', new PetRodComponent(pets));

  log("custom components registered");
});


// --- FUNCTIONS ---

// ...


// --- MAIN TICK LOOP ---

function mainTick() {
  var tick = system.currentTick;
  // put ontick handlers here if required
  // ...
  system.run(mainTick);
}

system.run(mainTick);


// --- GAMERULES AND INIT COMMANDS ---

utils.debug = false; // set debug mode for logging etc.

world.getDimension("overworld").runCommand("gamerule playerssleepingpercentage 1");
world.getDimension("overworld").runCommand("tickingarea add 0 -64 0 0 -64 0 shared_chest"); // set up ticking area for shared chest container


// --- SUCCESSFULL INIT ---

world.afterEvents.worldInitialize.subscribe(initEvent => {
  console.log("main.js world initialized");
});

console.log("main.js loaded");
