# Fixed: JavaScript Race Condition Error on Login

## The Errors

### Error 1: Cannot read 'show'
```
TypeError: Cannot read properties of null (reading 'show')
at BrowserWindow.<anonymous> (main.js:179:16)
```

### Error 2: Cannot read 'webContents'
```
TypeError: Cannot read properties of null (reading 'webContents')
at WebContents.<anonymous> (main.js:125:16)
```

Both are race condition errors where event handlers fire after windows are destroyed.

## Root Cause

This was a **race condition** in the Electron app that occurred during login/logout transitions. Here's what was happening:

1. User initiates login
2. Main window starts being created
3. Window registers event handlers (`ready-to-show`, `did-finish-load`)
4. Something causes the window to close before it finishes loading:
   - User logs out quickly
   - Session expires
   - Navigation to login page detected
5. Window is set to `null` via the `closed` event handler
6. But the `ready-to-show` or `did-finish-load` event fires **after** the window is null
7. Code tries to call `mainWindow.show()` on `null` → **CRASH**

## The Fix

Added **null checks and destroyed checks** before accessing window objects in all event handlers:

### Before (Unsafe):
```javascript
mainWindow.once('ready-to-show', () => {
  mainWindow.show();  // ❌ Crashes if mainWindow is null
  if (loginWindow) {
    loginWindow.close();
  }
});
```

### After (Safe):
```javascript
mainWindow.once('ready-to-show', () => {
  // Check if window still exists (race condition protection)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();  // ✅ Safe
  }
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.close();  // ✅ Safe
  }
});
```

## Changes Made

Protected all window access in these functions/handlers:

1. ✅ `createLoginWindow()` - ready-to-show handler + close checks
2. ✅ `createLoginWindowWithError()` - ready-to-show and setTimeout handlers + close checks
3. ✅ `createMainWindow()` - ready-to-show and did-finish-load handlers + close checks
4. ✅ Navigation handlers - will-navigate and did-finish-load
5. ✅ `handleDeepLink()` - added try-catch protection
6. ✅ `authenticateUser()` - protected all authWindow access and close calls
7. ✅ All `.close()` calls - check window exists before closing
8. ✅ All `webContents` event handlers - check window exists before accessing

## When This Error Occurred

Most commonly happened when:
- User clicked login button multiple times quickly
- Session expired during login
- User navigated away during window creation
- Rapid logout → login transitions

## Result

✅ No more crashes during login/logout
✅ App handles rapid state changes gracefully
✅ Event handlers check window validity before accessing

## Technical Notes

**Why `isDestroyed()` is needed:**

Even if a window variable is not `null`, it might be in the process of being destroyed. Electron provides `isDestroyed()` to check if a window is still valid:

```javascript
if (mainWindow && !mainWindow.isDestroyed()) {
  // Safe to use mainWindow here
}
```

**Best Practice for Electron:**

Always check both conditions:
1. `window !== null` - Variable is assigned
2. `!window.isDestroyed()` - Window hasn't been destroyed

This prevents race conditions in async event handlers.

