// Run the setup.cmd to install node modules for auto-complete and doc

import {
  system,
  world,
  WorldAfterEvents,
  Player,
  EntityProjectileComponent,
  EntitySpawnAfterEvent,
  Entity
} from "@minecraft/server";

import { log, log_err, chat } from './logging.js'
import utils from './utils.js'
import Vector3 from './vector.js'

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
import Afk from "./handlers/afk.js"
import Pets from "./handlers/pets.js"
import Daytime from "./handlers/daytime.js"
import ShowCoords from "./handlers/show_coords.js"

// --- LOAD PACK SETTINGS ---

utils.debug = false; // set debug mode for logging etc.

// --- REGISTER EVENT HANDLERS ---

var afk = new Afk();
afk.RegisterHandlers();

var daytime = new Daytime(); // daytime handler to elongate days
daytime.RegisterHandlers();

var pets = new Object(); // pet handler for pet rod and kennel
if(utils.debug)
{
  pets = new Pets();
  pets.RegisterHandlers();
}

var showCoords = new ShowCoords(); // displays coordinates when holding maps etc.
showCoords.RegisterHandlers();

// --- CROSSBOW TEST ---

/*
world.afterEvents.projectileHitEntity.subscribe(event => {
  const projectile = event.projectile;
  const entity = event.getEntityHit().entity;

  if(!entity || !projectile) return;
  if(!entity.isValid() || !projectile.isValid()) return;

  if(entity.getDynamicProperty("mypack:arrow1") === true)
  {
    chat("special arrow hit " + entity.typeId());
  }
});
*/

// --- HOAMING ARROW TEST ---

var s_arrow = null;
var s_target = null;
var s_impulseCounter = 0;
var s_impulseRepeatCount = 12;
var s_impulseInterval = 2;

/**
 * @param { Vector3 } origin
 */
function GetTarget(origin)
{
  const options =
  {
    closest: 1,
    location: origin,
    tags: [ "dummy_tag" ]
  }
  var target = world.getDimension('overworld').getEntities(options)[0];
  chat("target: " + (target ? target.typeId : "none"));
  return target;
}

/** Apply hoaming vector
 * @param {Entity} arrow 
 * @param {Entity} target 
 */
function ApplyImpulse(arrow, target)
{
  s_impulseCounter += 1;

  var targetLocation = new Vector3(target.location);
  var targetVel = new Vector3(target.getVelocity());
  targetLocation.add(targetVel, 3);

  var toTarget = new Vector3(targetLocation);
  toTarget.subtract(arrow.location);
  var motion = new Vector3(arrow.getVelocity());

  toTarget.normalize();
  //toTarget.round();

  motion.normalize();
  //motion.round();

  toTarget.ortho_project_onto(motion);

  var i = toTarget;
  i.scale(0.1);
  i.normalize();
  i.y = 0;

  if(i.is_nan())
  {
    s_target = null;
    s_arrow = null;
    s_impulseCounter = 0;
    return;
  }

  chat("impulse: " + i.to_string());
  arrow.applyImpulse(i);
  var newVel = new Vector3(arrow.getVelocity());
  newVel.round();
  chat("new vel: " + newVel.to_string());
}

if(utils.debug)
{

world.afterEvents.entitySpawn.subscribe(event => {
  const entity = event.entity;
  if(entity.typeId === 'minecraft:arrow')
  {
    const projectile = entity.getComponent(EntityProjectileComponent.componentId);
    if(projectile)
    {
      const owner = projectile.owner;
      if(owner && owner.typeId === 'minecraft:player')
      {
        //chat("\nshot arrow");
        const arrow = entity;
        //arrow.applyImpulse({x: 0, y: 2, z: 0});
        const target = GetTarget(arrow.location);
        if(!target) return;
        s_target = target;
        s_arrow = arrow;
        s_impulseCounter = 0;
      }
    }
  }
});

system.runInterval(() => {
  if(s_target && s_arrow)
  {
    if(!s_target.isValid || !s_arrow.isValid || s_impulseCounter > s_impulseRepeatCount )
    {
      s_target = null;
      s_arrow = null;
      s_impulseCounter = 0;
      return;
    }
    ApplyImpulse(s_arrow, s_target);
  }
}, s_impulseInterval)

}

