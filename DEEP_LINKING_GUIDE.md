# Deep Linking Guide for TrueSpan Living

## What is Deep Linking?

Deep linking allows you to open the TrueSpan Living app directly from emails, websites, or other applications using special URLs.

---

## How It Works

### **Custom Protocol: `truespanliving://`**

Any URL starting with `truespanliving://` will open your app!

---

## Examples

### **Basic Deep Links:**

```
truespanliving://social
```
Opens the app and navigates to `https://api.goicon.com/social`

```
truespanliving://dashboard
```
Opens the app and navigates to `https://api.goicon.com/dashboard`

```
truespanliving://facilities
```
Opens the app and navigates to `https://api.goicon.com/facilities`

```
truespanliving://settings/profile
```
Opens the app and navigates to `https://api.goicon.com/settings/profile`

---

## Use Cases

### **1. Email Links**

In your emails, use deep links to direct users to specific pages:

```html
<a href="truespanliving://social">Open TrueSpan Living</a>
```

### **2. Website Links**

On your goicon.com website, add "Open in App" buttons:

```html
<a href="truespanliving://dashboard" class="btn">Open in Desktop App</a>
```

### **3. Push Notifications**

If you add push notifications, use deep links in the notification actions:

```javascript
notification.onclick = () => {
  window.open('truespanliving://notifications');
};
```

---

## Behavior

### **If App is Closed:**
1. App launches
2. Shows login screen (if not logged in)
3. After login, navigates to the deep link URL

### **If App is Already Running:**
1. App comes to foreground
2. Navigates to the deep link URL immediately

### **If User is on Login Screen:**
1. Stores the deep link URL
2. After successful login, navigates to the deep link URL

---

## HTML Email Template Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>TrueSpan Living Notification</title>
</head>
<body>
    <h2>New Activity in TrueSpan Living</h2>
    <p>You have new updates waiting for you!</p>
    
    <!-- Deep link button -->
    <a href="truespanliving://social" 
       style="background-color: #4CAF50; 
              color: white; 
              padding: 15px 32px; 
              text-decoration: none; 
              display: inline-block; 
              border-radius: 4px;">
        Open in TrueSpan Living App
    </a>
    
    <!-- Fallback web link -->
    <p>
        Don't have the app? 
        <a href="https://api.goicon.com/social">Open in Browser</a>
    </p>
</body>
</html>
```

---

## Testing Deep Links

### **On Windows:**

1. Build the app: `npm run build:win`
2. Install the app
3. Open Run dialog (Win + R)
4. Type: `truespanliving://social`
5. Press Enter

### **On Mac:**

1. Build the app: `npm run build:mac`
2. Install the app
3. Open Terminal
4. Run: `open truespanliving://social`

### **From Browser:**

Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Deep Link Test</title>
</head>
<body>
    <h1>Test Deep Links</h1>
    <ul>
        <li><a href="truespanliving://social">Open Social</a></li>
        <li><a href="truespanliving://dashboard">Open Dashboard</a></li>
        <li><a href="truespanliving://facilities">Open Facilities</a></li>
    </ul>
</body>
</html>
```

Open this file in a browser and click the links!

---

## Advanced: Dynamic Deep Links with Parameters

You can pass path parameters in the URL:

```
truespanliving://facilities/123
```
→ Opens `https://api.goicon.com/facilities/123`

```
truespanliving://users/profile/456
```
→ Opens `https://api.goicon.com/users/profile/456`

---

## Security Considerations

1. ✅ Deep links only work with `truespanliving://` protocol
2. ✅ User must be logged in to see content
3. ✅ App validates all URLs before navigating
4. ✅ Only navigates to goicon.com domain
5. ⚠️ Don't put sensitive data in deep link URLs (they can be logged)

---

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Windows | ✅ Working | Registered in NSIS installer |
| macOS | ✅ Working | Registered in Info.plist |
| Web Browser | ✅ Working | Prompts user to open app |

---

## Troubleshooting

### **Deep Links Not Working?**

1. **Make sure app is installed:**
   - The protocol is registered during installation
   - Reinstall if needed

2. **Windows: Check Registry:**
   - Open Registry Editor
   - Look for: `HKEY_CLASSES_ROOT\truespanliving`
   - Should point to your app executable

3. **Mac: Check Info.plist:**
   - Right-click app → Show Package Contents
   - Open `Contents/Info.plist`
   - Look for `CFBundleURLSchemes` with `truespanliving`

4. **Browser Blocking:**
   - Some browsers may block custom protocols
   - User may need to allow the protocol in browser settings

---

## Next Steps

### **Want to Use Your Own Domain?**

For URLs like `goicon.com/app/open` instead of `truespanliving://`, you'll need:

1. **Universal Links (iOS/macOS)**
2. **App Links (Android/Windows)**
3. Domain verification file on your server

This is more complex but provides a seamless experience. Let me know if you want to set this up!

---

## Questions?

- Need help integrating deep links into your emails?
- Want to add query parameters?
- Need tracking/analytics on deep link usage?

Just ask! 🚀

