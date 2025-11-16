/**
 * Cron Trigger: Update VPN IP Lists
 * 
 * Runs daily to download and update VPN IP lists from X4BNet
 */

import type { Env } from '../types';

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Updating VPN IP lists...');

    try {
      // Download X4BNet VPN lists
      const vpnLists = [
        {
          name: 'vpn-ipv4',
          url: 'https://raw.githubusercontent.com/X4BNet/lists_vpn/main/vpn-ipv4.txt',
        },
        {
          name: 'datacenter-ipv4',
          url: 'https://raw.githubusercontent.com/X4BNet/lists_vpn/main/datacenter-ipv4.txt',
        },
      ];

      let totalIPs = 0;

      for (const list of vpnLists) {
        const response = await fetch(list.url);
        if (!response.ok) {
          console.error(`Failed to download ${list.name}: ${response.statusText}`);
          continue;
        }

        const text = await response.text();
        const ips = text
          .split('\n')
          .filter((line) => /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(line.trim()))
          .map((line) => line.trim());

        // Store in KV (individual IPs for fast lookup)
        if (env.DEFENDER_FORGE) {
          // Store as a set for fast lookup
          const ipSet = new Set(ips);
          
          // Store individual IPs
          for (const ip of ipSet) {
            await env.DEFENDER_FORGE.put(`vpn:${ip}`, 'true', {
              expirationTtl: 86400 * 2, // 2 days
            });
          }

          // Also store as a combined list
          await env.DEFENDER_FORGE.put(
            `vpn:list:${list.name}`,
            JSON.stringify(Array.from(ipSet)),
            { expirationTtl: 86400 * 2 }
          );

          totalIPs += ipSet.size;
          console.log(`Updated ${list.name}: ${ipSet.size} IPs`);
        }
      }

      // Update metadata
      if (env.DEFENDER_FORGE) {
        await env.DEFENDER_FORGE.put(
          'vpn:metadata',
          JSON.stringify({
            lastUpdated: new Date().toISOString(),
            totalIPs,
            sources: ['X4BNet/lists_vpn'],
          }),
          { expirationTtl: 86400 * 2 }
        );
      }

      console.log(`VPN IP lists updated successfully: ${totalIPs} total IPs`);
    } catch (error) {
      console.error('Error updating VPN IP lists:', error);
    }
  },
};

