/**
 * Cron Trigger: Update FireHOL Blocklists
 * 
 * Runs daily to download and update FireHOL blocklists in Workers KV
 */

import type { Env } from '../types';

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Updating FireHOL blocklists...');

    try {
      // Download FireHOL blocklists
      const blocklists = [
        'firehol_level1',
        'firehol_level2',
        'firehol_level3',
        'firehol_level4',
      ];

      for (const listName of blocklists) {
        const url = `https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/${listName}.netset`;
        
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to download ${listName}: ${response.statusText}`);
          continue;
        }

        const text = await response.text();
        const ips = text
          .split('\n')
          .filter((line) => /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/.test(line.trim()))
          .map((line) => line.trim());

        // Store in KV
        if (env.DEFENDER_FORGE) {
          await env.DEFENDER_FORGE.put(
            `blocklist:${listName}`,
            JSON.stringify(ips),
            { expirationTtl: 86400 * 2 } // 2 days expiration
          );
          console.log(`Updated ${listName}: ${ips.length} IPs`);
        }
      }

      // Update metadata
      if (env.DEFENDER_FORGE) {
        await env.DEFENDER_FORGE.put(
          'blocklist:lastUpdated',
          new Date().toISOString(),
          { expirationTtl: 86400 * 2 }
        );
      }

      console.log('FireHOL blocklists updated successfully');
    } catch (error) {
      console.error('Error updating FireHOL blocklists:', error);
    }
  },
};

