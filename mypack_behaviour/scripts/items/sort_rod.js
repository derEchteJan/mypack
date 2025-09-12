import {
    system,
    world,
    Block,
    Player,
    ItemStack,
    Container,
    ItemComponentUseEvent,
    ItemComponentUseOnEvent,
    BlockInventoryComponent,
} from "@minecraft/server";


import { MessageFormData, ActionFormData } from "@minecraft/server-ui";

import Sorting from "../handlers/sorting.js"
import utils from "../utils.js"


// --- UTILS ---

/** logs message to console and world chat
 * @param {string} message
*/
function log(message) {
    console.log(message);
    world.sendMessage(message);
}

/** logs message to world chat
 * @param {string} message
*/
function chat(message) {
    world.sendMessage(message);
}

/** logs error message
 * @param {string} message
*/
function logErr(message)
{
    console.log("error: " + message);
    world.sendMessage("error: " + message);
}


// --- DATA TYPES ---

class ContainerBlock
{
    block = Block;
    container = Container;
}


// --- CLASSES ---

class Mode
{
    static sort = "sort";
    static compact = "compact";
    static tally = "tally";
    static swap = "swap";

    static _values =       [ Mode.sort,    Mode.compact,    Mode.tally,    Mode.swap       ];
    static _displayNames = [ "Sort Items", "Compact Items", "Tally Items", "Swap Contents" ];
}

/** SortRodComponent
 * @implements {ItemCustomComponent}
 */
export default class SortRodComponent {

    // item mode
    m_sorting = new Sorting();
    m_modePropId = "mypack:sort_rod_mode";
    m_otherContainerPropId = "mypack:sort_rod_selected_container";
    m_cooldownTicks = 7;
    m_cooldownTimestamp = -1;

    constructor() {
        this.onUseOn = this.onUseOn.bind(this);
    }

    /**
     * OnUseOnEvent handler - called when item is used on a block
     * @param {ItemComponentUseOnEvent} event
     * @param {CustomComponentParameters} params
     */
    onUseOn(event, params)
    {
        if(!this.CheckCooldown()) return;

        const sorting = this.m_sorting;
        const player = event.source;
        const block = event.block;

        if(!player || !block) return;

        var inventory = block.getComponent(BlockInventoryComponent.componentId);
        if(inventory && inventory.container)
        {
            const container = inventory.container;
            var modeVal = this.GetItemMode(player);
            if(modeVal !== undefined && modeVal >= 0 && modeVal < Mode._values.length)
            {
                var mode = Mode._values[modeVal];
                if(mode === Mode.sort)    this.Sort(container, block, player);
                if(mode === Mode.compact) this.Compact(container, block, player);
                if(mode === Mode.tally)   this.Tally(container, block, player);
                if(mode === Mode.swap)    this.Swap(container, block, player);
            }
        }
        else
        {
            if(block.typeId === "mypack:sorter")
                sorting.HighlightSortingRange(block);
            else
                this.PresentModeForm(player);
        }
    }


    // --- CONTAINER ACTIONS ---

    /**
     * @param {Container} container
     * @param {Block} block
     * @param {Player} player
     */
    Sort(container, block, player)
    {
        const sorting = this.m_sorting;

        sorting.CompactItems(container);

        var tally = sorting.TallyItems(container, true);
        sorting.SortContainerBy(container, sorting.predicates.byWeighting(tally));

        sorting.HighlightContainer(block);
        player.sendMessage({ rawtext: [ { text: "§7" }, { translate: "mypack:sorted_container" }, { text: "§7r" } ] });
    }

    /**
     * @param {Container} container
     * @param {Block} block
     * @param {Player} player
     */
    Compact(container, block, player)
    {
        const sorting = this.m_sorting;
        sorting.CompactItems(container);

        sorting.HighlightContainer(block);
        player.sendMessage({ rawtext: [ { translate: "§7Compacted Container§r" } ] });
    }

    /**
     * @param {Container} container
     * @param {Block} block
     * @param {Player} player
     */
    Tally(container, block, player)
    {
        const sorting = this.m_sorting;
        var tally = sorting.TallyItems(container, true);

        player.sendMessage({ rawtext: [ { text: "§7Contents:§r" } ] });
        sorting.TallyMessage(player, tally);
    }

