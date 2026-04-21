# GitHub Pages Deployment Guide for Wisdom Walker

## Cache-Busting Implementation

### What's Been Implemented:
1. **Aggressive Cache-Busting**: Version 2.0.0 with timestamp (20260421)
2. **Service Worker**: Custom cache control that prioritizes network for critical files
3. **Meta Tags**: Comprehensive cache control headers
4. **Dynamic URLs**: All resources now include version parameters

### Files Modified:
- `index.html` - Updated with cache-busting meta tags and service worker
- `sw.js` - New service worker for cache management
- `style.css` - Referenced with version parameter
- `script.js` - Referenced with version parameter

## Deployment Steps

### 1. Push Changes to GitHub
```bash
git add .
git commit -m "Implement aggressive cache-busting v2.0.0"
git push origin main
```

### 2. Verify GitHub Pages Settings
1. Go to your GitHub repository
2. Click **Settings** tab
3. Scroll to **Pages** section
4. Ensure:
   - Source: **Deploy from a branch**
   - Branch: **main** (or your default branch)
   - Folder: **/ (root)**
   - **Force HTTPS** is enabled

### 3. Clear Browser Cache
After deployment, users should:
1. **Hard Refresh**: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
2. **Clear Cache**: Chrome DevTools > Network tab > Right-click > Clear browser cache
3. **Incognito Mode**: Test in private browsing window

### 4. Verify Deployment
Check that new features are working:
- Calendar dates show **Summary Tab** (not Entry Tab)
- **Date Button** appears below Monthly Progress Chart
- Date button shows today's date dynamically
- All 5 sections appear in Summary Tab

## Cache-Busting Strategy

### Version System
- **Current Version**: 2.0.0
- **Timestamp**: 20260421 (YYYYMMDD format)
- **URL Pattern**: `file.ext?v=2.0.0&t=20260421`

### Service Worker Behavior
- **HTML/JS/CSS**: Always tries network first, then cache
- **External Libraries**: Cached but updated when available
- **Images**: Cached for offline performance
- **Auto-cleanup**: Removes old cache versions automatically

### Future Updates
When making changes:
1. Update version number (e.g., 2.0.1, 2.1.0)
2. Update timestamp (current date)
3. Update `CACHE_NAME` in `sw.js`
4. Commit and push changes

## Troubleshooting

### If Updates Still Don't Appear:
1. **Check Network Tab**: Look for 304 (Not Modified) responses
2. **Disable Cache**: In Chrome DevTools Network tab, check "Disable cache"
3. **Clear Service Workers**: Chrome DevTools > Application > Service Workers > Unregister
4. **Wait for Propagation**: GitHub Pages can take up to 10 minutes to update

### Force Update Commands:
```javascript
// In browser console to force refresh
location.reload(true);
```

### Service Worker Debugging:
```javascript
// Check registered service workers
navigator.serviceWorker.getRegistrations().then(console.log);
```

## Deployment Checklist

- [ ] All changes committed to main branch
- [ ] GitHub Pages enabled and configured
- [ ] Version numbers updated in HTML
- [ ] Service worker registered correctly
- [ ] Cache-busting URLs working
- [ ] New UI features functional
- [ ] Browser cache cleared for testing
- [ ] Multiple browsers tested (Chrome, Firefox, Safari)

## Technical Details

### Cache-Control Headers
```
Cache-Control: no-cache, no-store, must-revalidate, max-age=0
Pragma: no-cache
Expires: 0
```

### Service Worker Cache Strategy
- **Network First**: For HTML, CSS, JS files
- **Cache First**: For external libraries and images
- **Stale-While-Revalidate**: Balanced approach for performance

### Version Management
- **Major Version**: Breaking changes (2.0.0)
- **Minor Version**: New features (2.1.0)  
- **Patch Version**: Bug fixes (2.0.1)
- **Timestamp**: YYYYMMDD format for daily builds

This comprehensive cache-busting implementation should resolve deployment issues and ensure users always receive the latest version of the Wisdom Walker application.
