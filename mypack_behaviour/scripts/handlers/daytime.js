
import { system, world } from "@minecraft/server"

/** Daytime handler class,
 *  Adjusts time for days to run 4x slower
 */
export default class Daytime {

    m_lastTime = 0;
    m_daylightCycleLen = 24000;

    constructor() {
        this.RegisterHandlers = this.RegisterHandlers.bind(this);
        this.OnTick = this.OnTick.bind(this);
    }

    AdjustDayTime() {
        var time = world.getAbsoluteTime();
        var daytime = world.getTimeOfDay();
        if (time === this.m_lastTime) return;
        if (system.currentTick % 4 !== 0) {
            time = (time - 1);
            daytime = (time % this.m_daylightCycleLen);
        }
        world.setAbsoluteTime(time);
        if (daytime > 0) world.setTimeOfDay(daytime);
        this.m_lastTime = time;
    }

    OnTick()
    {
        this.AdjustDayTime();
        system.run(this.OnTick);
    }

    RegisterHandlers() {
        system.run(this.OnTick);
    }
}