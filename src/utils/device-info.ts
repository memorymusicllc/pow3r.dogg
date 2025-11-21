/**
 * Device Information Extraction Utilities
 * 
 * Extracts device information from user agents and request headers
 */

export interface DeviceInfo {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  os: string;
  browser: string;
  deviceFingerprint?: string;
}

/**
 * Extract device information from user agent
 */
export function extractDeviceInfo(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();
  
  // Detect device type
  let deviceType: DeviceInfo['deviceType'] = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/bot|crawler|spider|scraper/i.test(ua)) {
    deviceType = 'bot';
  }

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('windows')) {
    if (ua.includes('windows nt 10.0')) os = 'Windows 10/11';
    else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
    else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
    else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
    else os = 'Windows';
  } else if (ua.includes('mac os x') || ua.includes('macintosh')) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    const match = ua.match(/android\s([0-9\.]*)/);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    const match = ua.match(/os\s([0-9_]*)/);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  }

  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) {
    const match = ua.match(/chrome\/([0-9\.]*)/);
    browser = match ? `Chrome ${match[1]}` : 'Chrome';
  } else if (ua.includes('firefox')) {
    const match = ua.match(/firefox\/([0-9\.]*)/);
    browser = match ? `Firefox ${match[1]}` : 'Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    const match = ua.match(/version\/([0-9\.]*)/);
    browser = match ? `Safari ${match[1]}` : 'Safari';
  } else if (ua.includes('edg')) {
    const match = ua.match(/edg\/([0-9\.]*)/);
    browser = match ? `Edge ${match[1]}` : 'Edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  }

  // Generate simple device fingerprint hash
  const fingerprintData = `${deviceType}-${os}-${browser}`;
  const deviceFingerprint = hashString(fingerprintData);

  return {
    deviceType,
    os,
    browser,
    deviceFingerprint,
  };
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extract geolocation from Cloudflare headers
 */
export interface GeolocationInfo {
  country?: string;
  city?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
}

export function extractGeolocation(headers: Headers): GeolocationInfo {
  return {
    country: headers.get('CF-IPCountry') || undefined,
    city: headers.get('CF-IPCity') || undefined,
    region: headers.get('CF-Region') || undefined,
    latitude: headers.get('CF-IPLatitude') || undefined,
    longitude: headers.get('CF-IPLongitude') || undefined,
    timezone: headers.get('CF-IPTimezone') || undefined,
  };
}

