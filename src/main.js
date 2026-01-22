const { app, BrowserWindow, ipcMain, session, dialog, net } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Try to load keytar, but make it optional
let keytar;
try {
  keytar = require('keytar');
  console.log('✅ Keytar loaded successfully');
} catch (error) {
  console.warn('⚠️  Keytar not available:', error.message);
  console.warn('   "Remember Me" feature will be disabled');
}

const config = require('./config');

// Keep a global reference of the window objects
let mainWindow;
let loginWindow;
let isLoggedOut = false; // Flag to track if user manually logged out
let deeplinkingUrl; // Store deep link URL to open after login
let isAuthenticating = false; // Flag to prevent duplicate login processing
let lastUpdateStatusAt = 0;
const windowHistories = new Map();
const backButtonAttached = new Set();
const enhancedWebContents = new Set();

function registerDocumentStartScript(targetWebContents, source) {
  if (!targetWebContents || targetWebContents.isDestroyed()) {
    return;
  }
  if (typeof targetWebContents.addScriptToExecuteOnNewDocument === 'function') {
    targetWebContents.addScriptToExecuteOnNewDocument(source);
    return;
  }
  try {
    if (!targetWebContents.debugger.isAttached()) {
      targetWebContents.debugger.attach('1.3');
    }
    targetWebContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument', { source });
  } catch (error) {
    console.error('Failed to register document-start script:', error);
  }
}

function attachConsoleForwarder(targetWebContents) {
  if (!targetWebContents || targetWebContents.isDestroyed()) {
    return;
  }
  if (targetWebContents.__tsConsoleForwarderAttached) {
    return;
  }
  targetWebContents.__tsConsoleForwarderAttached = true;
  targetWebContents.on('console-message', (_event, level, message, line, sourceId) => {
    const lowerMessage = String(message).toLowerCase();
    if (
      lowerMessage.includes('pdf') ||
      lowerMessage.includes('worker') ||
      lowerMessage.includes('withresolvers')
    ) {
      const url = targetWebContents.getURL ? targetWebContents.getURL() : '';
      console.log(`[webconsole:${level}] ${message} (${sourceId}:${line}) ${url}`);
    }
  });
}

function registerFrameNavigationFallback(targetWebContents) {
  if (!targetWebContents || targetWebContents.isDestroyed()) {
    return;
  }
  if (targetWebContents.__tsFrameNavFallbackAttached) {
    return;
  }
  targetWebContents.__tsFrameNavFallbackAttached = true;
  try {
    if (!targetWebContents.debugger.isAttached()) {
      targetWebContents.debugger.attach('1.3');
    }
    targetWebContents.debugger.sendCommand('Page.enable');
  } catch (error) {
    console.error('Failed to enable Page domain for frame fallback:', error);
    return;
  }
  targetWebContents.debugger.on('message', (_event, method, params) => {
    if (method === 'Page.frameNavigated' && params && params.frame) {
      try {
        const mainFrame = targetWebContents.mainFrame;
        if (!mainFrame || !mainFrame.frames) {
          return;
        }
        const currentFrames = mainFrame.frames;
        currentFrames.forEach(frame => injectPromisePolyfillIntoFrame(frame));
      } catch (error) {
        console.error('Failed to inject polyfill on frame navigation:', error);
      }
    }
  });
}

function installPromiseWithResolversPolyfill(targetWebContents) {
  if (!targetWebContents || targetWebContents.isDestroyed()) {
    return;
  }
  const polyfillScript = `
    if (typeof Promise.withResolvers !== 'function') {
      Promise.withResolvers = () => {
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      };
    }

    (function patchWorkerForPromiseResolvers() {
      if (typeof Worker !== 'function') {
        return;
      }
      const OriginalWorker = Worker;
      const shouldWrap = (scriptUrl) => {
        if (!scriptUrl) return false;
        const value = String(scriptUrl);
        return (
          value.includes('pdf.worker') ||
          value.includes('pdfjs') ||
          value.includes('worker')
        );
      };
      const wrapWorkerScript = (scriptUrl, options) => {
        const isModule = options && options.type === 'module';
        const importLine = isModule
          ? \`import "\${scriptUrl}";\`
          : \`importScripts("\${scriptUrl}");\`;
        const polyfill = \`
          if (typeof Promise.withResolvers !== 'function') {
            Promise.withResolvers = () => {
              let resolve;
              let reject;
              const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
              });
              return { promise, resolve, reject };
            };
          }
        \`;
        const blob = new Blob([polyfill + importLine], { type: 'text/javascript' });
        return URL.createObjectURL(blob);
      };
      const PatchedWorker = function(scriptUrl, options) {
        try {
          if (shouldWrap(scriptUrl)) {
            console.info('[ts-worker] wrapping worker', scriptUrl);
            const wrappedUrl = wrapWorkerScript(scriptUrl, options || {});
            return new OriginalWorker(wrappedUrl, options);
          }
        } catch (error) {
          // Fall back to original worker if wrapping fails.
          console.warn('Worker polyfill wrap failed:', error);
        }
        return new OriginalWorker(scriptUrl, options);
      };
      PatchedWorker.prototype = OriginalWorker.prototype;
      Worker = PatchedWorker;
    })();
  `;
  registerDocumentStartScript(targetWebContents, polyfillScript);
}

function injectPromisePolyfillIntoFrame(frame) {
  if (!frame || typeof frame.executeJavaScript !== 'function') {
    return;
  }
  const script = `
    if (typeof Promise.withResolvers !== 'function') {
      Promise.withResolvers = () => {
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      };
    }
  `;
  frame.executeJavaScript(script, true).catch(error => {
    console.error('Failed to inject Promise.withResolvers in frame:', error);
  });
}

function ensureBackButtonInjected(targetWebContents) {
  if (!targetWebContents || targetWebContents.isDestroyed()) {
    return;
  }
  const injectionScript = `
    (function() {
      if (document.getElementById('ts-back-button')) {
        return;
      }
      const button = document.createElement('button');
      button.id = 'ts-back-button';
      button.type = 'button';
      button.textContent = 'Back';
      button.setAttribute('aria-label', 'Go back');
      button.style.position = 'fixed';
      button.style.left = '16px';
      button.style.top = '36px';
      button.style.zIndex = '2147483647';
      button.style.padding = '8px 14px';
      button.style.borderRadius = '6px';
      button.style.border = '1px solid rgba(0,0,0,0.15)';
      button.style.background = '#ffffff';
      button.style.color = '#1C1463';
      button.style.fontSize = '13px';
      button.style.fontWeight = '600';
      button.style.cursor = 'pointer';
      button.style.boxShadow = '0 4px 10px rgba(0,0,0,0.12)';
      button.style.display = 'none';
      button.style.alignItems = 'center';
      button.style.gap = '6px';
      button.addEventListener('click', () => {
        try {
          if (window.truespanDesktop && typeof window.truespanDesktop.goBack === 'function') {
            window.truespanDesktop.goBack();
          } else {
            history.back();
          }
        } catch (error) {
          console.warn('Back navigation failed:', error);
        }
      });
      document.body.appendChild(button);
    })();
  `;
  targetWebContents.executeJavaScript(injectionScript).catch(error => {
    console.error('Failed to inject back button:', error);
  });
}

function updateBackButtonVisibility(targetWebContents) {
  if (!targetWebContents || targetWebContents.isDestroyed()) {
    return;
  }
  const currentUrl = targetWebContents.getURL ? targetWebContents.getURL() : '';
  const isLoginUrl =
    currentUrl.includes('login.goicon.com') ||
    currentUrl.includes('/login');
  const isSocialRoute = currentUrl.includes('/social/');
  const history = windowHistories.get(targetWebContents.id) || [];
  const shouldShow =
    !isLoginUrl &&
    !isSocialRoute &&
    (targetWebContents.canGoBack() || history.length > 1);
  const updateScript = `
    (function() {
      const button = document.getElementById('ts-back-button');
      if (!button) return;
      button.style.display = ${shouldShow ? "'inline-flex'" : "'none'"};
      button.style.opacity = ${shouldShow ? "'1'" : "'0.45'"};
      button.style.pointerEvents = ${shouldShow ? "'auto'" : "'none'"};
    })();
  `;
  targetWebContents.executeJavaScript(updateScript).catch(error => {
    console.error('Failed to update back button visibility:', error);
  });
}

function getHistoryForWebContents(targetWebContents) {
  if (!targetWebContents) {
    return [];
  }
  const id = targetWebContents.id;
  if (!windowHistories.has(id)) {
    windowHistories.set(id, []);
  }
  return windowHistories.get(id);
}

function recordHistory(targetWebContents, url) {
  if (!targetWebContents || !url) {
    return;
  }
  const history = getHistoryForWebContents(targetWebContents);
  if (!history.length || history[history.length - 1] !== url) {
    history.push(url);
  }
}

function attachBackButtonHandlers(targetWebContents) {
  if (!targetWebContents || targetWebContents.isDestroyed()) {
    return;
  }
  if (backButtonAttached.has(targetWebContents.id)) {
    return;
  }
  backButtonAttached.add(targetWebContents.id);

  targetWebContents.on('did-finish-load', () => {
    ensureBackButtonInjected(targetWebContents);
    updateBackButtonVisibility(targetWebContents);
  });

  targetWebContents.on('did-navigate', (_event, navigationUrl) => {
    recordHistory(targetWebContents, navigationUrl);
    updateBackButtonVisibility(targetWebContents);
  });

  targetWebContents.on('did-navigate-in-page', () => {
    const currentUrl = targetWebContents.getURL ? targetWebContents.getURL() : '';
    if (currentUrl) {
      recordHistory(targetWebContents, currentUrl);
    }
    updateBackButtonVisibility(targetWebContents);
  });

  targetWebContents.once('destroyed', () => {
    backButtonAttached.delete(targetWebContents.id);
    windowHistories.delete(targetWebContents.id);
    enhancedWebContents.delete(targetWebContents.id);
  });
}

