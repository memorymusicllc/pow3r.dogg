# Pow3r Defender Dashboard

**Access URL:** https://pow3r-defender-production.contact-7d8.workers.dev/dashboard

## Features

### 📊 Dashboard
- System status monitoring
- Quick action buttons
- Active trackers and monitored attackers count

### 🔗 Tracking Links
- **Create Honeypot Redirect Links**
  - Generate obfuscated tracking redirects
  - Add intermediate domains for multi-hop tracking
  - Custom tracking IDs or auto-generated
  - Copy tracking URLs with one click

### 👤 Attacker Management
- **Add Attacker Information**
  - Device fingerprint
  - IP address
  - Phone number
  - User agent
  - Additional metadata (JSON)
- **View Monitored Attackers**
  - List of all tracked attackers
  - Query by fingerprint, IP, or phone

### 📋 Investigations
- View active investigations
- Case management
- Evidence tracking

## Usage

### Creating a Tracking Link

1. Navigate to **Tracking** tab
2. Enter the final destination URL
3. (Optional) Add intermediate domains for multi-hop tracking
4. (Optional) Specify a custom tracking ID
5. Click **Generate Tracking Link**
6. Copy the generated redirect URL

### Adding Attacker Information

1. Navigate to **Attackers** tab
2. Fill in available information:
   - Fingerprint (device identifier)
   - IP Address
   - Phone Number
   - User Agent
   - Additional Metadata (JSON format)
3. Click **Add Attacker**
4. The system will store the information and begin monitoring

### Authentication

The dashboard requires Pow3r Pass authentication for API calls. Set your token:

```javascript
localStorage.setItem('pow3r_auth_token', 'your-token-here');
```

## Design

- **Mobile-First:** Optimized for phones, tablets, and desktops
- **Dark Mode:** True black theme (#0a0a0a)
- **Bottom Navigation:** Fixed bottom nav on mobile, left sidebar on desktop
- **Card Layout:** Max width 520px on desktop, full width on mobile
- **Responsive:** Adapts to all screen sizes

## API Integration

The dashboard calls the following MCP tools:

- `defender_generate_tracking_redirect` - Create tracking links
- `defender_ingest_beacon` - Add attacker information
- `defender_query_attacker` - Query attacker data (future)

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers

---

**Dashboard Status:** ✅ **LIVE AND OPERATIONAL**

