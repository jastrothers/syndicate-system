@echo off
set GAMES=Friday heist syndicate-heist TestGameImport TestGame

for %%G in (%GAMES%) do (
    echo Migrating %%G rulebooks...
    if exist game-data\rulebooks\%%G (
        xcopy game-data\rulebooks\%%G game-data\%%G\rulebooks /S /E /I /Y
        rd game-data\rulebooks\%%G /S /Q
    )
    
    echo Migrating %%G reference...
    if exist game-data\reference\%%G (
        xcopy game-data\reference\%%G game-data\%%G\reference /S /E /I /Y
        rd game-data\reference\%%G /S /Q
    )
    
    echo Migrating %%G sessions...
    if exist game-data\sessions\%%G (
        xcopy game-data\sessions\%%G game-data\%%G\sessions /S /E /I /Y
        rd game-data\sessions\%%G /S /Q
    )
)

echo Done.
