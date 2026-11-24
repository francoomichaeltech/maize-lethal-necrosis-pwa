# M-Skana: On-Device Maize Disease Detection PWA

**Version:** 1.0.0  
**Status:** Production Release  
**License:** © 2026 M-Skana. All rights reserved.

---

## Overview

M-Skana is a **progressive web application (PWA)** that enables smallholder farmers across Tanzania to detect Maize Lethal Necrosis (MLN) disease from maize leaf photographs using on-device artificial intelligence. The entire inference pipeline runs locally in the browser-no cloud upload, no server-side processing, no mandatory account.

### Key Design Principles

- **Privacy-First**: All data remains on-device. No cloud transmission required.
- **Offline-Enabled**: Works completely offline after initial asset caching.
- **Mobile-Optimized**: Touch-friendly interface designed for field use.
- **Bilingual**: Full Kiswahili and English language support with runtime switching.
- **Backend-Free**: Static hosting only; no backend server required.

---

## Table of Contents

1. [Core Capabilities](#core-capabilities)
2. [How It Works](#how-it-works)
3. [Technical Architecture](#technical-architecture)
4. [Repository Structure](#repository-structure)
5. [Development Setup](#development-setup)
6. [Deployment Guide](#deployment-guide)
7. [PWA & Caching Strategy](#pwa--caching-strategy)
8. [Data Storage & Privacy](#data-storage--privacy)
9. [Testing Checklist](#testing-checklist)
10. [Troubleshooting](#troubleshooting)
11. [Team & Contact](#team--contact)

---

## Core Capabilities

### AI-Powered Disease Detection
- **Two-stage inference pipeline** running on TensorFlow.js:
  - **Stage 1:** Validates whether the captured image is a maize leaf
  - **Stage 2:** Classifies the leaf into disease outcome categories (MLN, Healthy, Other Disease, Not Maize)
- Displays confidence scores and actionable results

### User Features
- **Camera Capture:** Direct image capture from device camera (HTTPS required)
- **Gallery Upload:** Select pre-existing images from device storage
- **Local History:** Persistent scan history stored in browser localStorage
- **Language Switching:** Toggle between Kiswahili and English at runtime
- **PWA Installation:** Install as standalone app on Android, iOS, and desktop (OS support permitting)
- **Offline Fallback:** Core functionality remains accessible without internet after first successful load

---

## How It Works

### User Flow

1. **Image Input**: User captures a photo or selects an existing image from gallery
2. **Preprocessing**: Input image is normalized to model input dimensions (224×224) and pixel values standardized
3. **Stage 1 Validation**: Model confirms the image contains a maize leaf
4. **Stage 2 Classification**: If validated, the leaf is classified into disease category
5. **Result Display**: Confidence score, verdict, and remediation suggestions are shown
6. **Persistence**: Scan record is saved to localStorage for history

### Model Execution

- **Runtime**: TensorFlow.js with automatic backend fallback (WebGL -> WASM -> CPU)
- **Model Format**: GraphModel (.json + .bin shards)
- **Backend Selection**: Automatically selects best available backend (WebGL > WASM > CPU)
- **Fallback Behavior**: If models cannot load, app displays graceful fallback UI

---

## Technical Architecture

### Frontend Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Markup** | Semantic HTML5 | Accessibility, SEO, structure |
| **Styling** | CSS3 (Token-based Design System) | Responsive, maintainable, component-scoped |
| **Logic** | Vanilla JavaScript (ES6+) | No framework overhead; direct DOM manipulation |
| **Offline** | Service Worker | Cache management, network interception |
| **AI** | TensorFlow.js | In-browser model inference |

### Directory Structure

```
mskana_pwa/
├── index.html                    # Landing page & feature showcase
├── scan.html                     # Image capture & upload interface
├── camera.html                   # Dedicated camera stream handler
├── results.html                  # Inference result display
├── history.html                  # Scan history & filtering
├── history-detail.html           # Individual scan record view
├── guide.html                    # MLN disease info & prevention tips
├── about.html                    # Project mission, team, links
├── feedback.html                 # User feedback form
├── support.html                  # Support & help center
│
├── manifest.json                 # PWA metadata & installability
├── service-worker.js             # Cache strategy & offline logic
├── tf.min.js                     # TensorFlow.js library
│
├── legal/
│   ├── privacy.html              # Privacy policy
│   └── terms.html                # Terms of use
│
├── models/                       # AI model files (TensorFlow.js format)
│   ├── stage1/model1_tfjs/
│   │   ├── model.json
│   │   ├── group1-shard1of2.bin
│   │   └── group1-shard2of2.bin
│   └── stage2/model2_tfjs/
│       ├── model.json
│       ├── group1-shard1of2.bin
│       └── group1-shard2of2.bin
│
└── assets/
    ├── css/
    │   ├── reset.css             # CSS reset
    │   ├── base.css              # Global typography & spacing
    │   ├── layout.css            # Grid & container layouts
    │   ├── tokens.css            # Design tokens (colors, fonts, sizes)
    │   ├── components/           # Reusable component styles
    │   │   ├── buttons.css
    │   │   ├── cards.css
    │   │   ├── forms.css
    │   │   ├── modal.css
    │   │   └── ...
    │   └── pages/                # Page-specific styles
    │       ├── home.css
    │       ├── scan.css
    │       ├── results.css
    │       └── ...
    ├── js/
    │   ├── ai/                   # AI pipeline modules
    │   │   ├── classifier.js     # Inference orchestration
    │   │   ├── model-loader.js   # Model fetching & initialization
    │   │   └── preprocessor.js   # Image preprocessing
    │   ├── core/                 # Core application logic
    │   │   ├── app.js            # App initialization
    │   │   ├── events.js         # Global event handling
    │   │   └── storage.js        # localStorage abstraction
    │   ├── modules/              # Reusable feature modules
    │   │   ├── language.js       # Kiswahili/English switching
    │   │   ├── modal.js          # Modal dialog management
    │   │   ├── nav.js            # Navigation logic
   │   │   ├── pwa.js            # PWA install prompts
   │   │   └── terms-guard.js    # Terms acceptance guard
    │   └── pages/                # Page-specific logic
    │       ├── scan.js
    │       ├── results.js
    │       ├── history.js
    │       └── ...
    ├── fonts/
    │   └── material-icons.css    # Material Design Icons
    └── images/
        └── icons/                # App icons (Android, iOS)
```

### State Management

**localStorage**
- `mskana_language`: Current language preference (sw/en)
- `mskana_scan_history`: Array of scan records with metadata
- `mskana_terms_accepted`: Terms acceptance state
- `mskana_install_dismissed`: Install prompt dismissal state
- `mskana_feedback`: Optional user feedback entries

**sessionStorage**
- `mskana_scan_image`: Temporary image data between pages
- `mskana_scan_result`: Current inference result

### Caching Strategy

**Service Worker Cache Buckets**

| Cache | Strategy | Purpose |
|-------|----------|---------|
| `mskana-v1.0.0-shell` | Cache-First | HTML shells, CSS, JS bundles |
| `mskana-v1.0.0-assets` | Cache-First | Icons, fonts, images |
| `mskana-v1.0.0-models` | Cache-First | TensorFlow.js model files |

**Network Request Flow**

```
User Request
    ↓
Service Worker Intercept
    ├─ caches.match() → Found? → Return cached
    ├─ Not found → fetch from network
    │   ├─ Success → cache + return
    │   └─ Failure
    │       ├─ Navigation req? → fallback to offline.html
    │       └─ Asset req? → return error response
```

---

## Development Setup

### Prerequisites

- Modern browser (Chrome, Firefox, Safari, Edge) with ES6+ support
- HTTPS or localhost for camera/PWA features
- Static file server (Python, Node, VS Code Live Server, etc.)

### Option A: VS Code Live Server (Recommended)

```bash
# 1. Open folder in VS Code
code mskana_pwa

# 2. Right-click index.html → "Open with Live Server"
# 3. Browser opens at http://localhost:5500
```

### Option B: Python (Built-in)

```bash
cd mskana_pwa
python -m http.server 8080
# Access at http://localhost:8080
```

### Option C: Node.js

```bash
cd mskana_pwa
npx serve .
# Access at http://localhost:3000
```

### Option D: Docker

```bash
cd mskana_pwa
docker run -p 8080:80 -v "$(pwd):/usr/share/nginx/html" nginx:latest
# Access at http://localhost:8080
```

---

## Deployment Guide

### Pre-Deployment Checklist

- [ ] All model files present in `models/stage1` and `models/stage2`
- [ ] Service Worker version updated (if assets changed)
- [ ] index.html CSS cache-buster version updated
- [ ] PWA manifest.json fields accurate
- [ ] HTTPS enabled on hosting domain
- [ ] Legal pages (privacy.html, terms.html) deployed
- [ ] Offline.html included in deployment

### Hosting Options

**Recommended Providers** (all support static PWA deployment):
- **Vercel**: Automatic deployments from Git, HTTPS by default
- **Netlify**: Built-in PWA support, environment variables, redirects
- **Firebase Hosting**: Google-backed reliability, generous free tier
- **GitHub Pages**: Free static hosting (branch-based)
- **Custom VPS**: Full control, bring your own SSL certificate

### Deployment Steps (Generic)

1. **Build Phase** (if needed): This project requires no build. Copy all files as-is.

2. **Upload All Files** to hosting:
   ```
   ✓ index.html, scan.html, about.html, guide.html, ...
   ✓ Full models/ directory with all .json and .bin files
   ✓ Full assets/ directory structure
   ✓ manifest.json, service-worker.js, offline.html
   ```

3. **Configure MIME Types** (if custom server):
   ```
   .json → application/json
   .bin → application/octet-stream
   .js → application/javascript
   .wasm → application/wasm (if WASM backend used)
   ```

4. **SSL/TLS**: Ensure HTTPS is enforced
   ```
   Redirect http:// → https://
   Enable HSTS headers (Strict-Transport-Security)
   ```

5. **Service Worker Scope**: Keep `service-worker.js` at domain root (`/service-worker.js`)

6. **Test Post-Deployment**:
   - [ ] Home page loads
   - [ ] Can capture/upload image (HTTPS required for camera)
   - [ ] Inference runs and displays result
   - [ ] History persists across page reloads
   - [ ] Offline page appears when network unavailable
   - [ ] PWA install prompt appears (on supported devices)

---

## PWA & Caching Strategy

### Understanding Version Updates

Every time you modify CSS, JavaScript, or add/remove files, **increment the VERSION** in service-worker.js:

```javascript
// service-worker.js
const VERSION = 'mskana-v1.0.0';  // Current release version
```

Also update the cache-buster in index.html:

```html
<!-- index.html -->
<link rel="stylesheet" href="/assets/css/pages/home.css?v=1.0.0" />
<!-- Current release query version: ?v=1.0.0 -->
```

**Why This Matters**: Mobile users and installed PWA clients cache aggressively. Old versions remain on their devices until the Service Worker cache is invalidated by a version change.

### Offline Fallback Chain

If the user is offline and the requested asset is not cached:
1. Service Worker attempts `caches.match(request)`
2. If miss, attempts network fetch (will fail offline)
3. If navigation fetch fails → serves `/offline.html`
4. `/offline.html` shows "You're offline" UI with retry button

---

## Data Storage & Privacy

### Privacy-First Design

M-Skana **does not**:
- Require user account or login
- Upload images to cloud
- Collect telemetry by default
- Share data with third parties
- Use persistent tracking cookies

### Local Data

Data stored **only on user's device**:
- **Scan History**: Stored in localStorage as JSON array
- **Language Preference**: Stored in localStorage
- **Temporary Session Data**: Stored in sessionStorage, cleared on tab close

### Data Export & Deletion

Users can:
- Export their history (browser dev tools → Application → localStorage)
- Clear all data (browser settings → Clear Site Data)

For legal details:
- [Privacy Policy](legal/privacy.html)
- [Terms of Use](legal/terms.html)

---

## Testing Checklist

### Functional Testing

- **Home Page**
  - [ ] Hero section displays correctly
  - [ ] Features section renders all cards
  - [ ] CTA buttons are clickable
  - [ ] Mobile layout is responsive

- **Scan Flow**
  - [ ] Can access camera input (HTTPS on mobile)
  - [ ] Can select from gallery
  - [ ] Image preview displays
  - [ ] Inference runs without errors

- **Results Display**
  - [ ] Confidence score displays correctly
  - [ ] Verdict (MLN/Healthy/Other/Invalid) is clear
  - [ ] Actionable tips appear based on verdict
  - [ ] Result is saved to history

- **History Page**
  - [ ] All past scans display
  - [ ] Filter buttons work (All/MLN/Healthy/Other)
  - [ ] Empty state shows when no history
  - [ ] Delete functionality works

- **Bilingual Support**
  - [ ] Language toggle switches UI between Kiswahili/English
  - [ ] Language preference persists across reloads
  - [ ] All UI text is present in both languages

### PWA & Offline Testing

- **Installation**
  - [ ] Install prompt appears on mobile browser
  - [ ] App installs and launches from home screen
  - [ ] Standalone app mode (no browser chrome)

- **Offline Behavior**
  - [ ] After first load, disable network (DevTools)
  - [ ] Pages still load from cache
  - [ ] Scan history still accessible
  - [ ] Unavailable assets show graceful fallback

- **Service Worker**
  - [ ] Check DevTools → Application → Service Workers
  - [ ] SW shows "activated and running"
  - [ ] After version bump: SW shows "waiting to activate"
  - [ ] Hard refresh (Ctrl+Shift+R) prompts SW update

### Performance

- **Lighthouse Audit** (Chrome DevTools):
  - [ ] Performance: > 90
  - [ ] Accessibility: > 90
  - [ ] Best Practices: > 90
  - [ ] PWA: 100 or all PWA checks pass
  - [ ] SEO: > 90

### Device/Browser Coverage

- [ ] Chrome/Edge on Windows/Mac
- [ ] Chrome/Firefox on Android
- [ ] Safari on iOS (iOS 14+)
- [ ] Desktop browsers (responsive view)
- [ ] Mobile phones (actual devices)

---

## Troubleshooting

### Models Not Loading

**Symptoms**: Image upload fails, inference doesn't run, console shows fetch 404

**Solutions**:
1. Verify model files exist locally:
   ```bash
   ls models/stage1/model1_tfjs/
   # Should show: model.json, group1-shard1of2.bin, group1-shard2of2.bin
   ```

2. Check MIME types on server (verify `.bin` files served as `application/octet-stream`)

3. Inspect browser console (F12) for detailed fetch errors

4. Verify model.json paths reference shards correctly:
   ```json
   {
     "weightsManifest": [
       { "paths": ["group1-shard1of2.bin", "group1-shard2of2.bin"] }
     ]
   }
   ```

### Old CSS/JS Still Showing

**Symptoms**: CSS changes deployed but old styles still appear; feature flags not working

**Solutions**:
1. **Increment VERSION in service-worker.js:**
   ```javascript
   const VERSION = 'mskana-v1.0.0';
   ```

2. **Increment cache-buster in index.html:**
   ```html
   <link rel="stylesheet" href="/assets/css/pages/home.css?v=1.0.0" />
   ```

3. **Hard refresh (clear cache):**
   - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or: Open DevTools → Settings → Disable cache (while DevTools open)

4. **For installed PWA apps**: Close app completely and relaunch

### Camera Permission Denied

**Symptoms**: Camera capture button doesn't work, file picker doesn't open

**Solutions**:
1. Ensure **HTTPS** (not http://)
   - Localhost (http://localhost) is exception

2. Chrome: Check permission icon in address bar
   - Reset permissions: Settings → Privacy → Site Settings → Camera

3. Mobile: Check OS-level camera permission
   - iOS: Settings → M-Skana → Camera
   - Android: Settings → Apps → M-Skana → Permissions → Camera

4. Try different browser

### PWA Install Prompt Not Appearing

**Symptoms**: No "Install App" button/prompt on mobile

**Solutions**:
1. Verify HTTPS is enabled
2. Check manifest.json is valid:
   ```bash
   curl https://yoursite.com/manifest.json | jq .
   ```
3. Verify in DevTools → Application → Manifest (no errors)
4. Must visit site at least 30 seconds before prompt appears
5. Some browsers (Firefox mobile, older Safari) don't support PWA installation

### Offline Page Shows When Online

**Symptoms**: offline.html appears even when network available

**Solutions**:
1. Service Worker is serving cached fallback incorrectly
   - DevTools → Application → Cache Storage → Clear all
   - Hard refresh

2. Check service-worker.js fetch handler for bugs

3. Verify online status: Open DevTools console → `navigator.onLine` (should be `true`)

---

## Team & Contact

### Development Team

| Role | Name | Responsibility |
|------|------|-----------------|
| **Lead Developer** | Michael Francoo | AI pipeline, full-stack engineering |
| **UX/Design** | Rehema Thomas | Product design, user experience |
| **Advisor** | Nicodemus Sanga | Academic supervision |

### Institution

**Mbeya University of Science and Technology (MUST)**  
College of Information and Communication Technology (CoICT)  
Tanzania

### Contact

- **GitHub**: [francoomichaeltech](https://github.com/francoomichaeltech) | [rehemathomas](https://github.com/rehemathomas)
- **Supervisor Email**: sangan896@gmail.com

---

## License & Attribution

**© 2026 M-Skana Team**  
All rights reserved.

This is an academic project developed as a final-year capstone at Mbeya University of Science and Technology.

---

## Additional Resources

- [Progressive Web Apps (MDN)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [TensorFlow.js Documentation](https://js.tensorflow.org/)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Last Updated**: March 2026  
**Version**: 1.0.0 