function initializeWebContentsEnhancements(targetWebContents) {
  if (!targetWebContents || targetWebContents.isDestroyed()) {
    return;
  }
  if (enhancedWebContents.has(targetWebContents.id)) {
    return;
  }
  enhancedWebContents.add(targetWebContents.id);
  attachConsoleForwarder(targetWebContents);
  installPromiseWithResolversPolyfill(targetWebContents);
  attachBackButtonHandlers(targetWebContents);
  registerFrameNavigationFallback(targetWebContents);

  targetWebContents.on('did-frame-finish-load', (_event, _isMainFrame, frameProcessId, frameRoutingId) => {
    try {
      const mainFrame = targetWebContents.mainFrame;
      if (!mainFrame || !mainFrame.frames) {
        return;
      }
      const matchingFrame = mainFrame.frames.find(
        frame => frame.processId === frameProcessId && frame.routingId === frameRoutingId
      );
      if (matchingFrame) {
        injectPromisePolyfillIntoFrame(matchingFrame);
      } else {
        // Fallback: attempt to inject into all frames.
        mainFrame.frames.forEach(frame => injectPromisePolyfillIntoFrame(frame));
      }
    } catch (error) {
      console.error('Failed to inject polyfill into frame:', error);
    }
  });

  if (targetWebContents.debugger && targetWebContents.debugger.isAttached()) {
    targetWebContents.once('destroyed', () => {
      try {
        targetWebContents.debugger.detach();
      } catch (error) {
        // Ignore detach errors; window is closing.
      }
    });
  }
}

const INVALID_CREDENTIALS_MESSAGE =
  "We can't find that username and password. You can reset your password or try again.";

const isTokenValueValid = (value) => {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized !== 'deleted' && normalized !== 'null' && normalized !== 'undefined';
};

const hasValidAuthTokens = (cookies) => {
  const lookup = new Map(cookies.map(cookie => [cookie.name, cookie.value]));
  const caremergeApiKey = lookup.get('caremerge_api_key') || lookup.get('icon_api_key');
  const userSessionId = lookup.get('userSessionId') || lookup.get('iconUserId');
  const softSessionId = lookup.get('softSessionId') || lookup.get('api-auth');

  return (
    isTokenValueValid(caremergeApiKey) &&
    isTokenValueValid(userSessionId) &&
    (softSessionId ? isTokenValueValid(softSessionId) : true)
  );
};

const ensureCspDirective = (cspValue, directive, valuesToAdd) => {
  if (!cspValue) {
    return cspValue;
  }
  const directives = cspValue.split(';').map(value => value.trim()).filter(Boolean);
  const directiveIndex = directives.findIndex(entry => entry.startsWith(`${directive} `) || entry === directive);
  const normalizeValues = (values) => new Set(values.filter(Boolean));
  const valuesToEnsure = normalizeValues(valuesToAdd);

  if (directiveIndex === -1) {
    directives.push(`${directive} ${Array.from(valuesToEnsure).join(' ')}`);
    return directives.join('; ');
  }

  const [currentDirective, ...currentValues] = directives[directiveIndex].split(/\s+/);
  const merged = new Set(currentValues);
  valuesToEnsure.forEach(value => merged.add(value));
  directives[directiveIndex] = `${currentDirective} ${Array.from(merged).join(' ')}`.trim();
  return directives.join('; ');
};

// Configuration from config.js
const WEBSITE_URL = config.GOICON_API_URL;
const SERVICE_NAME = config.APP_NAME;
const USE_GOICON_LOGIN = process.env.USE_GOICON_LOGIN !== '0';

// Configure auto-updater
const isDev =
  !app.isPackaged ||
  process.env.NODE_ENV === 'development' ||
  process.argv.includes('--dev');
const shouldDisableGpu =
  process.env.DISABLE_GPU === '1' || process.argv.includes('--disable-gpu');
if (shouldDisableGpu) {
  app.disableHardwareAcceleration();
  console.log('Hardware acceleration disabled (DISABLE_GPU=1).');
}
const getArgValue = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find(arg => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const hasArg = (name) => process.argv.includes(`--${name}`);

const localUpdateUrl = process.env.LOCAL_UPDATE_URL || getArgValue('local-update-url');
const forceUpdateCheck =
  process.env.FORCE_UPDATE_CHECK === '1' || hasArg('force-update-check');
const showUpdateStatus =
  process.env.SHOW_UPDATE_STATUS === '1' ||
  hasArg('show-update-status') ||
  !!localUpdateUrl ||
  forceUpdateCheck;
autoUpdater.autoDownload = true; // Auto-download updates immediately
autoUpdater.autoInstallOnAppQuit = true;
if (isDev) {
  // Allow dev builds to use a local update feed for testing.
  autoUpdater.forceDevUpdateConfig = true;
}
if (localUpdateUrl) {
  try {
    autoUpdater.setFeedURL({ provider: 'generic', url: localUpdateUrl });
    console.log('Using local update feed:', localUpdateUrl);
  } catch (error) {
    console.warn('Could not set local update feed:', error.message);
  }
}

// Log updater events
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// Ensure cache path is writable to avoid cache move errors on Windows
try {
  app.setPath('cache', path.join(app.getPath('userData'), 'Cache'));
} catch (error) {
  console.warn('Could not set cache path:', error.message);
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection in main process:', reason);
});

app.on('ready', () => {
  console.log('App ready');
});

app.on('browser-window-created', (_event, window) => {
  initializeWebContentsEnhancements(window.webContents);
  try {
    window.setMenuBarVisibility(false);
    window.setAutoHideMenuBar(true);
  } catch (error) {
    console.warn('Failed to hide menu bar for new window:', error);
  }
});

app.on('before-quit', () => {
  console.log('App before-quit');
});

app.on('quit', (event, exitCode) => {
  console.log('App quit', { exitCode });
});

console.log('App starting... isDev:', isDev);
console.log('App version:', app.getVersion());
if (isDev) {
  console.log('Dev update config forced:', autoUpdater.forceDevUpdateConfig);
  console.log('Local update URL:', localUpdateUrl || '(not set)');
  console.log('Force update check:', forceUpdateCheck);
}
console.log('Show update status:', showUpdateStatus);

const emitUpdateStatus = (status, details) => {
  if (!showUpdateStatus) {
    return;
  }
  const now = Date.now();
  if (status === 'download-progress' && now - lastUpdateStatusAt < 1000) {
    return;
  }
  lastUpdateStatusAt = now;

  const targetWindow = mainWindow || loginWindow;
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send('update-status', {
    status,
    details,
    timestamp: new Date().toISOString(),
    show: showUpdateStatus
  });
};

