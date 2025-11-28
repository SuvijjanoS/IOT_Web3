# Frontend Update Instructions

## ✅ Frontend Has Been Rebuilt

The frontend container has been rebuilt with the latest changes including:
- Drone Flight Dashboard component
- Updated navigation with "Drone Flights" link
- Updated homepage with drone flights card

## If You're Not Seeing Updates

### 1. Clear Browser Cache

**Chrome/Edge:**
- Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
- Select "Cached images and files"
- Click "Clear data"

**Firefox:**
- Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
- Select "Cache"
- Click "Clear Now"

**Safari:**
- Press `Cmd+Option+E` to empty caches
- Or go to Safari → Preferences → Advanced → Show Develop menu
- Then Develop → Empty Caches

### 2. Hard Refresh

- **Windows/Linux**: `Ctrl+F5` or `Ctrl+Shift+R`
- **Mac**: `Cmd+Shift+R`

### 3. Use Incognito/Private Mode

Open a new incognito/private window and visit:
- https://web3iot.dhammada.com

### 4. Verify Updates Are Live

Check these URLs:
- **Homepage**: https://web3iot.dhammada.com
  - Should show "Drone Flight Logs" card
  - Should have "Drone Flights" in navigation

- **Drone Dashboard**: https://web3iot.dhammada.com/drones
  - Should load the drone flight dashboard
  - Should show "🛸 Drone Flight Logs Dashboard"

### 5. Check Browser Console

1. Press `F12` to open Developer Tools
2. Go to Console tab
3. Look for any errors
4. Go to Network tab
4. Refresh page (`F5`)
5. Check if JavaScript files are loading (should see `index-*.js`)

### 6. Verify Server Files

The frontend has been rebuilt. Current build includes:
- `index-BTtmJkuU.js` (624.38 kB)
- `index-UnxzN3lI.css` (13.90 kB)

These files contain the new drone flight dashboard code.

## What Should Be Visible

### Homepage (`/`)
- **Navigation bar** should include:
  - Home
  - IoT Dashboard
  - **Drone Flights** ← NEW
  - Web3 Process
  - Control Panel

- **Feature cards** should include:
  - IoT Dashboard card
  - **Drone Flight Logs card** ← NEW (🛸 icon)
  - Web3 Process card
  - Control Panel card

### Drone Flights Page (`/drones`)
- Header: "🛸 Drone Flight Logs Dashboard"
- Drone selector dropdown
- Flight cards (when flights exist)
- Charts and visualizations (when flight selected)

## If Still Not Working

1. **Check server logs:**
   ```bash
   docker logs iot_web3_frontend --tail 50
   ```

2. **Verify git pull:**
   ```bash
   cd /root/IOT_web3
   git log --oneline -3
   ```
   Should see: "Add drone flight logs integration..."

3. **Force rebuild:**
   ```bash
   docker-compose down frontend
   docker-compose build --no-cache frontend
   docker-compose up -d frontend
   ```

## Current Status

✅ Code pulled from GitHub  
✅ Frontend rebuilt  
✅ Container restarted  
✅ Files deployed  

The frontend is updated and running. If you're not seeing changes, it's likely a browser cache issue. Try clearing cache or using incognito mode.

