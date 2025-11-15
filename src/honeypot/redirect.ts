/**
 * Tracking Redirect Generation
 * 
 * Generates obfuscated redirect chains with tracking
 */

import type { Env } from '../types';
import { CovertTracker } from './tracking';

export interface TrackingRedirect {
  redirectId: string;
  finalUrl: string;
  redirectChain: {
    hops: Array<{ url: string; status: number; timestamp: number }>;
    finalUrl: string;
    obfuscated: boolean;
  };
  trackingId: string;
  trackingScript: string;
}

export class TrackingRedirectGenerator {
  private env: Env;
  private tracker: CovertTracker;

  constructor(env: Env) {
    this.env = env;
    this.tracker = new CovertTracker();
  }

  /**
   * Generate tracking redirect
   */
  async generate(
    finalUrl: string,
    intermediateDomains: string[] = [],
    trackingId?: string
  ): Promise<TrackingRedirect> {
    const redirectId = crypto.randomUUID();
    const finalTrackingId = trackingId || crypto.randomUUID();
    this.tracker = new CovertTracker(finalTrackingId);

    // Create redirect chain
    const redirectChain = await this.tracker.createRedirectChain(
      finalUrl,
      intermediateDomains
    );

    // Generate tracking script
    const trackingScript = this.tracker.generateTrackingScript();

    return {
      redirectId,
      finalUrl,
      redirectChain,
      trackingId: finalTrackingId,
      trackingScript,
    };
  }

  /**
   * Generate redirect URL with tracking parameters
   */
  generateRedirectURL(
    redirect: TrackingRedirect,
    additionalParams?: Record<string, string>
  ): string {
    const firstHop = redirect.redirectChain.hops[0];
    if (!firstHop) {
      return redirect.finalUrl;
    }

    const url = new URL(firstHop.url);
    
    // Add tracking parameters
    url.searchParams.set('tracking_id', redirect.trackingId);
    url.searchParams.set('redirect_id', redirect.redirectId);
    url.searchParams.set('t', Date.now().toString());

    // Add additional parameters
    if (additionalParams) {
      for (const [key, value] of Object.entries(additionalParams)) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  /**
   * Generate HTML redirect page
   */
  generateRedirectHTML(redirect: TrackingRedirect): string {
    const redirectUrl = this.generateRedirectURL(redirect);
    const trackingScript = redirect.trackingScript;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting...</p>
  <script>
    ${trackingScript}
    window.location.href = "${redirectUrl}";
  </script>
</body>
</html>`;
  }

  /**
   * Generate JavaScript redirect
   */
  generateRedirectJS(redirect: TrackingRedirect): string {
    const redirectUrl = this.generateRedirectURL(redirect);
    const trackingScript = redirect.trackingScript;

    return `${trackingScript}
(function() {
  window.location.href = "${redirectUrl}";
})();`;
  }
}