ipcMain.handle('check-for-updates', async () => {
  try {
    emitUpdateStatus('checking-for-update');
    return await autoUpdater.checkForUpdates();
  } catch (error) {
    const message = error?.message || 'Update check failed';
    emitUpdateStatus('error', message);
    return { error: message };
  }
});

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
  emitUpdateStatus('checking-for-update');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  emitUpdateStatus('update-available', info.version);
  
  // Auto-download immediately without user prompt
        autoUpdater.downloadUpdate();
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available. Current version is the latest.');
  emitUpdateStatus('update-not-available', info.version);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
  console.log(log_message);
  emitUpdateStatus('download-progress', `${Math.round(progressObj.percent)}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  emitUpdateStatus('update-downloaded', info.version);
  
  const window = mainWindow || loginWindow;
  if (window && !window.isDestroyed()) {
    dialog.showMessageBox(window, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update has been downloaded successfully!',
      detail: 'The app will restart to install the update. All your work will be saved.',
      buttons: ['Restart Now', 'Restart Later'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        // Close windows gracefully before updating
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.removeAllListeners('close');
        }
        if (loginWindow && !loginWindow.isDestroyed()) {
          loginWindow.removeAllListeners('close');
        }
        
        setImmediate(() => autoUpdater.quitAndInstall(false, true));
      }
    });
  }
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
  // Don't show error dialog to users unless they explicitly checked for updates
  emitUpdateStatus('error', err.message || 'Unknown error');
});

// Handle URLs from Universal Links (Mac) / App Links (Windows)
function handleDeepLink(url) {
  console.log('Deep link received:', url);
  
  // Handle goicon.com URLs
  if (url.startsWith('https://goicon.com') || url.startsWith('https://api.goicon.com')) {
    const targetUrl = url;
    
    console.log('Opening URL:', targetUrl);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      // App is running, navigate to URL
      try {
        mainWindow.loadURL(targetUrl);
        mainWindow.show();
        mainWindow.focus();
      } catch (err) {
        console.error('Error loading deep link in main window:', err);
      }
    } else if (loginWindow && !loginWindow.isDestroyed()) {
      // Login window is open, store URL to open after login
      deeplinkingUrl = targetUrl;
      console.log('Stored URL to open after login:', deeplinkingUrl);
    } else {
      // App is starting, store URL to open after login
      deeplinkingUrl = targetUrl;
      console.log('Stored URL to open on launch:', deeplinkingUrl);
    }
  }
}

// Make app single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is running, quit this one
  app.quit();
} else {
  // Handle second instance (when user clicks a link while app is running)
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    
    // The commandLine is an array, find the URL
    const url = commandLine.find(arg => arg.startsWith('https://goicon.com') || arg.startsWith('https://api.goicon.com'));
    if (url) {
      handleDeepLink(url);
    }
  });
}

function injectGoiconLoginBranding(targetWindow, errorMessage) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }
  const currentUrl = targetWindow.webContents.getURL();
  if (currentUrl.includes('/login/dashboard/') || currentUrl.includes('/dashboard/')) {
    return;
  }

  const logoPath = path.join(__dirname, '../assets/logo-big-login-page.png');
  let logoUrl = '';
  try {
    const logoBuffer = require('fs').readFileSync(logoPath);
    const base64 = logoBuffer.toString('base64');
    logoUrl = `data:image/png;base64,${base64}`;
  } catch (error) {
    console.warn('Failed to load login logo:', error.message);
  }

  const css = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      background: linear-gradient(135deg, #1C1463 0%, #1C42FF 100%) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-height: 100vh !important;
      margin: 0 !important;
      padding: 10px !important;
    }
    .truespan-login-container {
      background: #fff !important;
      padding: 32px !important;
      border-radius: 10px !important;
      box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important;
      width: 100% !important;
      max-width: 420px !important;
    }
    .truespan-logo {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin-bottom: 20px !important;
    }
    .truespan-logo img {
      max-width: 200px !important;
      height: auto !important;
    }
    form {
      margin: 0 !important;
    }
    input[type="text"],
    input[type="password"],
    input[type="email"] {
      width: 100% !important;
      padding: 12px !important;
      border: 2px solid #e1e5e9 !important;
      border-radius: 6px !important;
      font-size: 16px !important;
      box-sizing: border-box !important;
      position: static !important;
      z-index: auto !important;
    }
    button[type="submit"],
    input[type="submit"] {
      width: 100% !important;
      padding: 12px !important;
      border-radius: 6px !important;
      background: linear-gradient(135deg, #1C1463 0%, #1C42FF 100%) !important;
      color: #fff !important;
      border: none !important;
      font-size: 16px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      position: static !important;
      z-index: auto !important;
      margin-top: 16px !important;
    }
    img[src*="goicon"], svg, .goicon-logo, .logo {
      display: none !important;
    }
    .truespan-error {
      color: #e74c3c !important;
      font-size: 14px !important;
      text-align: center !important;
      margin-bottom: 15px !important;
    }
    html, body {
      scrollbar-width: thin !important;
      scrollbar-color: #888 #f1f1f1 !important;
    }
    *::-webkit-scrollbar {
      width: 8px !important;
      height: 8px !important;
    }
    *::-webkit-scrollbar-track {
      background: #f1f1f1 !important;
      border-radius: 4px !important;
    }
    *::-webkit-scrollbar-thumb {
      background: #888 !important;
      border-radius: 4px !important;
    }
    *::-webkit-scrollbar-thumb:hover {
      background: #555 !important;
    }
    *::-webkit-scrollbar-corner {
      background: #f1f1f1 !important;
    }
  `;

  targetWindow.webContents.insertCSS(css).catch(err => {
    console.error('Failed to inject GoIcon login CSS:', err);
  });

  const script = `
    (() => {
      if (document.documentElement.getAttribute('data-truespan-login') === '1') {
        return;
      }
      document.documentElement.setAttribute('data-truespan-login', '1');

      const form = document.querySelector('form');
      if (!form) return;
      const existingWrapper = document.querySelector('.truespan-login-container');
      const alreadyWrapped = !!existingWrapper;

      if (!alreadyWrapped) {
        const wrapper = document.createElement('div');
        wrapper.className = 'truespan-login-container';

        const logo = document.createElement('div');
        logo.className = 'truespan-logo';
        const img = document.createElement('img');
        img.src = '${logoUrl}';
        img.alt = 'Truespan Neighborhood';
        img.onerror = () => { img.style.display = 'none'; };
        logo.appendChild(img);

        if (form.parentNode) {
          form.parentNode.insertBefore(wrapper, form);
          wrapper.appendChild(logo);
          wrapper.appendChild(form);
        }
      }

      const errorMessage = ${errorMessage ? JSON.stringify(errorMessage) : '""'};
      if (errorMessage) {
        const error = document.createElement('div');
        error.className = 'truespan-error';
        error.textContent = errorMessage;
        const targetWrapper = document.querySelector('.truespan-login-container') || form.parentNode;
        if (targetWrapper) {
          targetWrapper.insertBefore(error, form);
        }
      }

      const links = Array.from(document.querySelectorAll('a'));
      links.forEach(link => {
        const text = (link.textContent || '').toLowerCase();
        if (text.includes('mobile') || text.includes('enterprise')) {
          link.style.display = 'none';
        }
      });

      const hideCopyright = () => {
        const matcher = (text) =>
          text.includes('all rights reserved') &&
          (text.includes('icon') || text.includes('i con') || text.includes('icon.'));
        const nodes = Array.from(document.querySelectorAll('body *'));
        nodes.forEach(node => {
          const text = (node.textContent || '').toLowerCase().trim();
          if (!text) return;
          if (matcher(text)) {
            node.style.color = 'transparent';
            node.style.textShadow = 'none';
          }
        });
      };
      hideCopyright();
      const observer = new MutationObserver(hideCopyright);
      observer.observe(document.body, { childList: true, subtree: true });

      const storageKeys = {
        username: 'truespanUsername',
        password: 'truespanPassword'
      };

      const getStoredCredentials = async () => {
        let stored = null;
        if (window.truespanAuth && typeof window.truespanAuth.getStoredCredentials === 'function') {
          try {
            stored = await window.truespanAuth.getStoredCredentials();
          } catch (err) {
            stored = null;
          }
        }
        if (stored && stored.username) {
          return {
            username: stored.username,
            password: stored.password || '',
            keytarAvailable: !!stored.keytarAvailable,
            source: 'keytar'
          };
        }
        const localUsername = window.localStorage.getItem(storageKeys.username) || '';
        const localPassword = window.localStorage.getItem(storageKeys.password) || '';
        if (localUsername) {
          return {
            username: localUsername,
            password: localPassword,
            keytarAvailable: !!(stored && stored.keytarAvailable),
            source: 'localStorage'
          };
        }
        return {
          username: '',
          password: '',
          keytarAvailable: !!(stored && stored.keytarAvailable),
          source: null
        };
      };

      const saveStoredCredentials = async (username, password) => {
        let savedToKeytar = false;
        if (window.truespanAuth && typeof window.truespanAuth.saveCredentials === 'function') {
          try {
            const result = await window.truespanAuth.saveCredentials(username, password);
            savedToKeytar = !!(result && result.saved);
          } catch (err) {
            savedToKeytar = false;
          }
        }
        if (!savedToKeytar) {
          window.localStorage.setItem(storageKeys.username, username);
          window.localStorage.setItem(storageKeys.password, password);
        } else {
          window.localStorage.removeItem(storageKeys.username);
          window.localStorage.removeItem(storageKeys.password);
        }
      };

      const clearStoredCredentials = async () => {
        if (window.truespanAuth && typeof window.truespanAuth.clearCredentials === 'function') {
          try {
            await window.truespanAuth.clearCredentials();
          } catch (err) {
            // ignore
          }
        }
        window.localStorage.removeItem(storageKeys.username);
        window.localStorage.removeItem(storageKeys.password);
      };

      const findRememberCheckbox = () => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        const textFor = (checkbox) => {
          if (!checkbox) return '';
          const id = checkbox.getAttribute('id');
          if (id) {
            const label = document.querySelector(\`label[for="\${id}"]\`);
            if (label && label.textContent) return label.textContent.toLowerCase();
          }
          const parentText = checkbox.parentElement ? checkbox.parentElement.textContent : '';
          return (parentText || '').toLowerCase();
        };
        for (const checkbox of checkboxes) {
          const text = textFor(checkbox);
          if (text.includes('keep me logged') || text.includes('remember')) {
            return checkbox;
          }
        }
        return null;
      };

      const attachRememberHandlers = () => {
        if (!form || form.getAttribute('data-truespan-remember') === '1') {
          return;
        }
        form.setAttribute('data-truespan-remember', '1');
        const checkbox = findRememberCheckbox();
        const ensureForgetButton = () => {
          if (document.querySelector('.truespan-forget-me')) {
            return;
          }
          if (!form) {
            return;
          }
          const actionsRow = document.createElement('div');
          actionsRow.className = 'truespan-forget-me';
          actionsRow.style.marginTop = '8px';
          actionsRow.style.textAlign = 'center';
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = 'Forget me';
          button.style.background = 'transparent';
          button.style.border = 'none';
          button.style.color = '#1C42FF';
          button.style.cursor = 'pointer';
          button.style.fontSize = '12px';
          button.style.textDecoration = 'underline';
          button.addEventListener('click', () => {
            clearStoredCredentials();
            if (checkbox) {
              checkbox.checked = false;
            }
          });
          actionsRow.appendChild(button);
          form.appendChild(actionsRow);
        };

        ensureForgetButton();
        const handleRememberSubmission = () => {
          const usernameField = document.querySelector('input[name="username"], input[type="email"], input[name="email"]');
          const passwordField = document.querySelector('input[name="password"]');
          const username = usernameField ? usernameField.value.trim() : '';
          const password = passwordField ? passwordField.value : '';
          const remember = checkbox ? checkbox.checked : false;
          if (remember && username && password) {
            saveStoredCredentials(username, password);
          }
        };

        const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          submitButton.addEventListener('click', handleRememberSubmission);
        }
        form.addEventListener('submit', handleRememberSubmission, true);
        form.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            handleRememberSubmission();
          }
        }, true);
      };

      const prefillStored = async () => {
        try {
          const stored = await getStoredCredentials();
          if (!stored || !stored.username) {
            return;
          }
          const usernameField = document.querySelector('input[name="username"], input[type="email"], input[name="email"]');
          const passwordField = document.querySelector('input[name="password"]');
          if (usernameField && !usernameField.value) {
            usernameField.value = stored.username;
            usernameField.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (passwordField && stored.password && !passwordField.value) {
            passwordField.value = stored.password;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          }
          const checkbox = findRememberCheckbox();
          if (checkbox) {
            checkbox.checked = true;
          }
        } catch (err) {
          // No-op: keep login page functional even if preload is unavailable.
        }
      };

      attachRememberHandlers();
      prefillStored();
    })();
  `;

  targetWindow.webContents.executeJavaScript(script).catch(err => {
    console.error('Failed to inject GoIcon login DOM:', err);
  });
}

