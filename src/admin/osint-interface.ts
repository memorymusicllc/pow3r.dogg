/**
 * Deep OSINT Lookup Interface
 * 
 * Full identity unmasking with knowledge graph integration
 */

import type { Env } from '../types';
import { OSINTUnmasker } from '../osint/unmask';
import { AttackerDatabase } from './attacker-db';

export interface OSINTLookupResult {
  identifier: string;
  type: 'email' | 'phone' | 'domain' | 'ip' | 'username';
  identityGraph: {
    emailAddresses: string[];
    phoneNumbers: Array<{ number: string; type: string; carrier?: string }>;
    names: Array<{ name: string; confidence: number }>;
    addresses: Array<{ address: string; city?: string; state?: string; country?: string }>;
    socialProfiles: Array<{ platform: string; username: string; url: string }>;
    domains: string[];
    ipAddresses: string[];
    criminalRecords: Array<{ type: string; date?: string; location?: string }>;
    linkedIn?: {
      profile: string;
      company?: string;
      title?: string;
    };
    alternates: string[];
  };
  confidence: number;
  riskScore: number;
  relatedAttackers: string[];
  knowledgeGraph: {
    nodes: Array<{
      id: string;
      type: 'person' | 'email' | 'phone' | 'address' | 'domain' | 'ip' | 'social';
      label: string;
      properties: Record<string, unknown>;
    }>;
    edges: Array<{
      source: string;
      target: string;
      relationship: string;
      confidence: number;
    }>;
  };
}

export class OSINTInterface {
  private env: Env;
  private unmasker: OSINTUnmasker;
  private attackerDb: AttackerDatabase;

  constructor(env: Env) {
    this.env = env;
    this.unmasker = new OSINTUnmasker(env);
    this.attackerDb = new AttackerDatabase(env);
  }

  /**
   * Perform deep OSINT lookup
   */
  async deepLookup(identifier: string, uploadData?: Record<string, unknown>): Promise<OSINTLookupResult> {
    // Determine identifier type
    let type: OSINTLookupResult['type'] = 'email';
    if (identifier.includes('@')) {
      type = 'email';
    } else if (/^\+?[0-9-]+$/.test(identifier)) {
      type = 'phone';
    } else if (/^[0-9.]+$/.test(identifier)) {
      type = 'ip';
    } else if (identifier.includes('.')) {
      type = 'domain';
    } else {
      type = 'username';
    }

    // Perform OSINT unmasking
    let identityGraph: OSINTLookupResult['identityGraph'] = {
      emailAddresses: [],
      phoneNumbers: [],
      names: [],
      addresses: [],
      socialProfiles: [],
      domains: [],
      ipAddresses: [],
      criminalRecords: [],
      alternates: [],
    };
    let confidence = 0.5;
    let riskScore = 0.5;

    try {
      if (type === 'email') {
        const result = await this.unmasker.unmaskIdentity({ email: identifier });
        // Map UnmaskResult to identityGraph
        identityGraph.emailAddresses = [identifier, ...(result.identityGraph.emailAddresses || [])];
        identityGraph.phoneNumbers = result.identityGraph.phoneNumbers || [];
        identityGraph.socialProfiles = Object.entries(result.identityGraph.socialMedia || {}).map(([platform, username]) => ({
          platform,
          username: (username || '') as string,
          url: `https://${platform}.com/${username || ''}`,
        }));
        identityGraph.domains = result.identityGraph.domainsOwned || [];
        identityGraph.alternates = [...(result.identityGraph.aliases || []), ...(identityGraph.alternates || [])];
        identityGraph.addresses = (result.identityGraph.locations || []).map((loc: { location: string }) => ({ address: loc.location }));
        confidence = result.confidence ?? 0.5;
        riskScore = result.riskIndicators ? 0.5 : 0.5; // Would calculate from risk indicators
      } else if (type === 'phone') {
        const result = await this.unmasker.unmaskIdentity({ phone: identifier });
        identityGraph.phoneNumbers = [{ number: identifier, type: result.identityGraph.phoneNumbers?.[0]?.type || 'mobile', carrier: result.identityGraph.phoneNumbers?.[0]?.carrier }];
        identityGraph.emailAddresses = [];
        identityGraph.domains = [];
        confidence = 0.6;
        riskScore = 0.5;
      } else if (type === 'domain') {
        const result = await this.unmasker.unmaskIdentity({ domain: identifier });
        identityGraph.domains = [identifier, ...(result.identityGraph.domainsOwned || [])];
        identityGraph.emailAddresses = [];
        identityGraph.phoneNumbers = [];
        confidence = 0.6;
        riskScore = 0.5;
      }
    } catch (error) {
      console.error('OSINT lookup failed:', error);
    }

    // Merge uploaded research data
    if (uploadData) {
      if (uploadData.emails && Array.isArray(uploadData.emails)) {
        identityGraph.emailAddresses.push(...uploadData.emails);
      }
      if (uploadData.phones && Array.isArray(uploadData.phones)) {
        identityGraph.phoneNumbers.push(...uploadData.phones.map((p: string) => ({ number: p, type: 'unknown' })));
      }
      if (uploadData.names && Array.isArray(uploadData.names)) {
        identityGraph.names.push(...uploadData.names.map((n: string) => ({ name: n, confidence: 0.8 })));
      }
      if (uploadData.addresses && Array.isArray(uploadData.addresses)) {
        identityGraph.addresses.push(...uploadData.addresses.map((a: string) => ({ address: a })));
      }
      if (uploadData.socials && Array.isArray(uploadData.socials)) {
        identityGraph.socialProfiles.push(...uploadData.socials);
      }
    }

    // Find related attackers
    const relatedAttackers: string[] = [];
    if (type === 'email') {
      const attackers = await this.attackerDb.queryAttackers({ limit: 1000 });
      for (const attacker of attackers) {
        const email = attacker.metadata?.email as string | undefined;
        const emails = attacker.metadata?.emailAddresses as string[] | undefined;
        if (email === identifier || (emails && Array.isArray(emails) && emails.includes(identifier))) {
          relatedAttackers.push(attacker.id);
        }
      }
    } else if (type === 'phone') {
      const attackers = await this.attackerDb.queryAttackers({ phoneNumber: identifier });
      relatedAttackers.push(...attackers.map(a => a.id));
    } else if (type === 'ip') {
      const attackers = await this.attackerDb.queryAttackers({ ipAddress: identifier });
      relatedAttackers.push(...attackers.map(a => a.id));
    }

    // Build knowledge graph
    const knowledgeGraph = this.buildKnowledgeGraph(identifier, type, identityGraph, uploadData);

    return {
      identifier,
      type,
      identityGraph,
      confidence,
      riskScore,
      relatedAttackers,
      knowledgeGraph,
    };
  }

