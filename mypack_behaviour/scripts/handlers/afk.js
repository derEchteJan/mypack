import {
  system,
  world,
  WorldAfterEvents,
  WorldBeforeEvents,
  Player,
  EntityHurtBeforeEvent,
  PlayerJoinAfterEvent,
  PlayerLeaveBeforeEvent
} from "@minecraft/server";

import { log, log_err, chat } from "../logging.js"

const s_afkCheckInterval = 20;
const s_afkDelay = 200;

export default class Afk {

    /** Player enters afk state
     * @param {Player} player subject player
     */
    static StartAfk(player)
    {
        Afk.ApplyEffects(player, true);
        player.isAfk = true;
        const rawMsg = { rawtext: [ { text: "§7" + player.name + " is now afk§r" } ] };
        world.sendMessage(rawMsg);
    }

    /** Player leaves afk state
     * @param {Player} player subject player
     */
    static StopAfk(player)
    {
        Afk.ApplyEffects(player, false);
        player.isAfk = false;
        const rawMsg = { rawtext: [ { text: "§7" + player.name + " is no longer afk§r" } ] };
        world.sendMessage(rawMsg);
    }

    /** Adds/removes afk protection effecs from player
     * @param {Player} player player
     * @param {boolean} add add/remove effects
     */
    static ApplyEffects(player, add)
    {
        if(add)
        {
            const effectDur = s_afkCheckInterval + 2;
            const effectParams = { amplifier: 255, showParticles: false };
            player.addEffect('invisibility', effectDur, effectParams);
            player.addEffect('resistance', effectDur, effectParams);
        }
        else
        {
            player.removeEffect('invisibility');
            player.removeEffect('resistance');
        }
    }

    static UpdateAfkPlayers()
    {
        world.getPlayers().forEach((player) => 
        {
            if(player.lastPos)
            {
            if(  player.location.x == player.lastPos.x
                && player.location.y == player.lastPos.y
                && player.location.z == player.lastPos.z)
            {
                var currentTime = system.currentTick;
                if(player.afkSince)
                {
                    const dt = currentTime - player.afkSince;
                    if(dt >= s_afkDelay)
                    {
                        if(player.isAfk)
                        {
                            Afk.ApplyEffects(player, true);
                        }
                        else
                        {
                            Afk.StartAfk(player);
                        }
                    }
                }
                else
                {
                    player.afkSince = currentTime;
                }
            }
            else if(player.isAfk)
            {
                Afk.StopAfk(player);
            }
            }
            player.lastPos = player.location;
        });
    }

    /**
     * @param {EntityHurtBeforeEvent} event event
     */
    static OnEntityHurt(event)
    {
        // Prevent afk players from being damaged
        const entity = event.hurtEntity;
        if(entity.typeId === 'minecraft:player' && entity.isAfk)
        {
            event.cancel = true;
        }
    }

    /**
     * 
     * @param {PlayerLeaveBeforeEvent} event 
     */
    //static OnPlayerLeave(event)
    //{
    //    if(event.player.isAfk)
    //    {
    //        Afk.StopAfk(event.player);
    //    }
    //}

    RegisterHandlers()
    {
        system.runInterval(Afk.UpdateAfkPlayers, s_afkCheckInterval);
        world.beforeEvents.entityHurt.subscribe(Afk.OnEntityHurt);
        //world.beforeEvents.playerLeave.subscribe(Afk.OnPlayerLeave);
    }
}