function attachGoiconLoginHandlers(targetWindow, errorMessage) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  const tryInject = () => {
    injectGoiconLoginBranding(targetWindow, errorMessage);
  };

  targetWindow.webContents.on('dom-ready', tryInject);
  targetWindow.webContents.on('did-finish-load', () => {
    tryInject();
    const currentUrl = targetWindow.webContents.getURL();
    if (currentUrl.includes('api.goicon.com')) {
      const targetUrl = deeplinkingUrl || currentUrl;
      deeplinkingUrl = null;
      createMainWindow(targetUrl);
    }
  });
  targetWindow.webContents.on('did-navigate', tryInject);
  targetWindow.webContents.on('did-navigate-in-page', tryInject);
  targetWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl.includes('api.goicon.com')) {
      event.preventDefault();
      const targetUrl = deeplinkingUrl || navigationUrl;
      deeplinkingUrl = null;
      createMainWindow(targetUrl);
    }
  });
}

function createLoginWindow() {
  // Close existing login window if it exists
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.close();
  }
  loginWindow = null;

  loginWindow = new BrowserWindow({
    width: Math.max(config.LOGIN_WINDOW.width, 620),
    height: Math.max(config.LOGIN_WINDOW.height, 700),
    title: 'Truespan Neighborhood',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload-login.js')
    },
    resizable: true,
    maximizable: true,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/icon.png')
  });

  if (USE_GOICON_LOGIN) {
    attachGoiconLoginHandlers(loginWindow);
    loginWindow.loadURL(`${config.GOICON_LOGIN_URL}/login/`);
  } else {
    loginWindow.loadFile('src/login.html');
  }

  loginWindow.once('ready-to-show', () => {
    if (loginWindow && !loginWindow.isDestroyed()) {
      loginWindow.show();
    }
  });

  // handlers are attached via attachGoiconLoginHandlers

  loginWindow.on('closed', () => {
    loginWindow = null;
    if (!mainWindow) {
      app.quit();
    }
  });
}

function createLoginWindowWithError(errorMessage) {
  // Close existing login window if it exists
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.close();
  }
  loginWindow = null;

  loginWindow = new BrowserWindow({
    width: Math.max(config.LOGIN_WINDOW.width, 620),
    height: Math.max(config.LOGIN_WINDOW.height, 780),
    title: 'Truespan Neighborhood',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload-login.js')
    },
    resizable: true,
    maximizable: true,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/icon.png')
  });

  if (USE_GOICON_LOGIN) {
    attachGoiconLoginHandlers(loginWindow, errorMessage);
    loginWindow.loadURL(`${config.GOICON_LOGIN_URL}/login/`);
  } else {
    loginWindow.loadFile('src/login.html');
  }

  loginWindow.once('ready-to-show', () => {
    if (loginWindow && !loginWindow.isDestroyed()) {
      loginWindow.show();
      
      if (USE_GOICON_LOGIN) {
        // handlers are attached via attachGoiconLoginHandlers
      } else {
        // Show the error message after the window is ready
        setTimeout(() => {
          if (loginWindow && !loginWindow.isDestroyed() && loginWindow.webContents) {
            loginWindow.webContents.executeJavaScript(`
              if (typeof showError === 'function') {
                showError('${errorMessage.replace(/'/g, "\\'")}');
              }
            `).catch(err => {
              console.error('Error showing error message:', err);
            });
          }
        }, 500);
      }
    }
  });

  loginWindow.on('closed', () => {
    loginWindow = null;
    if (!mainWindow) {
      app.quit();
    }
  });
}

function createMainWindow(targetUrl = WEBSITE_URL) {
  mainWindow = new BrowserWindow({
    width: config.MAIN_WINDOW.width,
    height: config.MAIN_WINDOW.height,
    title: 'Truespan Neighborhood',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload-main.js')
    },
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/icon.png')
  });

  initializeWebContentsEnhancements(mainWindow.webContents);

  // Load the target URL (either redirect URL or default website)
  console.log('Loading main window with URL:', targetUrl);
  mainWindow.loadURL(targetUrl);

  mainWindow.webContents.on('did-finish-load', () => {
    // Check if window still exists (race condition protection)
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    
    // Inject custom scrollbar CSS after page loads
    mainWindow.webContents.insertCSS(`
      /* Custom Scrollbars for Main Window */
      html, body, * {
        scrollbar-width: thin !important;
        scrollbar-color: #888 #f1f1f1 !important;
      }

      *::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
      }

      *::-webkit-scrollbar-track {
        background: #f1f1f1 !important;
        border-radius: 4px !important;
      }

      *::-webkit-scrollbar-thumb {
        background: #888 !important;
        border-radius: 4px !important;
      }

      *::-webkit-scrollbar-thumb:hover {
        background: #555 !important;
      }

      *::-webkit-scrollbar-corner {
        background: #f1f1f1 !important;
      }

      /* Force scrollbar styling on common elements */
      body::-webkit-scrollbar,
      html::-webkit-scrollbar,
      div::-webkit-scrollbar,
      .content::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
      }

      body::-webkit-scrollbar-thumb,
      html::-webkit-scrollbar-thumb,
      div::-webkit-scrollbar-thumb,
      .content::-webkit-scrollbar-thumb {
        background: #888 !important;
        border-radius: 4px !important;
      }
    `).then(() => {
      console.log('Custom scrollbar CSS injected successfully');
    }).catch(err => {
      console.error('Failed to inject scrollbar CSS:', err);
    });
  });

  mainWindow.once('ready-to-show', () => {
    // Check if window still exists (race condition protection)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
    if (loginWindow && !loginWindow.isDestroyed()) {
      loginWindow.close();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent the website from changing the window title
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  // Monitor navigation to detect logout/login redirects
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    console.log('Navigation detected to:', navigationUrl);
    
    // If user is being redirected to GoIcon login, show our login instead
    if (process.env.ALLOW_LOGIN_REDIRECT === '1') {
      return;
    }
    if (navigationUrl.includes('login.goicon.com') || 
        navigationUrl.includes('/login') || 
        navigationUrl.includes('logout') ||
        navigationUrl.includes('signin')) {
      console.log('Detected redirect to login page - user logged out');
      event.preventDefault(); // Stop the navigation
      
      // Set logout flag to prevent auto-login
      isLoggedOut = true;
      
      // Properly close main window and clean up
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }
      mainWindow = null;
      
      createLoginWindowWithError('Session expired or you have been logged out. Please log in again.');
    }

  });

  // Also monitor when the page finishes loading to catch login redirects
  mainWindow.webContents.on('did-finish-load', () => {
    // Check if window still exists
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    
    const currentUrl = mainWindow.webContents.getURL();
    console.log('Page finished loading:', currentUrl);
    if (!mainWindowHistory.length || mainWindowHistory[mainWindowHistory.length - 1] !== currentUrl) {
      mainWindowHistory.push(currentUrl);
    }

    if (USE_GOICON_LOGIN && currentUrl.includes('login.goicon.com')) {
      injectGoiconLoginBranding(mainWindow);
    }
    
    if (process.env.ALLOW_LOGIN_REDIRECT === '1') {
      return;
    }
    if (currentUrl.includes('login.goicon.com') || 
        currentUrl.includes('/login') || 
        currentUrl.includes('logout') ||
        currentUrl.includes('signin')) {
      console.log('Detected login page after load - user logged out');
      
      // Set logout flag to prevent auto-login
      isLoggedOut = true;
      
      // Properly close main window and clean up
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }
      mainWindow = null;
      
      createLoginWindowWithError('Session expired or you have been logged out. Please log in again.');
    }
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Handle forgot password
ipcMain.handle('open-forgot-password', async () => {
  // Create forgot password window
  const forgotPasswordWindow = new BrowserWindow({
    width: 600,
    height: 700,
    title: 'Forgot Password - Truespan Neighborhood',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload-login.js')
    },
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/icon.png'),
    parent: loginWindow || mainWindow, // Make it a child of login or main window
    modal: false,
    resizable: true,
    maximizable: true
  });

  // Load the forgot password page
  forgotPasswordWindow.loadURL('https://login.goicon.com/login/forgot');

  // Monitor navigation to detect when user clicks "Back" or navigates to login
  forgotPasswordWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    console.log('Forgot password navigation detected:', navigationUrl);
    
    // If user navigates back to login page, close the forgot password window
    if (navigationUrl.includes('/login') && !navigationUrl.includes('/forgot')) {
      console.log('User clicked Back - closing forgot password window');
      if (forgotPasswordWindow && !forgotPasswordWindow.isDestroyed()) {
        forgotPasswordWindow.close();
      }
    }
  });

  // Also monitor after navigation completes
  forgotPasswordWindow.webContents.on('did-navigate', (event, navigationUrl) => {
    console.log('Forgot password navigation completed:', navigationUrl);
    
    // Close window if navigated to login page
    if (navigationUrl.includes('/login') && !navigationUrl.includes('/forgot')) {
      console.log('Navigated to login page - closing forgot password window');
      if (forgotPasswordWindow && !forgotPasswordWindow.isDestroyed()) {
        forgotPasswordWindow.close();
      }
    }
  });

  // Inject CSS to hide the GoIcon logo after page loads
  forgotPasswordWindow.webContents.on('did-finish-load', () => {
    if (!forgotPasswordWindow || forgotPasswordWindow.isDestroyed()) {
      return;
    }
    
    const currentUrl = forgotPasswordWindow.webContents.getURL();
    console.log('Forgot password page loaded:', currentUrl);
    
    // Check if we're back on the login page and close if so
    if (currentUrl.includes('/login') && !currentUrl.includes('/forgot')) {
      console.log('Loaded login page - closing forgot password window');
      if (forgotPasswordWindow && !forgotPasswordWindow.isDestroyed()) {
        forgotPasswordWindow.close();
      }
      return;
    }
    
    // Inject CSS to hide the GoIcon logo
    forgotPasswordWindow.webContents.insertCSS(`
      /* Hide GoIcon logo */
      #header.header-goicon {
        display: none !important;
      }
      
      /* Optional: Add some top padding to compensate for removed header */
      body {
        padding-top: 20px !important;
      }
    `).then(() => {
      console.log('CSS injected to hide GoIcon logo on forgot password page');
    }).catch(err => {
      console.error('Failed to inject CSS:', err);
    });
    
    // Inject JavaScript to intercept Back button/link clicks
    forgotPasswordWindow.webContents.executeJavaScript(`
      // Find and intercept the Back button or link
      (function() {
        // Wait a bit for DOM to be ready
        setTimeout(() => {
          // Find all links AND buttons
          const allLinks = document.querySelectorAll('a');
          const allButtons = document.querySelectorAll('button');
          
          // Handle links
          allLinks.forEach(link => {
            const text = link.textContent.trim().toLowerCase();
            const href = link.getAttribute('href') || '';
            
            // Check if it's a Back link or login link (but not forgot)
            if (text === 'back' || 
                text === 'back to login' || 
                text.includes('back') ||
                (href.includes('/login') && !href.includes('/forgot'))) {
              
              link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Back link clicked - triggering window close');
                
                // Navigate to login page to trigger our close logic
                window.location.href = 'https://login.goicon.com/login';
              });
            }
          });
          
          // Handle buttons
          allButtons.forEach(button => {
            const text = button.textContent.trim().toLowerCase();
            const type = button.getAttribute('type') || '';
            
            // Check if it's a Back button
            if (text === 'back' || 
                text === 'back to login' || 
                text.includes('back')) {
              
              button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Back button clicked - triggering window close');
                
                // Navigate to login page to trigger our close logic
                window.location.href = 'https://login.goicon.com/login';
              });
            }
          });
        }, 100);
      })();
    `).catch(err => {
      console.error('Failed to inject JavaScript:', err);
    });
  });

  forgotPasswordWindow.once('ready-to-show', () => {
    if (forgotPasswordWindow && !forgotPasswordWindow.isDestroyed()) {
      forgotPasswordWindow.show();
    }
  });

  forgotPasswordWindow.on('closed', () => {
    console.log('Forgot password window closed');
  });

  // Handle external links - open in default browser
  forgotPasswordWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
});

