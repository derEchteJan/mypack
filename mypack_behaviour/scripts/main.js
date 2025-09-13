// Run the setup.cmd to install node modules for auto-complete and doc

import {
  world,
  system,
  EquipmentSlot,
  EntityComponentTypes,
  Entity,
  EntityLoadAfterEvent,
  EntitySpawnAfterEvent,
  EntityLoadAfterEventSignal,
  EntityIsTamedComponent,
  PlayerInteractWithEntityAfterEvent,
  EntityEquippableComponent,
  EntityLeashableComponent,
  EntityRideableComponent,
  EntityProjectileComponent,
  EntityInventoryComponent
} from "@minecraft/server";

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

// -> TODO move to optional handler classes

var hookRides = world.getDimension("overworld").getEntities(null); hookRides.length = 0; // trick to type hint on array
var hookPaths = [{ start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 0, z: 0 } }]; hookPaths.length = 0;

world.afterEvents.projectileHitBlock.subscribe(event => {
  if(event.projectile.typeId === "mypack:hook_projectile")
  {
    // hook landed
    SpawnRope(event.projectile, event.source);
  }
});

world.afterEvents.entitySpawn.subscribe(event => {
  if(event.entity.typeId === "minecraft:arrow")
  {
    var arrow = event.entity;
    var player = arrow.getComponent(EntityProjectileComponent.componentId).owner;
    var equipment = player.getComponent(EntityEquippableComponent.componentId);
    if(equipment)
    {
      const offhandStack = equipment.getEquipment("Offhand");
      if(offhandStack && offhandStack.typeId === "mypack:hook_arrow")
      {
        // replace arrow with hook_projectile
        const loc = arrow.location;
        const dim = arrow.dimension;
        
        var vel = arrow.getVelocity();
        const velFactor = 0.5;
        vel.x *= velFactor;
        vel.y *= velFactor;
        vel.z *= velFactor;

        arrow.kill();
        arrow = null;

        var hook = dim.spawnEntity("mypack:hook_projectile", loc);
        var projectile = hook.getComponent(EntityProjectileComponent.componentId);
        var leashable = hook.getComponent(EntityLeashableComponent.componentId);
        projectile.shoot(vel);
        projectile.owner = player;
        leashable.leashTo(player);

        //hook.clearVelocity();
        //hook.applyImpulse(vel);
      }
    }
  }
})

world.afterEvents.playerButtonInput.subscribe(event =>{
  if(event.button === "Jump" && event.newButtonState === "Pressed")
  {
    const player = event.player;
    if(player.getTags().includes("mypack:riding_hook_ride"))
    {
      player.removeTag("mypack:riding_hook_ride");
      for(var hookRide of hookRides)
      {
        var ridable = hookRide.getComponent(EntityRideableComponent.componentId);
        var rider = ridable.getRiders().at(0);
        if(rider && rider.id === player.id)
        {
          EjectRiderFrom(hookRide);
          break;
        }
      }
    }
  }
});

world.afterEvents.playerInteractWithEntity.subscribe(event =>
{
  //chat(event.player.name + " interacted with " + event.target.typeId);
  var entity = event.target;

  if(entity.typeId === "mypack:hook_ride")
  {
    var ridable = entity.getComponent(EntityRideableComponent.componentId);
    if(ridable)
    {
      var rider = ridable.getRiders().at(0);
      if(rider)
      {
        entity.addTag("mypack:hook_ride_used");
      }
    }
  }
  if(entity.typeId === "mypack:hook_anchor")
  {
    // start hook ride
    var spawnLoc = entity.location;
    spawnLoc.y += 0.5;
    var spawnedRide = entity.dimension.spawnEntity("mypack:hook_ride", spawnLoc);
    if(spawnedRide)
    {
      var ridable = spawnedRide.getComponent(EntityRideableComponent.componentId);
      if(ridable)
      {
        ridable.addRider(event.player);
        event.player.addTag("mypack:riding_hook_ride");
        spawnedRide.addTag("mypack:hook_ride_used");
        hookRides.push(spawnedRide);
      }
      var leashable = entity.getComponent(EntityLeashableComponent.componentId);
      if(leashable.isLeashed && leashable.leashHolder)
      {
        var start = leashable.leashHolder;
        var end = entity;
        spawnedRide.pathEntities = { start: start, end: end };
        spawnedRide.pathDirection = 1; // can be 1, 0 or -1
        spawnedRide.rider = event.player;
      }
    }
  }
  else
  {
    chat("interacted with " + entity.typeId);
  }
});

/** Spawns rope between player and hook_projectile after
 *  the hook has landed on a block
 * @param {Entity} hook_projectile 
 * @param {Player} player 
 */
function SpawnRope(hook_projectile, player) {
  
  if(!player) return;
  if(hook_projectile.hasTag("mypack:hook_landed")) return;
  hook_projectile.addTag("mypack:hook_landed");

  const loc1 = player.location;
  var anchor1 = player.dimension.spawnEntity("mypack:hook_anchor", loc1);

  const loc2 = hook_projectile.location;
  var anchor2 = player.dimension.spawnEntity("mypack:hook_anchor", loc2);

  var leashable1 = anchor1.getComponent(EntityLeashableComponent.componentId);
  var leashable2 = anchor2.getComponent(EntityLeashableComponent.componentId);

  if(leashable1 && leashable2)
  {
    leashable1.leashTo(anchor2);
  }

  var l3 = hook_projectile.getComponent(EntityLeashableComponent.componentId);
  if(l3)
    l3.unleash();
}

