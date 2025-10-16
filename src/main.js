const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const keytar = require('keytar');
const config = require('./config');

// Keep a global reference of the window objects
let mainWindow;
let loginWindow;
let isLoggedOut = false; // Flag to track if user manually logged out
let deeplinkingUrl; // Store deep link URL to open after login

// Configuration from config.js
const WEBSITE_URL = config.GOICON_API_URL;
const SERVICE_NAME = config.APP_NAME;

// Handle URLs from Universal Links (Mac) / App Links (Windows)
function handleDeepLink(url) {
  console.log('Deep link received:', url);
  
  // Handle goicon.com URLs
  if (url.startsWith('https://goicon.com') || url.startsWith('https://api.goicon.com')) {
    const targetUrl = url;
    
    console.log('Opening URL:', targetUrl);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      // App is running, navigate to URL
      mainWindow.loadURL(targetUrl);
      mainWindow.show();
      mainWindow.focus();
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

function createLoginWindow() {
  // Close existing login window if it exists
  if (loginWindow) {
    loginWindow.close();
    loginWindow = null;
  }

  loginWindow = new BrowserWindow({
    width: config.LOGIN_WINDOW.width,
    height: config.LOGIN_WINDOW.height,
    title: 'TrueSpan Living',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: false,
    maximizable: false,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/logo.png')
  });

  loginWindow.loadFile('src/login.html');

  loginWindow.once('ready-to-show', () => {
    if (loginWindow) {
      loginWindow.show();
    }
  });

  loginWindow.on('closed', () => {
    loginWindow = null;
    if (!mainWindow) {
      app.quit();
    }
  });
}

function createLoginWindowWithError(errorMessage) {
  // Close existing login window if it exists
  if (loginWindow) {
    loginWindow.close();
    loginWindow = null;
  }

  loginWindow = new BrowserWindow({
    width: config.LOGIN_WINDOW.width,
    height: config.LOGIN_WINDOW.height,
    title: 'TrueSpan Living',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: false,
    maximizable: false,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/logo.png')
  });

  loginWindow.loadFile('src/login.html');

  loginWindow.once('ready-to-show', () => {
    if (loginWindow) {
      loginWindow.show();
      
      // Show the error message after the window is ready
      setTimeout(() => {
        if (loginWindow && loginWindow.webContents) {
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
    title: 'TrueSpan Living',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/logo.png')
  });

  // Load the target URL (either redirect URL or default website)
  console.log('Loading main window with URL:', targetUrl);
  mainWindow.loadURL(targetUrl);

  mainWindow.webContents.on('did-finish-load', () => {
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
    mainWindow.show();
    if (loginWindow) {
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
    if (navigationUrl.includes('login.goicon.com') || 
        navigationUrl.includes('/login') || 
        navigationUrl.includes('logout') ||
        navigationUrl.includes('signin')) {
      console.log('Detected redirect to login page - user logged out');
      event.preventDefault(); // Stop the navigation
      
      // Set logout flag to prevent auto-login
      isLoggedOut = true;
      
      // Hide main window and show our login with error message
      mainWindow.hide();
      createLoginWindowWithError('Session expired or you have been logged out. Please log in again.');
    }
  });

  // Also monitor when the page finishes loading to catch login redirects
  mainWindow.webContents.on('did-finish-load', () => {
    const currentUrl = mainWindow.webContents.getURL();
    console.log('Page finished loading:', currentUrl);
    
    if (currentUrl.includes('login.goicon.com') || 
        currentUrl.includes('/login') || 
        currentUrl.includes('logout') ||
        currentUrl.includes('signin')) {
      console.log('Detected login page after load - user logged out');
      
      // Set logout flag to prevent auto-login
      isLoggedOut = true;
      
      mainWindow.hide();
      createLoginWindowWithError('Session expired or you have been logged out. Please log in again.');
    }
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Handle login form submission
ipcMain.handle('login', async (event, { username, password, rememberMe }) => {
  try {
    // Call your auth API here
    const authResult = await authenticateUser(username, password);
    
    if (authResult.success) {
      // Store credentials if remember me is checked
      if (rememberMe) {
        await keytar.setPassword(SERVICE_NAME, username, password);
        await keytar.setPassword(SERVICE_NAME, 'last_username', username);
      }

      // Set cookies/session data in the main window's session
      if (authResult.cookies) {
        await setCookiesInSession(authResult.cookies);
      }

      // Close existing main window if it exists (in case of re-login)
      if (mainWindow) {
        mainWindow.close();
        mainWindow = null;
      }

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
  }
});

// Get stored credentials
ipcMain.handle('get-stored-credentials', async () => {
  try {
    const lastUsername = await keytar.getPassword(SERVICE_NAME, 'last_username');
    if (lastUsername) {
      const password = await keytar.getPassword(SERVICE_NAME, lastUsername);
      return { username: lastUsername, password: password || '' };
    }
    return { username: '', password: '' };
  } catch (error) {
    console.error('Error retrieving stored credentials:', error);
    return { username: '', password: '' };
  }
});

// Clear stored credentials
ipcMain.handle('clear-stored-credentials', async () => {
  try {
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

// Function to authenticate user using a hidden webview (like your backend does)
async function authenticateUser(username, password) {
  return new Promise((resolve) => {
    // Create a hidden webview for authentication
    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      title: 'TrueSpan Living',
      show: false, // Hidden window
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Navigate to login page
    authWindow.loadURL('https://login.goicon.com/login/');

    authWindow.webContents.once('did-finish-load', () => {
      // Inject the login form submission
      const jsCode = `
        // Fill in the form
        const usernameField = document.querySelector('input[name="username"]');
        const passwordField = document.querySelector('input[name="password"]');
        
        if (usernameField && passwordField) {
          usernameField.value = ${JSON.stringify(username)};
          passwordField.value = ${JSON.stringify(password)};
          
          // Create and submit form data
          const formData = new URLSearchParams();
          formData.append('username', ${JSON.stringify(username)});
          formData.append('password', ${JSON.stringify(password)});
          formData.append('c_s', 'yes');
          formData.append('submit', '');
          
          // Submit the form
          fetch('/login/services/user_api/get_user_authentication', {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest'
            }
          }).then(response => {
            return response.text().then(text => {
              try {
                const data = JSON.parse(text);
                return data;
              } catch (parseError) {
                return { rawText: text };
              }
            });
          }).then(loginData => {
            // Store the login response globally so we can access it later
            window.loginResponse = loginData;
            return loginData;
          }).catch(err => {
            console.error('Login form submission error:', err);
            return false;
          });
        }
        
        // Return whether form fields were found
        !!(usernameField && passwordField);
      `;
      
      authWindow.webContents.executeJavaScript(jsCode).then(async (formFound) => {
        if (!formFound) {
          authWindow.close();
          resolve({
            success: false,
            error: 'Could not find login form'
          });
          return;
        }

        // Wait for the login to process (reduced from 3 seconds to 1.5)
        setTimeout(async () => {
          try {
            // Check current URL for any redirect information
            const currentURL = authWindow.webContents.getURL();
            console.log('Current auth URL:', currentURL);
            
            let redirectUrl = null;
            
            // Check if we got redirected to a specific URL
            if (currentURL.includes('redirect') || currentURL.includes('dashboard') || currentURL.includes('facilities')) {
              redirectUrl = currentURL;
              console.log('Found redirect URL from current URL:', redirectUrl);
            }
            
            // Get the login response data that we stored
            try {
              const loginResponse = await authWindow.webContents.executeJavaScript(`
                window.loginResponse;
              `);
              
              if (loginResponse && typeof loginResponse === 'object') {
                console.log('=== ANALYZING LOGIN RESPONSE FOR REDIRECT ===');
                
                // Check for explicit redirect URL
                if (loginResponse.redirect_url || loginResponse.redirectUrl || loginResponse.redirect) {
                  let rawRedirectUrl = loginResponse.redirect_url || loginResponse.redirectUrl || loginResponse.redirect;
                  
                  // If it's a relative URL, make it absolute
                  if (rawRedirectUrl && !rawRedirectUrl.startsWith('http')) {
                    // Remove leading slash if present to avoid double slashes
                    const cleanPath = rawRedirectUrl.startsWith('/') ? rawRedirectUrl.slice(1) : rawRedirectUrl;
                    redirectUrl = `${config.GOICON_API_URL}${cleanPath}`;
                  } else {
                    redirectUrl = rawRedirectUrl;
                  }
                  console.log('Found redirect URL in login response:', redirectUrl);
                }
                
                // Check for success response with URL
                if (loginResponse.success && loginResponse.url) {
                  redirectUrl = loginResponse.url;
                  console.log('Found success URL in login response:', redirectUrl);
                }
                
                // Check for location field
                if (loginResponse.location) {
                  redirectUrl = loginResponse.location;
                  console.log('Found location in login response:', redirectUrl);
                }
                
                console.log('=== END LOGIN RESPONSE ANALYSIS ===');
              }
            } catch (jsError) {
              console.log('Could not retrieve stored login response:', jsError);
            }
            
            // Get all cookies from the session after login
            const cookies = await authWindow.webContents.session.cookies.get({});
            
            // Filter for GoIcon cookies
            const goIconCookies = cookies.filter(cookie => 
              cookie.domain.includes('goicon.com')
            );

            // Add standard cookies
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

            authWindow.close();

            if (goIconCookies.length > 0) {
              resolve({
                success: true,
                data: { 
                  message: 'Login successful',
                  redirectUrl: redirectUrl // Include redirect URL if found
                },
                cookies: [...goIconCookies, ...standardCookies]
              });
            } else {
              resolve({
                success: false,
                error: 'Authentication failed - no session cookies received'
              });
            }
          } catch (error) {
            console.error('Authentication error:', error);
            authWindow.close();
            resolve({
              success: false,
              error: 'Authentication failed'
            });
          }
        }, 1500); // Wait 1.5 seconds for login to process
      }).catch((error) => {
        authWindow.close();
        resolve({
          success: false,
          error: 'Could not execute login script'
        });
      });
    });

    authWindow.webContents.on('did-fail-load', () => {
      authWindow.close();
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
  
  for (const cookie of cookies) {
    try {
      // Skip cookies that are causing domain issues
      if (['PHPSESSID', 'AWSELB', 'AWSELBCORS', 'ci_session'].includes(cookie.name)) {
        console.log(`Skipping problematic cookie: ${cookie.name}`);
        continue;
      }

      // Only set cookies that are relevant to GoIcon
      if (cookie.name.includes('caremerge') || 
          cookie.name.includes('Session') || 
          cookie.name.includes('session') ||
          cookie.name === 'G_ENABLED_IDPS' ||
          cookie.name === 'inactivityDuration' ||
          cookie.name === 'IANA_timezone_key') {
        
        const cookieOptions = {
          url: config.GOICON_API_URL,
          name: cookie.name,
          value: cookie.value,
          path: cookie.path || '/',
          httpOnly: cookie.httpOnly !== false,
          secure: cookie.secure !== false
        };

        // Only set domain if the cookie originally had a goicon.com domain
        if (cookie.domain && cookie.domain.includes('goicon.com')) {
          cookieOptions.domain = cookie.domain;
        }

        await mainSession.cookies.set(cookieOptions);
        console.log(`Successfully set cookie: ${cookie.name}`);
      }
    } catch (error) {
      console.error('Error setting cookie:', cookie.name, error.message);
    }
  }
}

app.whenReady().then(async () => {
  // Check for URL on launch (Windows)
  if (process.platform === 'win32') {
    const url = process.argv.find(arg => arg.startsWith('https://goicon.com') || arg.startsWith('https://api.goicon.com'));
    if (url) {
      handleDeepLink(url);
    }
  }
  
  // Check if user has stored credentials
  const storedCreds = await keytar.getPassword(SERVICE_NAME, 'last_username');
  
  if (storedCreds) {
    // Show login window with stored credentials
    createLoginWindow();
  } else {
    // Show login window
    createLoginWindow();
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