async function clearGoiconCookies() {
  const mainSession = session.defaultSession;
  try {
    const allCookies = await mainSession.cookies.get({});
    const goiconCookies = allCookies.filter(cookie =>
      cookie.domain && cookie.domain.includes('goicon.com')
    );

    for (const cookie of goiconCookies) {
      const domain = cookie.domain.replace(/^\./, '');
      const url = `https://${domain}${cookie.path || '/'}`;
      try {
        await mainSession.cookies.remove(url, cookie.name);
      } catch (error) {
        console.warn(`Failed to remove cookie ${cookie.name} for ${domain}:`, error.message);
      }
    }
  } catch (error) {
    console.warn('Failed to clear GoIcon cookies:', error.message);
  }
}

// Handle login form submission
ipcMain.handle('login', async (event, { username, password }) => {
  // Prevent duplicate login processing
  if (isAuthenticating) {
    console.log('Login already in progress, ignoring duplicate request');
    return { success: false, error: 'Login already in progress' };
  }

  isAuthenticating = true;
  
  try {
    // Clear any stale GoIcon cookies to avoid false positives on bad logins
    await clearGoiconCookies();

    // Call your auth API here
    const authResult = await authenticateUser(username, password);
    
    if (authResult.success) {
      // Set cookies/session data in the main window's session
      if (authResult.cookies) {
        await setCookiesInSession(authResult.cookies);
      }

      // Close existing main window if it exists (in case of re-login)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }
      mainWindow = null;

      // Reset logout flag since user successfully logged in
      isLoggedOut = false;

      // Use deep link URL if available, otherwise default to social page
      const targetUrl = deeplinkingUrl || 'https://api.goicon.com/social';
      console.log('Loading main window with URL:', targetUrl);
      
      // Clear deep link URL after using it
      if (deeplinkingUrl) {
        console.log('Using stored deep link URL:', deeplinkingUrl);
        deeplinkingUrl = null;
      }
      
      createMainWindow(targetUrl);
      return { success: true, redirectUrl: targetUrl };
    } else {
      return { success: false, error: authResult.error };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Authentication failed' };
  } finally {
    // Reset the flag to allow future login attempts
    isAuthenticating = false;
  }
});

// Get stored credentials
ipcMain.handle('get-stored-credentials', async () => {
  try {
    if (!keytar) {
      return { username: '', password: '', keytarAvailable: false };
    }
    const lastUsername = await keytar.getPassword(SERVICE_NAME, 'last_username');
    if (lastUsername) {
      const password = await keytar.getPassword(SERVICE_NAME, lastUsername);
      return { username: lastUsername, password: password || '', keytarAvailable: true };
    }
    return { username: '', password: '', keytarAvailable: true };
  } catch (error) {
    console.error('Error retrieving stored credentials:', error);
    return { username: '', password: '', keytarAvailable: false };
  }
});

// Save stored credentials
ipcMain.handle('set-stored-credentials', async (event, { username, password }) => {
  try {
    if (!keytar) {
      return { saved: false, keytarAvailable: false };
    }
    await keytar.setPassword(SERVICE_NAME, 'last_username', username);
    await keytar.setPassword(SERVICE_NAME, username, password);
    return { saved: true, keytarAvailable: true };
  } catch (error) {
    console.error('Error saving stored credentials:', error);
    return { saved: false, keytarAvailable: !!keytar };
  }
});

// Clear stored credentials
ipcMain.handle('clear-stored-credentials', async () => {
  try {
    if (!keytar) {
      return;
    }
    const lastUsername = await keytar.getPassword(SERVICE_NAME, 'last_username');
    if (lastUsername) {
      await keytar.deletePassword(SERVICE_NAME, lastUsername);
      await keytar.deletePassword(SERVICE_NAME, 'last_username');
    }
  } catch (error) {
    console.error('Error clearing stored credentials:', error);
  }
});

// Check if user was logged out
ipcMain.handle('was-logged-out', async () => {
  return isLoggedOut;
});

ipcMain.on('main-go-back', (event) => {
  const sender = event.sender;
  if (!sender || sender.isDestroyed()) {
    return;
  }
  const targetWindow = BrowserWindow.fromWebContents(sender);
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }
  if (sender.canGoBack()) {
    sender.goBack();
    return;
  }
  const history = getHistoryForWebContents(sender);
  if (history.length > 1) {
    // Pop current and navigate to previous.
    history.pop();
    const previousUrl = history.pop();
    if (previousUrl) {
      targetWindow.webContents.loadURL(previousUrl).catch(error => {
        console.error('Failed to navigate back:', error);
      });
    }
  }
});