function UpdateHookRides()
{
  // remove hookrides that are invalid entities

  hookRides = hookRides.filter(entity => {
    return entity.isValid;
  });

  // kill and remove rides that have been used already

  for(var i = 0; i < hookRides.length; i++)
  {
    var hookRide = hookRides.at(i);
    var kill = true;

    var ridable = hookRide.getComponent(EntityRideableComponent.componentId);
    if(ridable && ridable.getRiders().at(0))
    {
      kill = false;
    }
    else if(!hookRide.getTags().includes("mypack:hook_ride_used"))
    {
      kill = false;
    }

    if(kill)
    {
      //hookRide.kill(); // MARK JAN: tp and kill delayed to supress sound
      hookRides.splice(i, 1);
      i--;
    }
  }
}

/**
 * @param { Entity } hookRide 
 */
function EjectRiderFrom(hookRide)
{
  chat("ejecting");
  var ridable = hookRide.getComponent(EntityRideableComponent.componentId);
  if(ridable)
  {
    var rider = ridable.getRiders().at(0);
    if(rider)
    {
      ridable.ejectRider(rider);
      hookRide.teleport({x: 0, y: -63, z: 0});
      // MARK JAN: tp and kill delayed to supress sound
    }
  }
}

/** Returns angle between 2 vectors
 * @param {Vector3} vec1 first vector
 * @param {Vector3} vec2 second vector
 * @returns {number} angle
 */
function AngleBetween(vec1, vec2)
{
  var dotProd = vec1.x*vec2.x + vec1.y*vec2.y + vec1.z*vec2.z;
  var magn1 = Math.sqrt(vec1.x*vec1.x + vec1.y*vec1.y + vec1.z*vec1.z);
  var magn2 = Math.sqrt(vec2.x*vec2.x + vec2.y*vec2.y + vec2.z*vec2.z);
  return Math.acos(dotProd / (magn1 * magn2));
}

/** Vector3 to string
 * @param {Vector3} vec
 * @returns {string}
 */
function vec2str(vec)
{
  return "{ x: " + vec.x + ", y: " + vec.y + ", z: " + vec.z + " }";
}

function UpdateHookRidesMovement()
{
  for(var hookRide of hookRides)
  {
    if(!hookRide.isValid) continue;

    hookRide.clearVelocity();

    if(hookRide.pathEntities)
    {
      var endEntity = hookRide.pathEntities.end;
      var startEntity = hookRide.pathEntities.start;
      var destEntity = null;

      if(!endEntity.isValid) continue;
      if(!startEntity.isValid) continue;

      var end = endEntity.location; // todo swap depending on player look direction
      var start = startEntity.location;
      var dest = null;

      // check look angle

      if(hookRide.rider && hookRide.rider.isValid)
      {
        const lookDir = hookRide.rider.getViewDirection();

        var lx = end.x - start.x;
        var ly = end.y - start.y;
        var lz = end.z - start.z;

        const connDir = { x: lx, y: ly, z: lz };
        
        var angle = AngleBetween(lookDir, connDir);

        if(angle < 0.5)
        {
          destEntity = endEntity;
          dest = destEntity.location;
        }
        if(angle > 2.5)
        {
          destEntity = startEntity;
          dest = destEntity.location;
        }
      }

      // move if destination determined based on angle

      if(dest)
      {
        const vel = 0.1;        // total vector magnitude / speed
        const targetYOff = 0.3;

        var dx = dest.x - hookRide.location.x; 
        var dy = dest.y - hookRide.location.y + targetYOff; 
        var dz = dest.z - hookRide.location.z;

        const magn = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const thres = 0.5; // smaller than this means round to 0

        if(magn < thres + targetYOff)
        {
          // arrived
          chat("arrived");
          EjectRiderFrom(hookRide);
          return;
        }
        else
        {
          const round = 1000; // round to 3 decimal points

          if(Math.abs(dx) < thres) dx = 0; else dx = Math.round((dx * vel / magn) * round) / round;
          if(Math.abs(dy) < thres) dy = 0; else dy = Math.round((dy * vel / magn) * round) / round;
          if(Math.abs(dz) < thres) dz = 0; else dz = Math.round((dz * vel / magn) * round) / round;

          //chat("dx: " + dx + ", dy: " + dy + ", dz: " + dz);

          hookRide.applyImpulse({x: dx, y: dy, z: dz});
        }
      }
    }
    else
    {
      //hookRide.applyImpulse({ x: 0, y: 0, z: 0.5 });
    }
  }
}


// --- MAIN TICK LOOP ---

function mainTick() {
  var tick = system.currentTick;
  if(tick % 20 === 0) UpdateHookRides();
  if(tick % 5  === 0) UpdateHookRidesMovement();
  system.run(mainTick);
}

// start running main tick loop
system.run(mainTick);


// --- GAMERULES AND COMMANDS ---

world.getDimension("overworld").runCommand("gamerule playerssleepingpercentage 1");


// --- SUCCESSFULL INIT ---

console.log("main.js initialized");