import {
  system,
  world,
  WorldAfterEvents,
  WorldBeforeEvents,
  Player,
  EntityHurtBeforeEvent,
  PlayerJoinAfterEvent,
  PlayerLeaveBeforeEvent,
  PlayerHotbarSelectedSlotChangeAfterEvent
} from "@minecraft/server";

import utils from '../utils.js'
import { log, log_err, chat } from "../logging.js"

const s_afkCheckInterval = 20;
const s_afkDelay = 2400;
const s_afkDelayDebug = 100;
const s_afkDeltaPosThres = 0.1;
const s_afkDeltaViewDirThres = 0.005;

//function round(val) { return Math.round(val * 1000) / 1000; }

export default class Afk {

    /** Player enters afk state
     * @param {Player} player subject player
     */
    static StartAfk(player)
    {
        if(!player.isAfk)
        {
            const rawMsg = { rawtext: [ { text: "§7" + player.name + " is now afk§r" } ] };
            world.sendMessage(rawMsg);
        }
        Afk.ApplyEffects(player, true);
        player.isAfk = true;
    }

    /** Player leaves afk state
     * @param {Player} player subject player
     */
    static StopAfk(player)
    {
        if(player.isAfk)
        {
            Afk.ApplyEffects(player, false);
            const rawMsg = { rawtext: [ { text: "§7" + player.name + " is no longer afk§r" } ] };
            world.sendMessage(rawMsg);
        }
        player.isAfk = false;
        player.afkSince = null;
        player.lastViewDir = null;
        player.lastPos = null;
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

    /**
     * @param {Player} player player
     * @returns 
     */
    static IsStandingStill(player)
    {
        if(!player.lastPos) return false;
        if(!player.lastViewDir) return false;

        const viewDir = player.getViewDirection();

        const dx = Math.abs(player.location.x - player.lastPos.x);
        const dy = Math.abs(player.location.y - player.lastPos.y);
        const dz = Math.abs(player.location.z - player.lastPos.z);

        const drx = Math.abs(player.lastViewDir.x - viewDir.x);
        const dry = Math.abs(player.lastViewDir.y - viewDir.y);
        const drz = Math.abs(player.lastViewDir.z - viewDir.z);

        //chat("deltas: " + dx + ","+ dy + ","+ dz + ","+ round(drx) + ","+ round(dry) + ","+ round(drz));
        return dx < s_afkDeltaPosThres 
            && dy < s_afkDeltaPosThres
            && dz < s_afkDeltaPosThres
            && drx < s_afkDeltaViewDirThres
            && dry < s_afkDeltaViewDirThres
            && drz < s_afkDeltaViewDirThres;
    }

    static UpdateAfkPlayers()
    {
        world.getPlayers().forEach((player) => 
        {
            if(Afk.IsStandingStill(player))
            {
                var currentTime = system.currentTick;
                if(player.afkSince)
                {
                    const dt = currentTime - player.afkSince;
                    //chat("standing still for: " + dt + "/" + s_afkDelay);
                    const delay = utils.debug ? s_afkDelayDebug : s_afkDelay;
                    if(dt >= delay)
                    {
                        Afk.StartAfk(player);
                    }
                }
                else
                {
                    player.afkSince = currentTime;
                }
            }
            else
            {
                Afk.StopAfk(player);
            }

            player.lastPos = player.location;
            player.lastViewDir = player.getViewDirection();
        });
    }

    /** Handler when and entity damages another
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

    /** Handler when a player changes hotbar selection
     * @param {PlayerHotbarSelectedSlotChangeAfterEvent} event event
     */
    static OnHotbarChanged(event)
    {
        // Stop afk when hotbar slot changed
        Afk.StopAfk(event.player);
    }

    RegisterHandlers()
    {
        system.runInterval(Afk.UpdateAfkPlayers, s_afkCheckInterval);
        world.beforeEvents.entityHurt.subscribe(Afk.OnEntityHurt);
        world.afterEvents.playerHotbarSelectedSlotChange.subscribe(Afk.OnHotbarChanged);
    }
}