// Function to authenticate user using a hidden webview (like your backend does)
async function authenticateUser(username, password) {
  return new Promise((resolve) => {
    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      title: 'Truespan Neighborhood',
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: 'persist:auth-' + Date.now()
      }
    });

    authWindow.loadURL('https://login.goicon.com/login/');

    authWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[authWindow console:${level}] ${message} (${sourceId}:${line})`);
    });

    authWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('Auth window render process gone:', details);
    });

    if (process.env.AUTH_DEBUG === '1') {
      const authSession = authWindow.webContents.session;
      authSession.webRequest.onBeforeRequest((details, callback) => {
        if (details.url.includes('login.goicon.com') || details.url.includes('api.goicon.com')) {
          console.log('[authWindow request]', details.method, details.url);
        }
        callback({ cancel: false });
      });
      authSession.webRequest.onCompleted((details) => {
        if (details.url.includes('login.goicon.com') || details.url.includes('api.goicon.com')) {
          console.log('[authWindow response]', details.statusCode, details.url);
        }
      });
      authSession.webRequest.onHeadersReceived((details, callback) => {
        if (details.url.includes('login.goicon.com') || details.url.includes('api.goicon.com')) {
          const setCookie = details.responseHeaders ? (details.responseHeaders['set-cookie'] || details.responseHeaders['Set-Cookie'] || []) : [];
          console.log('[authWindow set-cookie]', Array.isArray(setCookie) ? setCookie.length : 1, details.url);
        }
        callback({ cancel: false, responseHeaders: details.responseHeaders });
      });
    }

    authWindow.webContents.once('did-finish-load', async () => {
      if (!authWindow || authWindow.isDestroyed()) {
        return;
      }
      
      const performAuthApiLogin = async () => {
        const requestWithSession = (method, url, headers, body) => {
          return new Promise((resolveRequest, rejectRequest) => {
            const request = net.request({
              method,
              url,
              session: authWindow.webContents.session
            });
            if (headers) {
              Object.entries(headers).forEach(([key, value]) => {
                if (value) {
                  request.setHeader(key, value);
                }
              });
            }

            let responseBody = '';
            request.on('response', (response) => {
              response.on('data', (chunk) => {
                responseBody += chunk.toString();
              });
              response.on('end', () => {
                resolveRequest({ status: response.statusCode, body: responseBody, headers: response.headers });
              });
            });
            request.on('error', rejectRequest);
            if (body) {
              request.write(body);
            }
            request.end();
          });
        };

        const extractHiddenInputs = (html) => {
          const inputs = [];
          const inputRegex = /<input[^>]*type=["']?hidden["']?[^>]*>/gi;
          const nameRegex = /name=["']?([^"'\s>]+)["']?/i;
          const valueRegex = /value=["']?([^"']*)["']?/i;
          const matches = html.match(inputRegex) || [];
          matches.forEach((tag) => {
            const nameMatch = tag.match(nameRegex);
            const valueMatch = tag.match(valueRegex);
            if (nameMatch && nameMatch[1]) {
              inputs.push({ name: nameMatch[1], value: valueMatch ? valueMatch[1] : '' });
            }
          });
          return inputs;
        };

        const extractMetaToken = (html) => {
          const metaRegex = /<meta[^>]+name=["']?(csrf-token|csrf)["']?[^>]+content=["']?([^"']+)["']?[^>]*>/i;
          const match = html.match(metaRegex);
          return match ? match[2] : null;
        };

        const loginPageHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        };

        const loginPage = await requestWithSession('GET', 'https://login.goicon.com/login/', loginPageHeaders);
        const hiddenInputs = extractHiddenInputs(loginPage.body || '');
        const metaToken = extractMetaToken(loginPage.body || '');
        const tokenInput = hiddenInputs.find(input => ['csrf_token', '_csrf', 'csrf', 'token', '_token'].includes(input.name));

        const form = new URLSearchParams();
        form.append('username', username);
        form.append('password', password);
        form.append('c_s', 'yes');
        form.append('submit', '');
        if (tokenInput && tokenInput.name && tokenInput.value) {
          form.append(tokenInput.name, tokenInput.value);
        }
        let backValue = '';
        hiddenInputs.forEach((input) => {
          if (input.name && !form.has(input.name)) {
            const value = input.value || '';
            form.append(input.name, value);
            if (input.name === 'back') {
              backValue = value;
            }
          }
        });
        if (!form.has('back') || !backValue) {
          form.set('back', `${config.GOICON_API_URL}social`);
        }

        const loginCookies = await authWindow.webContents.session.cookies.get({ domain: 'login.goicon.com' });
        const cookieHeader = loginCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        const xsrfCookie = loginCookies.find(cookie => cookie.name === 'XSRF-TOKEN');

        if (process.env.AUTH_DEBUG === '1') {
          console.log('Auth API hidden inputs:', hiddenInputs.map(i => ({
            name: i.name,
            valueLength: i.value ? i.value.length : 0
          })));
          console.log('Auth API token fields:', {
            tokenName: tokenInput ? tokenInput.name : null,
            tokenValueLength: tokenInput && tokenInput.value ? tokenInput.value.length : 0,
            metaTokenLength: metaToken ? metaToken.length : 0,
            xsrfCookieLength: xsrfCookie && xsrfCookie.value ? xsrfCookie.value.length : 0
          });
          console.log('Auth API login cookies:', loginCookies.map(c => c.name));
          console.log('Auth API back value length:', form.get('back') ? form.get('back').length : 0);
        }

        const authHeaders = {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://login.goicon.com',
          'Referer': 'https://login.goicon.com/login/',
          'User-Agent': loginPageHeaders['User-Agent'],
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': loginPageHeaders['Accept-Language'],
          'Cookie': cookieHeader
        };
        if (metaToken) {
          authHeaders['X-CSRF-Token'] = metaToken;
        }
        if (xsrfCookie && xsrfCookie.value) {
          authHeaders['X-XSRF-TOKEN'] = xsrfCookie.value;
        }

        const authResponse = await requestWithSession(
          'POST',
          'https://login.goicon.com/login/services/user_api/get_user_authentication',
          authHeaders,
          form.toString()
        );

        if (process.env.AUTH_DEBUG === '1') {
          console.log('Auth API response headers:', authResponse.headers);
        }

        return { status: authResponse.status, body: authResponse.body };
      };

      const waitForPageLoad = async () => {
        await new Promise(resolveLoaded => {
          const timeout = setTimeout(resolveLoaded, 8000);
          authWindow.webContents.once('did-finish-load', () => {
            clearTimeout(timeout);
            resolveLoaded();
          });
        });
      };

      const delay = (ms) => new Promise(resolveDelay => setTimeout(resolveDelay, ms));

      const touchApiHost = async () => {
        try {
          await authWindow.loadURL('https://api.goicon.com/user-context');
          await waitForPageLoad();
          return true;
        } catch (touchError) {
          console.warn('Could not touch api.goicon.com/user-context:', touchError.message);
          try {
            await authWindow.loadURL('https://beta-api.goicon.com/');
            await waitForPageLoad();
            return true;
          } catch (betaError) {
            console.warn('Could not touch beta-api.goicon.com:', betaError.message);
          }
        }
        return false;
      };

      const collectCookies = async () => {
        const cookiesAfter = await authWindow.webContents.session.cookies.get({});
        if (process.env.AUTH_DEBUG === '1') {
          console.log('Auth session cookies (all domains):', (cookiesAfter || []).map(c => `${c.name}@${c.domain}`));
        }
        const goIconCookies = (cookiesAfter || []).filter(cookie =>
          cookie.domain && cookie.domain.includes('goicon.com')
        );
        console.log('Auth session cookies (goicon.com):', goIconCookies.map(c => `${c.name}@${c.domain}`));

        const existingCookieNames = new Set(goIconCookies.map(cookie => cookie.name));
        const standardCookies = [
          {
            name: 'G_ENABLED_IDPS',
            value: 'google',
            domain: '.goicon.com',
            path: '/',
            httpOnly: false,
            secure: true
          },
          {
            name: 'inactivityDuration',
            value: '600000',
            domain: '.goicon.com',
            path: '/',
            httpOnly: false,
            secure: true
          },
          {
            name: 'IANA_timezone_key',
            value: 'America%2FNew_York',
            domain: '.goicon.com',
            path: '/',
            httpOnly: false,
            secure: true
          }
        ].filter(cookie => !existingCookieNames.has(cookie.name));

        return { goIconCookies, standardCookies };
      };

      const attemptAuthViaApi = async () => {
        const authResponse = await performAuthApiLogin();
        let loginResponse = null;
        try {
          loginResponse = JSON.parse(authResponse.body);
        } catch (parseError) {
          loginResponse = { rawText: authResponse.body };
        }
        if (process.env.AUTH_DEBUG === '1') {
          console.log('Auth API raw response:', authResponse.body);
        }

        if (authResponse.status !== 200) {
          return { success: false, error: `Login failed (${authResponse.status})` };
        }

        await touchApiHost();

        let redirectUrl = null;
              if (loginResponse && typeof loginResponse === 'object') {
                console.log('=== ANALYZING LOGIN RESPONSE FOR REDIRECT ===');
                if (loginResponse.redirect_url || loginResponse.redirectUrl || loginResponse.redirect) {
                  let rawRedirectUrl = loginResponse.redirect_url || loginResponse.redirectUrl || loginResponse.redirect;
                  if (rawRedirectUrl && !rawRedirectUrl.startsWith('http')) {
                    const cleanPath = rawRedirectUrl.startsWith('/') ? rawRedirectUrl.slice(1) : rawRedirectUrl;
                    redirectUrl = `${config.GOICON_API_URL}${cleanPath}`;
                  } else {
                    redirectUrl = rawRedirectUrl;
                  }
                  console.log('Found redirect URL in login response:', redirectUrl);
                }
                if (loginResponse.success && loginResponse.url) {
                  redirectUrl = loginResponse.url;
                  console.log('Found success URL in login response:', redirectUrl);
                }
                if (loginResponse.location) {
                  redirectUrl = loginResponse.location;
                  console.log('Found location in login response:', redirectUrl);
                }
                console.log('=== END LOGIN RESPONSE ANALYSIS ===');
              }

        const { goIconCookies, standardCookies } = await collectCookies();
        if (goIconCookies.length === 0 || !hasValidAuthTokens(goIconCookies)) {
          return { success: false, error: INVALID_CREDENTIALS_MESSAGE };
        }

        return {
          success: true,
          redirectUrl,
          cookies: [...goIconCookies, ...standardCookies]
        };
      };

      const attemptAuthViaServer = async () => {
        const serverUrl = process.env.AUTH_SERVER_URL;
        if (!serverUrl) {
          return { success: false, error: 'AUTH_SERVER_URL is not set' };
        }

        const badCredentialsMessage =
          "We can't find that username and password. You can reset your password or try again.";

        const requestBody = JSON.stringify({ username, password });
        const response = await new Promise((resolveRequest, rejectRequest) => {
          const request = net.request({
            method: 'POST',
            url: serverUrl
          });
          request.setHeader('Content-Type', 'application/json');
          request.setHeader('Accept', 'application/json');
          // Ensure the response body is plain JSON (avoid brotli compression)
          request.setHeader('Accept-Encoding', 'identity');
          if (process.env.AUTH_DEBUG === '1') {
            console.log('Auth server request:', serverUrl);
          }

          let body = '';
          request.on('response', (res) => {
            res.on('data', (chunk) => {
              body += chunk.toString();
            });
            res.on('end', () => {
              resolveRequest({ status: res.statusCode, body, headers: res.headers });
            });
          });
          request.on('error', rejectRequest);
          request.write(requestBody);
          request.end();
        });

        if (process.env.AUTH_DEBUG === '1') {
          console.log('Auth server response status:', response.status);
          console.log('Auth server response headers:', response.headers);
          console.log('Auth server response body:', response.body);
        }

        if (response.status !== 200) {
          if (response.status === 401) {
            return { success: false, error: badCredentialsMessage };
          }
          return { success: false, error: `Auth server failed (${response.status})` };
        }

        let json = null;
        try {
          json = JSON.parse(response.body);
        } catch (parseError) {
          json = null;
        }

        if (json && json.success === false) {
          const errorText = typeof json.error === 'string' ? json.error : '';
          if (/login failed|missing auth tokens/i.test(errorText)) {
            return { success: false, error: badCredentialsMessage };
          }
          return { success: false, error: json.error || 'Auth server rejected login' };
        }

        const extractCookieValue = (obj, keys) => {
          if (!obj) return null;
          for (const key of keys) {
            if (obj[key]) return obj[key];
          }
          return null;
        };

        const cookieArrayToMap = (value) => {
          if (!Array.isArray(value)) {
            return value;
          }
          return value.reduce((acc, entry) => {
            if (entry && entry.name) {
              acc[entry.name] = entry.value;
            }
            return acc;
          }, {});
        };

        const cookieMap = cookieArrayToMap(json && json.cookies ? json.cookies : {});
        const tokensSource = cookieArrayToMap(json && (json.tokens || json.data) ? (json.tokens || json.data) : {});

        const caremergeApiKey = extractCookieValue(tokensSource, ['caremerge_api_key', 'caremergeApiKey', 'icon.caremergeApiKey', 'icon_api_key'])
          || extractCookieValue(cookieMap, ['caremerge_api_key', 'icon_api_key']);
        const softSessionId = extractCookieValue(tokensSource, ['softSessionId', 'icon.sessionTokenId', 'sessionTokenId', 'api-auth'])
          || extractCookieValue(cookieMap, ['softSessionId', 'api-auth']);
        const userSessionId = extractCookieValue(tokensSource, ['userSessionId', 'icon.userTokenId', 'userTokenId', 'iconUserId'])
          || extractCookieValue(cookieMap, ['userSessionId', 'iconUserId']);

        const serverCookies = Array.isArray(json && json.cookies)
          ? json.cookies.map((cookie) => ({
              name: cookie.name,
              value: String(cookie.value),
              domain: cookie.domain || '.goicon.com',
              path: cookie.path || '/',
              httpOnly: true,
              secure: true
            }))
          : [];

        if (serverCookies.length === 0) {
          if (caremergeApiKey) {
            serverCookies.push({
              name: 'caremerge_api_key',
              value: String(caremergeApiKey),
              domain: '.goicon.com',
              path: '/',
              httpOnly: true,
              secure: true
            });
          }
          if (softSessionId) {
            serverCookies.push({
              name: 'softSessionId',
              value: String(softSessionId),
              domain: '.goicon.com',
              path: '/',
              httpOnly: true,
              secure: true
            });
          }
          if (userSessionId) {
            serverCookies.push({
              name: 'userSessionId',
              value: String(userSessionId),
              domain: '.goicon.com',
              path: '/',
              httpOnly: true,
              secure: true
            });
          }
        }

        if (!caremergeApiKey || !userSessionId) {
          return { success: false, error: badCredentialsMessage };
        }

            const standardCookies = [
              {
                name: 'G_ENABLED_IDPS',
                value: 'google',
                domain: '.goicon.com',
                path: '/',
                httpOnly: false,
                secure: true
              },
              {
                name: 'inactivityDuration',
                value: '600000',
                domain: '.goicon.com',
                path: '/',
                httpOnly: false,
                secure: true
              },
              {
                name: 'IANA_timezone_key',
                value: 'America%2FNew_York',
                domain: '.goicon.com',
                path: '/',
                httpOnly: false,
                secure: true
              }
            ];

        return {
          success: true,
          redirectUrl: `${config.GOICON_API_URL}social`,
          cookies: [...serverCookies, ...standardCookies]
        };
      };

      const attemptAuthViaForm = async () => {
        const formResult = await authWindow.webContents.executeJavaScript(`
          (() => {
            try {
              const usernameField = document.querySelector('input[name="username"]');
              const passwordField = document.querySelector('input[name="password"]');
              const form = usernameField ? usernameField.closest('form') : document.querySelector('form');
              if (!usernameField || !passwordField || !form) {
                return { ok: false, error: 'Login form fields not found' };
              }

              const hiddenInputs = Array.from(form.querySelectorAll('input[type="hidden"]'))
                .map(el => ({ name: el.name, value: el.value }))
                .filter(el => el.name);
              const hasCaptcha = !!document.querySelector('.g-recaptcha, .h-captcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"]');
              const backValue = ${JSON.stringify(`${config.GOICON_API_URL}social`)};
              const debug = {
                action: form.getAttribute('action') || '',
                method: (form.getAttribute('method') || 'get').toLowerCase(),
                hiddenInputs,
                hasCaptcha,
                backValue
              };

              usernameField.value = ${JSON.stringify(username)};
              passwordField.value = ${JSON.stringify(password)};
              usernameField.dispatchEvent(new Event('input', { bubbles: true }));
              passwordField.dispatchEvent(new Event('input', { bubbles: true }));

              const csFields = Array.from(form.querySelectorAll('input[name="c_s"]'));
              if (csFields.length > 0) {
                csFields.forEach((field, index) => {
                  if (index === 0) {
                    field.value = 'yes';
                  } else {
                    field.remove();
                  }
                });
              }
              const backField = form.querySelector('input[name="back"]');
              if (backField) {
                backField.value = backValue;
              }
              form.setAttribute('action', \`/login/?back=\${encodeURIComponent(backValue)}\`);

              if (typeof form.requestSubmit === 'function') {
                const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
                form.requestSubmit(submitButton || undefined);
              } else {
                const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
                if (submitButton && typeof submitButton.click === 'function') {
                  submitButton.click();
                } else {
                  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }
              return { ok: true, debug };
            } catch (err) {
              return { ok: false, error: err && err.message ? err.message : String(err) };
            }
          })();
        `);

        if (!formResult || formResult.ok === false) {
          return { success: false, error: formResult && formResult.error ? formResult.error : 'Could not find login form' };
        }

        if (process.env.AUTH_DEBUG === '1') {
          console.log('Form auth debug:', formResult.debug);
        }

        const waitForAuthResult = async () => {
          const maxWaitMs = 12000;
          const intervalMs = 500;
          let elapsed = 0;
          while (elapsed < maxWaitMs) {
            const currentUrl = authWindow.webContents.getURL();
            const cookies = await authWindow.webContents.session.cookies.get({});
            const names = cookies.map(cookie => cookie.name);
            const hasTokens = names.some(name =>
              ['caremerge_api_key', 'softSessionId', 'userSessionId'].includes(name)
            );
            const navigatedAway = currentUrl && !currentUrl.includes('login.goicon.com');
            if (hasTokens || navigatedAway) {
              return { hasTokens, currentUrl };
            }
            await delay(intervalMs);
            elapsed += intervalMs;
          }
          return { hasTokens: false, currentUrl: authWindow.webContents.getURL() };
        };

        const authResult = await waitForAuthResult();
        if (!authResult.hasTokens) {
          const errorInfo = await authWindow.webContents.executeJavaScript(`
            (() => {
              const selectors = [
                '.alert',
                '.alert-danger',
                '.error',
                '.error-message',
                '#error',
                '#login-error',
                '.form-error'
              ];
              for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent) {
                  return el.textContent.trim();
                }
              }
              return '';
            })();
          `);
          if (process.env.AUTH_DEBUG === '1') {
            console.log('Form auth failed URL:', authResult.currentUrl);
            console.log('Form auth error text:', errorInfo);
          }

          if (process.env.AUTH_DEBUG === '1') {
            const loginCookies = await authWindow.webContents.session.cookies.get({ domain: 'login.goicon.com' });
            const cookieHeader = loginCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            const form = new URLSearchParams();
            form.append('username', username);
            form.append('password', password);
            form.append('c_s', 'yes');
            form.append('submit', '');
            form.append('back', `${config.GOICON_API_URL}social`);

            const response = await new Promise((resolveRequest, rejectRequest) => {
              const request = net.request({
                method: 'POST',
                url: 'https://login.goicon.com/login/',
                session: authWindow.webContents.session
              });
              request.setHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
              request.setHeader('Origin', 'https://login.goicon.com');
              request.setHeader('Referer', 'https://login.goicon.com/login/');
              request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36');
              request.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
              if (cookieHeader) {
                request.setHeader('Cookie', cookieHeader);
              }

              let body = '';
              request.on('response', (res) => {
                res.on('data', (chunk) => {
                  body += chunk.toString();
                });
                res.on('end', () => {
                  resolveRequest({ status: res.statusCode, body, headers: res.headers });
                });
              });
              request.on('error', rejectRequest);
              request.write(form.toString());
              request.end();
            });

            const bodySnippet = response.body ? response.body.slice(0, 500) : '';
            const hasInvalid = /invalid|incorrect|error/i.test(bodySnippet);
            console.log('Form auth POST status:', response.status);
            console.log('Form auth POST set-cookie count:', response.headers && response.headers['set-cookie'] ? response.headers['set-cookie'].length : 0);
            console.log('Form auth POST body snippet:', bodySnippet);
            console.log('Form auth POST body has error keywords:', hasInvalid);
          }
        }

        if (authResult.hasTokens) {
          await touchApiHost();
        }

        const { goIconCookies, standardCookies } = await collectCookies();
        if (goIconCookies.length === 0 || !hasValidAuthTokens(goIconCookies)) {
          return { success: false, error: INVALID_CREDENTIALS_MESSAGE };
        }

        return {
          success: true,
          redirectUrl: null,
          cookies: [...goIconCookies, ...standardCookies]
        };
      };

      try {
        const strategy = (process.env.AUTH_STRATEGY || 'auto').toLowerCase();
        let finalResult;

        if (strategy === 'form') {
          console.log('Auth strategy: form');
          finalResult = await attemptAuthViaForm();
        } else if (strategy === 'api') {
          console.log('Auth strategy: api');
          finalResult = await attemptAuthViaApi();
        } else if (strategy === 'server') {
          console.warn('Auth strategy: server is disabled, using form');
          finalResult = await attemptAuthViaForm();
        } else {
          console.log('Auth strategy: auto (form → api)');
          const formResult = await attemptAuthViaForm();
          if (formResult.success) {
            finalResult = formResult;
          } else {
            const apiResult = await attemptAuthViaApi();
            finalResult = apiResult.success
              ? apiResult
              : {
                  success: false,
                  error: apiResult.error || formResult.error || 'Authentication failed'
                };
          }
        }

            if (authWindow && !authWindow.isDestroyed()) {
              authWindow.close();
            }

        if (finalResult.success) {
              resolve({
                success: true,
                data: { 
                  message: 'Login successful',
              redirectUrl: finalResult.redirectUrl || `${config.GOICON_API_URL}social`
                },
            cookies: finalResult.cookies
              });
          return;
        }

              resolve({
                success: false,
          error: finalResult.error || 'Authentication failed'
              });
          } catch (error) {
            console.error('Authentication error:', error);
            if (authWindow && !authWindow.isDestroyed()) {
              authWindow.close();
            }
            resolve({
              success: false,
              error: 'Authentication failed'
            });
          }
    });

    authWindow.webContents.on('did-fail-load', () => {
      if (authWindow && !authWindow.isDestroyed()) {
        authWindow.close();
      }
      resolve({
        success: false,
        error: 'Could not load login page'
      });
    });
  });
}

