# MyPack

![pack.png](/mypack_behaviour/pack_icon.png)

Minecraft addon pack to improve vanilla

#### Development requirements

 - vscode
 - nodejs
 - git

**In cmd:**
```cmd
:: installs node modules for intellisense in vscode
setup.cmd

:: installs behavior pack and resource pack to game clients debug pack folder
install.cmd

:: zips resource and behavior pack folder to pacakge/mypack.mcaddon
package.cmd
```

**In game:**

`settings -> creator features -> enable content log gui, log level: info`

press `Ctrl + H` to open console output log

`/reload` reloads the javascript after an `./install` run, doesnt work if components have been changed

**In code:**

in `behaviour_pack/scripts/main.js` change debug mode to true: `utils.debug = true;`

--

#### TODOs

**Problems:**

 - Fix spears again by removing custom one ✅ (renamed to mypack:spear)
 - Use new Pack Settings for features if possible -- ⚠️ dont work in current game version
 - Fix render issue with kennel (floor underneath is invisible after version increase)

**Features:**

| Feature                  | Details                                                                      | Implemented  |
| -------                  | -------                                                                      | ------------:|
| Show Coordinates         | Maps, Compass and other navitation items show coordinates while holding them | ✅           |
| Spyglass                 | Show distance mesaurement when zooming in                                    | --           |
| Longer Days              | Change daylight cycle time from 10 to 20 min days                            | ✅           |
|                          | Require less players to sleep                                                | ✅           |
| Uncraft bamboo           | Make bamboo blocks reversable to bamboo sticks                               | ✅           |
| Blast Furnace adjusments | Enable smelting more blocks in blast furnace                                 | ✅           |
| Trader rework            | Add usefull trades to wandering tarder                                       | ✅           |
| Boats                    | make easier to pick up                                                       | ✅           |
| Minecarts                | Increase speed, rebalance for < 1024 block transport meta                    | ✅           |
|                          | make easier to pick up                                                       | ✅           |
| Bees                     | Make them not die constantly                                                 | --            |
| Companions               | Make them invincible or respawnable                                          | --            |
|                          | Add vacuum to collect items                                                  | ✅ (added vacuum rod) |
|                          | Enable vacuum when companion is nearby                                       | --            |
| Fix directional textures | Make certain stuff face a fixed cardinal direction e.g. deepslate            | --            |
| Storage                  | Add shared ender chest with inventory shared between players                 | ✅           |
|                          | Increase chest and inventory space by 2x if possible                         | ❌ not possible due to yee yee ass ui framework |
|                          | Add auto sorting to nearby chests (like terraria)                            | ✅           |
|                          | Add trash bin inventory slot (like terraria)                                 | ❌ not possible |
|                          | Improve bundles, craftable with rabbit fur                                   | ⚠️ increasing space not possible |
| Farming                  | Prevent mob spawns on farmland blocks especially trader and scouts           | trader gets slow falling on spawn |
|                          | Make poisonous potato compostable or remove it                               | ⚠️ compostable item component doesnt work in current version yet |
| Soups and Stews          | increase stack size from 1 to 16                                             | ✅           |
| Potions                  | increase stack size from 1 to 16                                             | ✅           |
| Enchantments             | Allow loyalty on hoes                                                        | --           |
|                          | Allow power on crossbows                                                     | --           |
|                          | New enchantment for projectile speed                                         | ⚠️ speed can be altered, enchantments cant be added |
| Armor                    | Add custom trims with visuals                                                | --           |
|                          | Allow chain armor to be crafted using chains, adjust chain recipe            | --           |
|                          | Make armor hidable                                                           | --           |
| Afk                      | Add afk protection command or block similar to passive mode, active while standing stil | ✅ (proof of conecept implemented) |
| Totems                   | Rebalance: remove from raid drop tables                                      | --           |
|                          | Rebalance: add evoker respawns to the woodland mansion instead               | --           |
| Rice                     | Rice wine potion                                                             | needs water culling issue fixed |
|                          | Rice bowl like beetroot stew                                                 | ✅           |
|                          | Rice fields and crops                                                        | ⚠️ water culling issue unresolved |
|                          | Riceism Hat                                                                  | needs water culling issue fixed |
