@echo off
setlocal
cd /d "%~dp0"

:menu
echo.
echo ============================================
echo   Interview Prep Hub - Project Tools
echo ============================================
echo   -- Excel sync --
echo    1. Data Summary         (which sheets are synced, row counts, what's missing)
echo    2. Smart Sync           (check existing sheets against Excel - safe, recommended)
echo    3. Add Sheet            (pick by number - bring in a sheet not yet in index.html)
echo    4. Remove Sheet         (pick by number - drop a synced sheet, add it back later)
echo    5. Full Resync          (re-extract whatever sheets are currently synced)
echo    6. Clear Data           (wipe DATA - destructive, requires typed confirmation)
echo.
echo   -- Local dev --
echo    7. Verify index.html    (JS syntax, id cross-check, data sanity)
echo    8. Serve Locally        (starts a local server, opens the app in your browser)
echo    9. Open index.html      (opens the file directly, no server)
echo.
echo   -- Other --
echo   10. Open Excel Workbook  (opens the .xlsx source file directly)
echo   11. Restore Last Backup  (index.html.bak - undo the most recent sync)
echo   12. View/Edit Settings   (server port, row cap - config.json)
echo   13. Exit
echo.
set /p choice="Choose an option (1-13): "

if "%choice%"=="1" goto data_summary
if "%choice%"=="2" goto smart_sync
if "%choice%"=="3" goto add_sheet
if "%choice%"=="4" goto remove_sheet
if "%choice%"=="5" goto full_resync
if "%choice%"=="6" goto clear_data
if "%choice%"=="7" goto verify
if "%choice%"=="8" goto serve
if "%choice%"=="9" goto open_direct
if "%choice%"=="10" goto open_excel
if "%choice%"=="11" goto restore_backup
if "%choice%"=="12" goto edit_settings
if "%choice%"=="13" goto end
echo Invalid choice.
goto menu

:smart_sync
echo [%TIME%] Smart Sync
python scripts\smart_sync.py --quiet
python scripts\verify_index.py --quiet
echo [%TIME%] done.
goto done

:add_sheet
echo [%TIME%] Add Sheet
python scripts\add_sheets_menu.py
python scripts\verify_index.py --quiet
echo [%TIME%] done.
goto done

:full_resync
echo [%TIME%] Full Resync
python scripts\extract_data.py --quiet
python scripts\verify_index.py --quiet
echo [%TIME%] done.
goto done

:remove_sheet
echo [%TIME%] Remove Sheet
python scripts\remove_sheet.py
python scripts\verify_index.py --quiet
echo [%TIME%] done.
goto done

:clear_data
echo [%TIME%] Clear Data
python scripts\clear_data.py
goto done

:data_summary
echo [%TIME%] Data Summary
python scripts\list_sheets.py
goto done

:verify
echo [%TIME%] Verify
python scripts\verify_index.py
goto done

:serve
echo [%TIME%] Serve Locally
python scripts\serve.py
echo [%TIME%] server stopped.
goto done

:open_direct
echo [%TIME%] Opening index.html
start "" "%~dp0index.html"
goto done

:open_excel
echo [%TIME%] Opening Excel workbook
for %%f in ("%~dp0*.xlsx") do start "" "%%f"
goto done

:edit_settings
echo [%TIME%] Settings
python scripts\edit_config.py
goto done

:restore_backup
echo [%TIME%] Restore Last Backup
if not exist "%~dp0index.html.bak" (
  echo No index.html.bak found -- nothing to restore.
  goto done
)
echo This will overwrite the current index.html with index.html.bak.
set /p confirm="Type YES to confirm: "
if /i "%confirm%"=="YES" (
  copy /y "%~dp0index.html.bak" "%~dp0index.html" >nul
  echo [%TIME%] Restored.
) else (
  echo [%TIME%] Cancelled -- nothing changed.
)
goto done

:done
echo.
echo ------------------------------------------------
set /p dummy="Done. Press Enter to return to the menu, or close this window to exit. "
goto menu

:end
endlocal