    /**
     * @param {Container} container
     * @param {Block} block
     * @param {Player} player
     */
    Swap(container, block, player)
    {
        const sorting = this.m_sorting;

        var selected = this.GetSelectedContainer(player);
        if(selected)
        {
            var size = Math.min(container.size, selected.container.size);
            for(var i = 0; i < size; i++)
            {
                container.swapItems(i, i, selected.container);
            }
            this.SwapFeedback(player, block, selected.block);
            this.SetSelectedContainer(null, player);
        }
        else
        {
            this.SetSelectedContainer(block, player);
        }
    }


    // --- CHANGE MODE ---

    /**
     * @param {Player} player
     */
    PresentModeForm(player) {
        var form = new ActionFormData()
            .title("Sort Rod Mode")
            .body("Change what happens when you press on a chest");
        
        for(var mode = 0; mode < Mode._values.length; mode++)
        {
            var dispName = Mode._displayNames.at(mode);
            form = form.button(dispName);
        }

        form.show(player).then((result) => {
            if (result.canceled) return -1;
            this.SetItemMode(result.selection, player);
        });
    }

    /**
     * @param {number} mode
     * @param {Player} player
     */
    SetItemMode(mode, player)
    {
        player.setDynamicProperty(this.m_modePropId, mode);
        this.ModeChangedFeedback(player, mode);
    }

    /**
     * @param {Player} player
     * @returns {number | undefined}
     */
    GetItemMode(player)
    {
        return player.getDynamicProperty(this.m_modePropId);
    }


    // --- OTHER METHODS ---

    /**
     * @param {Block | null} block 
     * @param {Player} player 
     */
    SetSelectedContainer(block, player)
    {
        const sorting = this.m_sorting;
        if(block)
        {
            player.setDynamicProperty(this.m_otherContainerPropId, block.location);
            sorting.HighlightContainer(block);
            const rawMessage = { rawtext: [ { text: "§7Swapping: Selected §r§3'" }, { translate: block.typeId }, { text: "'§r" } ] };
            player.sendMessage(rawMessage);
        }
        else
        {
            player.setDynamicProperty(this.m_otherContainerPropId, null);
        }
    }

    /**
     * @param {Player} player
     * @returns {ContainerBlock | undefined}
     */
    GetSelectedContainer(player)
    {
        var result = null;
        var location = player.getDynamicProperty(this.m_otherContainerPropId);
        if(location)
        {
            var block = player.dimension.getBlock(location);
            if(block)
            {
                var inv = block.getComponent(BlockInventoryComponent.componentId);
                if(inv) return { block: block, container: inv.container };
            }
        }
        return result;
    }

    /** Returns true if cooldown passed
     * @returns {boolean}
     */
    CheckCooldown()
    {
        var result = false;
        var tick = system.currentTick;
        if(this.m_cooldownTimestamp == -1 || tick - this.m_cooldownTimestamp > this.m_cooldownTicks)
        {
            result = true;
            this.m_cooldownTimestamp = tick;
        }
        return result;
    }

    // --- PLAYER FEEDBACK ---

    /**
     * @param {Player} player
     * @param {number} modeValue
     */
    ModeChangedFeedback(player, modeValue)
    {
        const modeName = Mode._displayNames[modeValue];
        const rawMessage = { rawtext: [ { text: "Set Mode §3'" }, { translate: modeName }, { text: "'§r" } ] };

        var stack = utils.GetHeldItem(player);
        if(stack)
        {
            //stack = stack.clone();
            const rawLore = [ "§7Mode: §r§3'" + modeName + "'§r" ]; // raw lore cant be translated? what the helly
            stack.setLore(rawLore);
            utils.SetHeldItem(player, stack, /*override:*/ true);
        }

        player.sendMessage(rawMessage);
    }

    /**
     * @param {Player} player 
     * @param {Block} block1 
     * @param {Block} block2 
     */
    SwapFeedback(player, block1, block2)
    {
        const sorting = this.m_sorting;
        sorting.HighlightContainer(block1);
        sorting.HighlightContainer(block2);
        const name1 = utils.tr("minecraft:chest");
        const name2 = utils.tr("mypack:sorter");
        const rawMessage = { rawtext: [ { text: "§7Swapped §3'" }, { translate: name1 }, { text: "'§r§7 <-> §3'" }, { translate: name2 }, { text: "'§r" } ] };
        player.sendMessage(rawMessage);
    }
}