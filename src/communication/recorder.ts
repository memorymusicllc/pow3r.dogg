/**
 * Communication Recording System
 * 
 * Records all communications with hash-chained evidence storage
 */

import type { Env } from '../types';
import { EnhancedEvidenceChain } from '../forensic/chain';

export interface CommunicationRecord {
  id: string;
  channel: 'email' | 'sms' | 'telegram' | 'chat';
  senderIdentifier?: string;
  recipientIdentifier?: string;
  content: string;
  metadata: Record<string, unknown>;
  evidenceHash: string;
  recordedAt: number;
  investigationId?: string;
}

export interface RecordingMetadata {
  subject?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    hash: string;
  }>;
  threadId?: string;
  messageId?: string;
  inReplyTo?: string;
  headers?: Record<string, string>;
  [key: string]: unknown;
}

export class CommunicationRecorder {
  private env: Env;
  private evidenceChain: EnhancedEvidenceChain;

  constructor(env: Env) {
    this.env = env;
    this.evidenceChain = new EnhancedEvidenceChain(env);
  }

  /**
   * Record a communication
   */
  async record(
    channel: 'email' | 'sms' | 'telegram' | 'chat',
    content: string,
    options: {
      senderIdentifier?: string;
      recipientIdentifier?: string;
      metadata?: RecordingMetadata;
      investigationId?: string;
    } = {}
  ): Promise<CommunicationRecord> {
    const id = crypto.randomUUID();
    const recordedAt = Date.now();

    // Prepare metadata
    const metadata: RecordingMetadata = {
      channel,
      recordedAt,
      ...options.metadata,
    };

    // Create evidence artifact
    const evidenceContent = JSON.stringify({
      channel,
      content,
      senderIdentifier: options.senderIdentifier,
      recipientIdentifier: options.recipientIdentifier,
      metadata,
    });

    // Store as evidence with hash chain
    const contentBytes = new TextEncoder().encode(evidenceContent);
    const contentBuffer = new Uint8Array(contentBytes).buffer;
    const evidenceId = await this.evidenceChain.storeEvidence({
      type: `communication_${channel}`,
      content: contentBuffer,
      metadata: {
        communicationId: id,
        channel,
        senderIdentifier: options.senderIdentifier,
        recipientIdentifier: options.recipientIdentifier,
        ...metadata,
      },
      timestamp: new Date(recordedAt).toISOString(),
      collectedBy: 'communication_recorder',
    });

    // Get hash from evidence
    const evidenceHash = await this.calculateHash(evidenceContent);

    // Store record in D1 (with KV fallback)
    const record: CommunicationRecord = {
      id,
      channel,
      senderIdentifier: options.senderIdentifier,
      recipientIdentifier: options.recipientIdentifier,
      content,
      metadata,
      evidenceHash,
      recordedAt,
      investigationId: options.investigationId,
    };

    try {
      await this.env.DEFENDER_DB
        .prepare(
          'INSERT INTO communication_records (id, channel, sender_identifier, recipient_identifier, content, metadata, evidence_hash, recorded_at, investigation_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          id,
          channel,
          options.senderIdentifier || null,
          options.recipientIdentifier || null,
          content,
          JSON.stringify(metadata),
          evidenceHash,
          recordedAt,
          options.investigationId || null
        )
        .run();
    } catch (error) {
      // D1 unavailable - use KV fallback
      console.warn('D1 unavailable, using KV fallback for communication record:', error);
      await this.env.DEFENDER_FORGE.put(
        `communication:${id}`,
        JSON.stringify(record)
      );
    }

    return record;
  }

  /**
   * Retrieve a communication record
   */
  async get(id: string): Promise<CommunicationRecord | null> {
    try {
      const result = await this.env.DEFENDER_DB
        .prepare('SELECT * FROM communication_records WHERE id = ?')
        .bind(id)
        .first<{
          id: string;
          channel: string;
          sender_identifier: string | null;
          recipient_identifier: string | null;
          content: string;
          metadata: string;
          evidence_hash: string;
          recorded_at: number;
          investigation_id: string | null;
        }>();

      if (!result) {
        return null;
      }

      return {
        id: result.id,
        channel: result.channel as CommunicationRecord['channel'],
        senderIdentifier: result.sender_identifier || undefined,
        recipientIdentifier: result.recipient_identifier || undefined,
        content: result.content,
        metadata: JSON.parse(result.metadata) as Record<string, unknown>,
        evidenceHash: result.evidence_hash,
        recordedAt: result.recorded_at,
        investigationId: result.investigation_id || undefined,
      };
    } catch (error) {
      // Try KV fallback
      const data = await this.env.DEFENDER_FORGE.get(`communication:${id}`);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as CommunicationRecord;
    }
  }

  /**
   * Search communication records
   */
  async search(filters: {
    channel?: 'email' | 'sms' | 'telegram' | 'chat';
    senderIdentifier?: string;
    recipientIdentifier?: string;
    investigationId?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  }): Promise<CommunicationRecord[]> {
    const conditions: string[] = [];
    const bindings: unknown[] = [];

    if (filters.channel) {
      conditions.push('channel = ?');
      bindings.push(filters.channel);
    }
    if (filters.senderIdentifier) {
      conditions.push('sender_identifier = ?');
      bindings.push(filters.senderIdentifier);
    }
    if (filters.recipientIdentifier) {
      conditions.push('recipient_identifier = ?');
      bindings.push(filters.recipientIdentifier);
    }
    if (filters.investigationId) {
      conditions.push('investigation_id = ?');
      bindings.push(filters.investigationId);
    }
    if (filters.startDate) {
      conditions.push('recorded_at >= ?');
      bindings.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('recorded_at <= ?');
      bindings.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 100;

    try {
      const results = await this.env.DEFENDER_DB
        .prepare(`SELECT * FROM communication_records ${whereClause} ORDER BY recorded_at DESC LIMIT ?`)
        .bind(...bindings, limit)
        .all<{
          id: string;
          channel: string;
          sender_identifier: string | null;
          recipient_identifier: string | null;
          content: string;
          metadata: string;
          evidence_hash: string;
          recorded_at: number;
          investigation_id: string | null;
        }>();

      return results.results.map((result) => ({
        id: result.id,
        channel: result.channel as CommunicationRecord['channel'],
        senderIdentifier: result.sender_identifier || undefined,
        recipientIdentifier: result.recipient_identifier || undefined,
        content: result.content,
        metadata: JSON.parse(result.metadata) as Record<string, unknown>,
        evidenceHash: result.evidence_hash,
        recordedAt: result.recorded_at,
        investigationId: result.investigation_id || undefined,
      }));
    } catch (error) {
      console.warn('D1 unavailable for search, returning empty results:', error);
      return [];
    }
  }

  /**
   * Calculate hash of content
   */
  private async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