// Function to set cookies in the main window's session
async function setCookiesInSession(cookies) {
  const mainSession = session.defaultSession;
  
  const mirrorToApiDomain = new Set([
    'caremerge_api_key',
    'softSessionId',
    'userSessionId',
    'api-auth',
    'iconUserId',
    'icon_api_key'
  ]);
  const mirrorToLoginDomain = new Set(mirrorToApiDomain);

  for (const cookie of cookies) {
    try {
      if (!cookie.value || String(cookie.value).toLowerCase() === 'deleted') {
        console.log(`Skipping deleted cookie: ${cookie.name}`);
        continue;
      }
      // Skip cookies that are causing domain issues
      if (['AWSELB', 'AWSELBCORS'].includes(cookie.name)) {
        console.log(`Skipping problematic cookie: ${cookie.name}`);
        continue;
      }

      const cookieDomain = cookie.domain ? cookie.domain.replace(/^\./, '') : null;
      const cookieUrl = cookieDomain ? `https://${cookieDomain}` : config.GOICON_API_URL;
        
      const cookieOptions = {
        url: cookieUrl,
        name: cookie.name,
        value: cookie.value,
        path: cookie.path || '/',
        httpOnly: typeof cookie.httpOnly === 'boolean' ? cookie.httpOnly : false,
        secure: typeof cookie.secure === 'boolean' ? cookie.secure : true,
        sameSite: cookie.sameSite || 'no_restriction'
      };

      if (cookie.expirationDate) {
        cookieOptions.expirationDate = cookie.expirationDate;
      }

        // Only set domain if the cookie originally had a goicon.com domain
        if (cookie.domain && cookie.domain.includes('goicon.com')) {
          cookieOptions.domain = cookie.domain;
        }

        await mainSession.cookies.set(cookieOptions);
        console.log(`Successfully set cookie: ${cookie.name}`);

      // Mirror auth cookies to api.goicon.com to ensure API host sees them
      if (mirrorToApiDomain.has(cookie.name) && !cookieDomain?.includes('api.goicon.com')) {
        const apiCookieOptions = {
          ...cookieOptions,
          url: 'https://api.goicon.com',
          domain: 'api.goicon.com'
        };
        await mainSession.cookies.set(apiCookieOptions);
        console.log(`Successfully mirrored cookie to api.goicon.com: ${cookie.name}`);
      }
      if (mirrorToLoginDomain.has(cookie.name) && !cookieDomain?.includes('login.goicon.com')) {
        const loginCookieOptions = {
          ...cookieOptions,
          url: 'https://login.goicon.com',
          domain: 'login.goicon.com'
        };
        await mainSession.cookies.set(loginCookieOptions);
        console.log(`Successfully mirrored cookie to login.goicon.com: ${cookie.name}`);
      }
    } catch (error) {
      console.error('Error setting cookie:', cookie.name, error.message);
    }
  }

  if (process.env.AUTH_DEBUG === '1') {
    try {
      const goiconCookies = await mainSession.cookies.get({ domain: 'goicon.com' });
      const apiCookies = await mainSession.cookies.get({ domain: 'api.goicon.com' });
      console.log('Main session goicon.com cookies:', goiconCookies.map(c => `${c.name}@${c.domain}`));
      console.log('Main session api.goicon.com cookies:', apiCookies.map(c => `${c.name}@${c.domain}`));
    } catch (error) {
      console.error('Error reading main session cookies:', error.message);
    }
  }
}