  /**
   * Build knowledge graph from identity data
   */
  private buildKnowledgeGraph(
    identifier: string,
    type: OSINTLookupResult['type'],
    identityGraph: OSINTLookupResult['identityGraph'],
    uploadData?: Record<string, unknown>
  ): OSINTLookupResult['knowledgeGraph'] {
    const nodes: OSINTLookupResult['knowledgeGraph']['nodes'] = [];
    const edges: OSINTLookupResult['knowledgeGraph']['edges'] = [];

    // Add root node
    const rootId = `root-${identifier}`;
    nodes.push({
      id: rootId,
      type: type === 'email' ? 'email' : type === 'phone' ? 'phone' : 'domain',
      label: identifier,
      properties: { type, confidence: 1.0 },
    });

    // Add email nodes
    for (const email of identityGraph.emailAddresses) {
      const emailId = `email-${email}`;
      if (!nodes.find(n => n.id === emailId)) {
        nodes.push({
          id: emailId,
          type: 'email',
          label: email,
          properties: {},
        });
        edges.push({
          source: rootId,
          target: emailId,
          relationship: 'associated_email',
          confidence: 0.8,
        });
      }
    }

    // Add phone nodes
    for (const phone of identityGraph.phoneNumbers) {
      const phoneId = `phone-${phone.number}`;
      if (!nodes.find(n => n.id === phoneId)) {
        nodes.push({
          id: phoneId,
          type: 'phone',
          label: phone.number,
          properties: { carrier: phone.carrier, type: phone.type },
        });
        edges.push({
          source: rootId,
          target: phoneId,
          relationship: 'associated_phone',
          confidence: 0.8,
        });
      }
    }

    // Add name/person nodes
    for (const name of identityGraph.names) {
      const personId = `person-${name.name}`;
      if (!nodes.find(n => n.id === personId)) {
        nodes.push({
          id: personId,
          type: 'person',
          label: name.name,
          properties: { confidence: name.confidence },
        });
        edges.push({
          source: rootId,
          target: personId,
          relationship: 'identified_as',
          confidence: name.confidence,
        });
      }
    }

    // Add address nodes
    for (const address of identityGraph.addresses) {
      const addrId = `addr-${address.address}`;
      if (!nodes.find(n => n.id === addrId)) {
        nodes.push({
          id: addrId,
          type: 'address',
          label: address.address,
          properties: { city: address.city, state: address.state, country: address.country },
        });
        edges.push({
          source: rootId,
          target: addrId,
          relationship: 'located_at',
          confidence: 0.7,
        });
      }
    }

    // Add social profile nodes
    for (const social of identityGraph.socialProfiles) {
      const socialId = `social-${social.platform}-${social.username}`;
      if (!nodes.find(n => n.id === socialId)) {
        nodes.push({
          id: socialId,
          type: 'social',
          label: `${social.platform}: ${social.username}`,
          properties: { platform: social.platform, url: social.url },
        });
        edges.push({
          source: rootId,
          target: socialId,
          relationship: 'has_profile',
          confidence: 0.9,
        });
      }
    }

    // Add domain nodes
    for (const domain of identityGraph.domains) {
      const domainId = `domain-${domain}`;
      if (!nodes.find(n => n.id === domainId)) {
        nodes.push({
          id: domainId,
          type: 'domain',
          label: domain,
          properties: {},
        });
        edges.push({
          source: rootId,
          target: domainId,
          relationship: 'owns_domain',
          confidence: 0.6,
        });
      }
    }

    // Add IP nodes
    for (const ip of identityGraph.ipAddresses) {
      const ipId = `ip-${ip}`;
      if (!nodes.find(n => n.id === ipId)) {
        nodes.push({
          id: ipId,
          type: 'ip',
          label: ip,
          properties: {},
        });
        edges.push({
          source: rootId,
          target: ipId,
          relationship: 'uses_ip',
          confidence: 0.7,
        });
      }
    }

    // Add connections between related entities
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        if (node1.type === node2.type && node1.type === 'email') {
          // Emails from same domain
          const domain1 = node1.label.split('@')[1];
          const domain2 = node2.label.split('@')[1];
          if (domain1 === domain2) {
            edges.push({
              source: node1.id,
              target: node2.id,
              relationship: 'same_domain',
              confidence: 0.8,
            });
          }
        }
      }
    }

    return { nodes, edges };
  }
}

