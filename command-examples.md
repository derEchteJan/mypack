# Command examples:

check if player is holding the custom test item in hand:

/execute as @a[hasitem={item=mypack:test, location=slot.weapon.mainhand}] run say playerhas test item in hand


# scoreboards

/scoreboard players set @a scoreboard_demo_objective 0

# display toast message:

/title @a actionbar my message

# dyn props:

player.setDynamicProperty("number_value", 12); // sets a number property on the player.