app.whenReady().then(async () => {
  const mainSession = session.defaultSession;
  mainSession.webRequest.onHeadersReceived(
    { urls: ['*://*.goicon.com/*'] },
    (details, callback) => {
      const responseHeaders = details.responseHeaders || {};
      const cspHeaderKey = Object.keys(responseHeaders).find(
        header => header.toLowerCase() === 'content-security-policy'
      );
      if (cspHeaderKey) {
        const rawHeader = responseHeaders[cspHeaderKey];
        const cspValue = Array.isArray(rawHeader) ? rawHeader.join('; ') : String(rawHeader || '');
        let updatedCsp = ensureCspDirective(cspValue, 'worker-src', ['blob:', 'data:']);
        updatedCsp = ensureCspDirective(updatedCsp, 'child-src', ['blob:', 'data:']);
        updatedCsp = ensureCspDirective(updatedCsp, 'frame-src', ['blob:', 'data:']);
        updatedCsp = ensureCspDirective(updatedCsp, 'object-src', ['blob:', 'data:']);
        if (updatedCsp && updatedCsp !== cspValue) {
          responseHeaders[cspHeaderKey] = [updatedCsp];
        }
      }
      callback({ responseHeaders });
    }
  );

  mainSession.webRequest.onCompleted(
    { urls: ['*://*.goicon.com/*'] },
    (details) => {
      const url = details.url || '';
      if (url.includes('.pdf') || details.resourceType === 'worker') {
        console.log('[webrequest]', details.statusCode, details.resourceType, url);
      }
    }
  );

  mainSession.webRequest.onErrorOccurred(
    { urls: ['*://*.goicon.com/*'] },
    (details) => {
      const url = details.url || '';
      if (url.includes('.pdf') || details.resourceType === 'worker') {
        console.log('[webrequest-error]', details.error, details.resourceType, url);
      }
    }
  );

  // Check for URL on launch (Windows)
  if (process.platform === 'win32') {
    const url = process.argv.find(arg => arg.startsWith('https://goicon.com') || arg.startsWith('https://api.goicon.com'));
    if (url) {
      handleDeepLink(url);
    }
  }
  
  // Check if user has stored credentials (if keytar is available)
  let storedCreds = null;
  if (keytar) {
    try {
      storedCreds = await keytar.getPassword(SERVICE_NAME, 'last_username');
    } catch (error) {
      console.warn('Could not check stored credentials:', error);
    }
  }
  
  // Show login window (with or without stored credentials)
  createLoginWindow();
  
  // Check for updates after login window is ready
  const shouldCheckUpdates = !isDev || !!localUpdateUrl || forceUpdateCheck;
  if (shouldCheckUpdates) {
    setTimeout(() => {
      console.log('Checking for app updates...');
      autoUpdater.checkForUpdates().catch(err => {
        console.log('Could not check for updates:', err.message);
      });
    }, 5000); // Wait 5 seconds after app starts
  } else {
    console.log('Skipping update check (dev mode without local feed).');
  }
});

// Handle deep links on Mac
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createLoginWindow();
  }
});
