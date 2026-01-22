const { contextBridge, ipcRenderer } = require('electron');

// Preload for main window: polyfills needed by upstream web app.
// Electron 27 (Chromium 118) does not support Promise.withResolvers yet.
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

contextBridge.exposeInMainWorld('truespanDesktop', {
  goBack: () => ipcRenderer.send('main-go-back')
});
