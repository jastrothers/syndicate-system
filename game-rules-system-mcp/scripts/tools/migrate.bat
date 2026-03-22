@echo off
echo Migrating Friday...
mkdir game-data\Friday\rulebooks
mkdir game-data\Friday\reference
mkdir game-data\Friday\sessions
move game-data\rulebooks\Friday\* game-data\Friday\rulebooks\
move game-data\reference\Friday\* game-data\Friday\reference\
move game-data\sessions\Friday\* game-data\Friday\sessions\

echo Migrating heist...
mkdir game-data\heist\rulebooks
mkdir game-data\heist\reference
mkdir game-data\heist\sessions
move game-data\rulebooks\heist\* game-data\heist\rulebooks\
move game-data\reference\heist\* game-data\heist\reference\
move game-data\sessions\heist\* game-data\heist\sessions\

echo Migrating syndicate-heist...
mkdir game-data\syndicate-heist\rulebooks
mkdir game-data\syndicate-heist\reference
mkdir game-data\syndicate-heist\sessions
move game-data\rulebooks\syndicate-heist\* game-data\syndicate-heist\rulebooks\
move game-data\reference\syndicate-heist\* game-data\syndicate-heist\reference\
move game-data\sessions\syndicate-heist\* game-data\syndicate-heist\sessions\

echo Migrating TestGameImport...
mkdir game-data\TestGameImport\rulebooks
mkdir game-data\TestGameImport\reference
mkdir game-data\TestGameImport\sessions
move game-data\rulebooks\TestGameImport\* game-data\TestGameImport\rulebooks\
move game-data\reference\TestGameImport\* game-data\TestGameImport\reference\
move game-data\sessions\TestGameImport\* game-data\TestGameImport\sessions\

echo Migrating TestGame...
mkdir game-data\TestGame\reference
move game-data\reference\TestGame\* game-data\TestGame\reference\

echo Cleaning up...
rmdir game-data\rulebooks /s /q
rmdir game-data\reference /s /q
rmdir game-data\sessions /s /q

echo Done.
