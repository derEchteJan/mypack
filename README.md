# MyPack

![pack.png](/mypack_behaviour/pack_icon.png)

Minecraft addon pack to improve vanilla

#### Development requirements

 - vscode
 - nodejs
 - git

**in cmd:**
```cmd
:: installs node modules for intellisense in vscode
setup.cmd

:: installs behavior pack and resource pack to game clients debug pack folder
install.cmd

:: zips resource and behavior pack folder to pacakge/mypack.mcaddon
package.cmd
```

**Ingame:**

`settings -> creator features -> enable content log gui, log level: info`

**In code:**

in `behaviour_pack/scripts/main.js` change debug mode to true: `utils.debug = true;`

--

#### TODOs

| Feature                  | Details                                                                      | Implemented  |
| -------                  | -------                                                                      | ------------:|
| Show Coordinates         | Maps, Compass and other navitation items show coordinates while holding them | ✅           |
| Longer Days              | Change daylight cycle time from 10 to 20 min days                            | ✅           |
|                          | Require less players to sleep                                                | ✅           |
| Uncraft bamboo           | Make bamboo blocks reversable to bamboo sticks                               | ✅           |
| Blast Furnace rework     | Enable smelting more blocks in blast furnace                                 | ✅           |
| Trader rework            | Add usefull trades to wandering tarder                                       | --            |
| Boats                    | make easier to pick up                                                       | --            |
| Minecarts                | Increase speed, rebalance for < 1024 block transport meta                    | ✅           |
|                          | make easier to pick up                                                       | --            |
| Bees                     | Make them not die constantly                                                 | --            |
| Companions               | Make them invincible or respawnable                                          | --            |
|                          | Add vacuum to collect items                                                  | ✅ (added vacuum rod) |
|                          | Enable vacuum when companion is nearby                                       | --            |
| Fix directional textures | Make certain stuff face a fixed cardinal direction e.g. deepslate            | --            |
| Storage                  | Add shared ender chest with inventory shared between players                 | ✅           |
|                          | Increase chest and inventory space by 2x if possible                         | ❌ not possible |
|                          | Add auto sorting to nearby chests (like terraria)                            | ✅           |
|                          | Add trash bin inventory slot (like terraria)                                 | ❌ not possible |
|                          | Improve bundles, craftable with rabbit fur                                   | ⚠️ increasing space not possible |
| Farming                  | Prevent mob spawns on farmland blocks especially trader and scouts           | --           |
|                          | Make poisonous potato compostable or remove it                               | --           |
| Beetroot Soup            | increase stack size from 1 to 16                                             | ✅           |
| Enchantments             | Allow loyalty on hoes                                                        | --           |
|                          | Allow power on crossbows                                                     | --           |
|                          | New enchantment for projectile speed                                         | --           |
| Armor                    | Add custom trims with visuals                                                | --           |
|                          | Allow chain armor to be crafted using chains, adjust chain recipe            | --           |
|                          | Make armor hidable                                                           | --           |
| Afk                      | Add afk protection command or block similar to passive mode, active while standing stil | --          |
| Totems                   | Rebalance: remove from raid drop tables                                      | --           |
|                          | Rebalance: add evoker respawns to the woodland mansion instead               | --           |
| Rice                     | Rice wine potion                                                             | --           |
|                          | Rice bowl like beetroot stew                                                 | ✅           |
|                          | Rice fields and crops                                                        | ✅ (⚠️ water culling issue unresolved) |
|                          | Riceism Hat                                                                  | --           |
