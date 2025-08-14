import { world } from "@minecraft/server";
import CombinerComponent from "./combiner.js"

world.beforeEvents.worldInitialize.subscribe(initEvent => {
  initEvent.blockComponentRegistry.registerCustomComponent('mypack:combiner_component', new CombinerComponent());
});