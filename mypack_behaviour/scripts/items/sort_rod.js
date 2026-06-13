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
    PlayerInteractWithBlockBeforeEvent,
} from "@minecraft/server";

import { ActionFormData } from "@minecraft/server-ui";

import { log, log_err, chat } from '../logging.js'
import utils from "../utils.js"
import Sorting from "../handlers/sorting.js"


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
    static transfer = "transfer";

    static _prop_id = "mypack:sort_rod_mode";
    static _values =       [ Mode.sort,    Mode.transfer,    Mode.tally,    Mode.swap       ];
    static _displayNames = [ "Sort Items", "Transfer Items", "Tally Items", "Swap Contents" ];

    /**
     * @param {string} mode
     * @returns {string}
     */
    static DisplayName(mode)
    {
        if(!this._values.includes(mode)) return "";
        var idx = this._values.indexOf(mode);
        return this._displayNames[idx];
    }
}

/**
 * 
 * @param {PlayerInteractWithBlockBeforeEvent} event 
 * @param {*} params 
 */
function OnBeforeInteract(event, params)
{
    if(event.itemStack && event.itemStack.typeId === 'mypack:sort_rod')
    {
        const component = event.itemStack.getComponent('mypack:sort_rod_component');
        if(component)
        {
            event.cancel = true;
            system.runTimeout(() => {
                SortRodComponent.OnUseOn(event.player, event.block);
            });
        }
    }
}

world.beforeEvents.playerInteractWithBlock.subscribe(OnBeforeInteract);

/** SortRodComponent
 * @implements {ItemCustomComponent}
 */
export default class SortRodComponent {

    // item mode
    static s_sorting = new Sorting();
    static s_otherContainerPropId = "mypack:sort_rod_selected_container";
    static s_cooldownTicks = 7;
    static s_cooldownTimestamp = -1;

    constructor() {}

    /**
     * OnUseOnEvent handler - called when item is used on a block
     * @param {ItemComponentUseOnEvent} event
     * @param {CustomComponentParameters} params
     */
    onUseOn(event, params)
    {
       SortRodComponent.OnUseOn(event.source, event.block);
    }

