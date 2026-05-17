// Global logging functions
// Usage: import { log, log_err, chat } from './utils.js'

import {
  world,
  system,
  Entity,
  Player
} from "@minecraft/server";

import utils from './utils.js'


/**
 * Loggs string message
 * @param {string} message text
 * @param {Entity|null} receiver optional, chat message receiver 
 */
export function log(message, receiver)
{
    console.log(message);
    if(utils.debug)
    {
        if(receiver && Object.hasOwn(receiver, "sendMessage"))
        {
            receiver.sendMessage(message);
        }
        else
        {
            world.sendMessage(message);
        }
    }
}

/**
 * Loggs error string message
 * @param {string} message text
 * @param {Entity|null} receiver optional, chat message receiver 
 */
export function log_err(message, receiver)
{
    console.error("error: " + message);
    if(utils.debug)
    {
        const rawMessage = { rawtext: [ { text: "§4error: " }, { text: message }, { text: "§r" } ] };
        if(receiver && Object.hasOwn(receiver, "sendMessage"))
        {
            receiver.sendMessage(rawMessage);
        }
        else
        {
            world.sendMessage(rawMessage);
        }
    }
}

/**
 * Sends a chat message to optional receiver
 * @param {string} message text
 * @param {Entity|null} receiver optional, chat message receiver 
 */
export function chat(message, receiver)
{
    const rawMessage = { rawtext: [ { text: "§7" }, { text: message }, { text: "§r" } ] };
    if(receiver && Object.hasOwn(receiver, "sendMessage"))
    {
        receiver.sendMessage(rawMessage);
    }
    else
    {
        world.sendMessage(rawMessage);
    }
}