// --- SPEAR TEST ---

/*
world.afterEvents.entitySpawn.subscribe(event => {
  let entity = event.entity;
  if(entity.typeId === "mypack:spear")
  {
    let comp = entity.getComponent(EntityProjectileComponent.componentId);
    if(comp)
    {
      entity.clearVelocity();

      log("spawned spear");
      let player = world.getPlayers()[0];
      let viewDir = player.getViewDirection();

      //entity.lookAt(viewDir);
      entity.setRotation(viewDir);
      let delay = 1;
      system.runTimeout(() => {
        comp.shoot(viewDir);
      }, delay);
      system.runTimeout(() => {
        entity.setRotation(viewDir);
      }, delay+1);
    }
  }
});
*/

// --- REGISTER CUSTOM COMPONENTS ---

var s_componentsRegistered = false;

system.beforeEvents.startup.subscribe((initEvent) => {
  // NOTE: older versions used world.beforeEvents.worldInitialize.subscribe

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

  s_componentsRegistered = true; // set true to log later in lifecycle when chat is avaliable
});


// --- FUNCTIONS ---

// --- BOAT / MINECART PICKUP HANDLER

// Destroy boats and minecarts onehit while sneaking
// TODO: move to dedicated handler class

world.afterEvents.entityHitEntity.subscribe(event => {
  if(event.damagingEntity.typeId === 'minecraft:player'
    && (event.hitEntity.typeId === 'minecraft:boat' || event.hitEntity.typeId === 'minecraft:minecart')
    && event.damagingEntity.isSneaking)
  {
    event.hitEntity.applyDamage(256);
  }
});

// apply slow falling to trader when he spawns to prevent destruction of crops
world.afterEvents.entitySpawn.subscribe(event => {
  const entity = event.entity;
  if(!entity.isValid) return;
  if(entity.typeId === 'minecraft:wandering_trader')
  {
    entity.addEffect("slow_falling", 20000000);
  }
});

// --- VILLAGER ON-HIT HANDLER ---

// prevents players accidentally hitting villagers, unless they crouch
// pushes villagers instead to allow moving them more easily
// TODO: move to dedicated handler class

const s_pushCooldown = 12;
const s_pushForce = 0.6;
const s_pushForceVert = 0.3;

world.beforeEvents.entityHurt.subscribe(event => {
  const damaging = event.damageSource.damagingEntity;
  const damaged = event.hurtEntity;
  if(damaging && damaging.typeId === 'minecraft:player' && damaged.typeId.startsWith('minecraft:villager'))
  {
    if(!damaging.isSneaking)
    {
      event.cancel = true;
      var impulse = new Vector3(damaging.getViewDirection());
      impulse.normalize();
      impulse.scale(s_pushForce);
      impulse.y = s_pushForceVert;
      if(!damaged.pushOnCooldown)
      {
        damaged.pushOnCooldown = true;
        system.runTimeout(() => {
          if(!damaged.isValid) return;
          damaged.applyImpulse(impulse);
        });
        system.runTimeout(() => {
          if(!damaged.isValid) return;
          damaged.pushOnCooldown = false;
        }, s_pushCooldown);
      }
    }
  }
});

// --- MAIN TICK LOOP ---

// example for tick loop:
/*
function mainTick() {
  var tick = system.currentTick;
  // put ontick handlers here if required
  // ...
  system.run(mainTick);
}
system.run(mainTick);
*/

// --- GAMERULES AND INIT COMMANDS ---

world.afterEvents.worldLoad.subscribe(initEvent => {
  // NOTE: older versions used orld.afterEvents.worldInitialize.subscribe
  if(s_componentsRegistered)
    {
      log("custom components registered");
    }
    world.getDimension("overworld").runCommand("gamerule playerssleepingpercentage 1");
    world.getDimension("overworld").runCommand("tickingarea add 0 -64 0 0 -64 0 shared_chest"); // set up ticking area for shared chest container
});
  
// --- SUCCESSFULL INIT ---

console.log("main.js loaded");