    /**
     * @param {Player} player 
     * @param {Block} block 
     * @returns 
     */
    static OnUseOn(player, block)
    {
        if(!SortRodComponent.CheckCooldown()) return;

        const sorting = SortRodComponent.s_sorting;

        if(!player || !block) return;

        var inventory = block.getComponent(BlockInventoryComponent.componentId);
        if(inventory && inventory.container)
        {
            const container = inventory.container;
            var mode = SortRodComponent.GetMode(player);
            if(mode)
            {
                if(mode === Mode.sort)    SortRodComponent.Sort(container, block, player);
                if(mode === Mode.transfer) SortRodComponent.Transfer(container, player, !player.isSneaking);
                //if(mode === Mode.compact) SortRodComponent.Compact(container, block, player);
                if(mode === Mode.tally)   SortRodComponent.Tally(container, block, player);
                if(mode === Mode.swap)    SortRodComponent.Swap(container, block, player);
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
    static Sort(container, block, player)
    {
        const sorting = SortRodComponent.s_sorting;
        sorting.CompactItems(container);
        sorting.SortContainerBy(container, sorting.predicates.totalAmountDesc(container));
        sorting.HighlightContainer(block);
        player.sendMessage({ rawtext: [ { text: "§7" }, { translate: "mypack:sorted_container" }, { text: "§7§r" } ] });
    }

    /**
     * @param {Container} container
     * @param {Block} block
     * @param {Player} player
     */
    static Compact(container, block, player)
    {
        const sorting = SortRodComponent.s_sorting;
        sorting.CompactItems(container);
        sorting.HighlightContainer(block);
        player.sendMessage({ rawtext: [ { translate: "§7Compacted Container§r" } ] });
    }

    /**
     * @param {Container} container
     * @param {Block} block
     * @param {Player} player
     */
    static Transfer(container, player, deposit)
    {
        const sorting = SortRodComponent.s_sorting;
        sorting.MessageBegin();
        var transferedAny = false;
        if(deposit)
        {
            transferedAny = sorting.DepositToContainer(player, container);
        }
        else
        {
            transferedAny = sorting.TakeFromContainer(player, container);
        }
        if(transferedAny)
        {
            sorting.TransferBeginMessage(player, deposit);
        }
        sorting.MessageEnd();
    }

    /**
     * @param {Container} container
     * @param {Block} block
     * @param {Player} player
     */
    static Tally(container, block, player)
    {
        const sorting = SortRodComponent.s_sorting;
        player.sendMessage({ rawtext: [ { text: "§7Contents:§r" } ] });
        var tally = sorting.TallyItems(container, true);
        sorting.TallyMessage(player, tally);
    }

    /**
     * @param {Container} container
     * @param {Block} block
     * @param {Player} player
     */
    static Swap(container, block, player)
    {
        const sorting = SortRodComponent.s_sorting;
        var selected = SortRodComponent.GetSelectedContainer(player);
        if(selected)
        {
            var size = Math.min(container.size, selected.container.size);
            for(var i = 0; i < size; i++)
            {
                container.swapItems(i, i, selected.container);
            }
            SortRodComponent.SwapFeedback(player, block, selected.block);
            SortRodComponent.SetSelectedContainer(null, player);
        }
        else
        {
            SortRodComponent.SetSelectedContainer(block, player);
        }
    }


    // --- CHANGE MODE ---

    /**
     * @param {Player} player
     */
    static PresentModeForm(player) {
        var form = new ActionFormData()
            .title("Sort Rod Mode")
            .body("Change what happens when you press on a chest");
        
        for(var modeIdx = 0; modeIdx < Mode._values.length; modeIdx++)
        {
            var dispName = Mode._displayNames.at(modeIdx);
            form = form.button(dispName);
        }

        form.show(player).then((result) => {
            if (result.canceled) return -1;
            var mode = Mode._values[result.selection];
            SortRodComponent.SetMode(player, mode);
        });
    }

    /**
     * @param {Player} player
     * @param {string} mode
     */
    static SetMode(player, mode)
    {
        player.setDynamicProperty(Mode._prop_id, mode);
        SortRodComponent.ModeChangedFeedback(player, mode);
    }

    /**
     * @param {Player} player
     * @returns {string | undefined}
     */
    static GetMode(player)
    {
        return player.getDynamicProperty(Mode._prop_id);
    }

    /**
     * @param {Player} player
     * @param {string} mode
     */
    static ModeChangedFeedback(player, mode)
    {
        const modeName = Mode.DisplayName(mode);
        const rawMessage = { rawtext: [ { text: "Set Mode §3'" }, { translate: modeName }, { text: "'§r" } ] };
        var stack = utils.GetHeldItem(player);
        if(stack)
        {
            const rawLore = [ "§7Mode: §r§3'" + modeName + "'§r" ]; // raw lore cant be translated? what the helly
            stack.setLore(rawLore);
            utils.SetHeldItem(player, stack, /*override:*/ true);
        }
        player.sendMessage(rawMessage);
    }


    // --- OTHER METHODS ---

    /**
     * @param {Block | null} block 
     * @param {Player} player 
     */
    static SetSelectedContainer(block, player)
    {
        const sorting = SortRodComponent.s_sorting;
        if(block)
        {
            player.setDynamicProperty(SortRodComponent.s_otherContainerPropId, block.location);
            sorting.HighlightContainer(block);
            const rawMessage = { rawtext: [ { text: "§7Swapping: Selected §r§3'" }, { translate: block.typeId }, { text: "'§r" } ] };
            player.sendMessage(rawMessage);
        }
        else
        {
            player.setDynamicProperty(SortRodComponent.s_otherContainerPropId, null);
        }
    }

    /**
     * @param {Player} player
     * @returns {ContainerBlock | undefined}
     */
    static GetSelectedContainer(player)
    {
        var result = null;
        var location = player.getDynamicProperty(SortRodComponent.s_otherContainerPropId);
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
    static CheckCooldown()
    {
        var result = false;
        var tick = system.currentTick;
        if(SortRodComponent.s_cooldownTimestamp == -1 || tick - SortRodComponent.s_cooldownTimestamp > SortRodComponent.s_cooldownTicks)
        {
            result = true;
            SortRodComponent.s_cooldownTimestamp = tick;
        }
        return result;
    }

    // --- PLAYER FEEDBACK ---

    /**
     * @param {Player} player 
     * @param {Block} block1 
     * @param {Block} block2 
     */
    static SwapFeedback(player, block1, block2)
    {
        const sorting = SortRodComponent.s_sorting;
        sorting.HighlightContainer(block1);
        sorting.HighlightContainer(block2);
        const name1 = utils.tr(block1);
        const name2 = utils.tr(block2);
        const rawMessage = { rawtext: [ { text: "§7Swapped §3'" }, { translate: name1 }, { text: "'§r§7 <-> §3'" }, { translate: name2 }, { text: "'§r" } ] };
        player.sendMessage(rawMessage);
    }
}