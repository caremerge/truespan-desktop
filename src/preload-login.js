const { contextBridge, ipcRenderer } = require('electron');

const safeInvoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld('truespanIPC', {
  invoke: safeInvoke,
  onUpdateStatus: (handler) => {
    if (typeof handler !== 'function') {
      return;
    }
    ipcRenderer.on('update-status', (_event, payload) => {
      handler(payload);
    });
  }
});

contextBridge.exposeInMainWorld('truespanAuth', {
  getStoredCredentials: () => safeInvoke('get-stored-credentials'),
  saveCredentials: (username, password) =>
    safeInvoke('set-stored-credentials', { username, password }),
  clearCredentials: () => safeInvoke('clear-stored-credentials'),
  openForgotPassword: () => safeInvoke('open-forgot-password'),
  login: (username, password) => safeInvoke('login', { username, password })
});
