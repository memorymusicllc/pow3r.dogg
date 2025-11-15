/**
 * File Upload Handler for Knowledge Graphs
 * 
 * Handles Markdown file uploads, parsing, and knowledge graph storage
 */

import type { Env } from '../types';

export interface FileUploadResult {
  fileId: string;
  fileName: string;
  filePath: string;
  parsedData: {
    entities: Array<{ type: string; name: string; properties: Record<string, unknown> }>;
    relationships: Array<{ source: string; target: string; type: string }>;
    facts: Array<{ subject: string; predicate: string; object: string }>;
  };
  uploadedAt: number;
  attackerId: string;
}

export class FileUploadHandler {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Parse Markdown file and extract structured data
   */
  private async parseMarkdown(content: string): Promise<FileUploadResult['parsedData']> {
    const entities: FileUploadResult['parsedData']['entities'] = [];
    const relationships: FileUploadResult['parsedData']['relationships'] = [];
    const facts: FileUploadResult['parsedData']['facts'] = [];

    // Simple Markdown parsing - extract entities, relationships, and facts

    // Extract entities (people, organizations, locations, etc.)
    // Simple pattern matching - can be enhanced with NLP
    const entityPatterns = [
      { type: 'person', pattern: /(?:^|\n)(?:Name|Person):\s*(.+)/gi },
      { type: 'organization', pattern: /(?:^|\n)(?:Organization|Company):\s*(.+)/gi },
      { type: 'location', pattern: /(?:^|\n)(?:Location|Address):\s*(.+)/gi },
      { type: 'email', pattern: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g },
      { type: 'phone', pattern: /(\+?[\d\s\-()]{10,})/g },
    ];

    for (const { type, pattern } of entityPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const name = match[1]?.trim();
        if (name && !entities.find((e) => e.name === name && e.type === type)) {
          entities.push({
            type,
            name,
            properties: {},
          });
        }
      }
    }

    // Extract relationships (simple pattern: "X is related to Y")
    const relationshipPattern = /(?:^|\n)(.+?)\s+(?:is|was|has|related to|associated with)\s+(.+?)(?:\.|$)/gi;
    const relMatches = content.matchAll(relationshipPattern);
    for (const match of relMatches) {
      const source = match[1]?.trim();
      const target = match[2]?.trim();
      if (source && target) {
        relationships.push({
          source,
          target,
          type: 'related_to',
        });
      }
    }

    // Extract facts (subject-predicate-object triples)
    const factPattern = /(?:^|\n)(.+?)\s+-\s+(.+?)\s+-\s+(.+?)(?:\.|$)/gi;
    const factMatches = content.matchAll(factPattern);
    for (const match of factMatches) {
      const subject = match[1]?.trim();
      const predicate = match[2]?.trim();
      const object = match[3]?.trim();
      if (subject && predicate && object) {
        facts.push({ subject, predicate, object });
      }
    }

    return { entities, relationships, facts };
  }

  /**
   * Upload and process Markdown file
   */
  async uploadFile(
    fileData: ArrayBuffer,
    fileName: string,
    attackerId: string,
    uploadedBy: string
  ): Promise<FileUploadResult> {
    const fileId = crypto.randomUUID();
    const filePath = `knowledge-graph/${attackerId}/${fileId}/${fileName}`;
    const uploadedAt = Date.now();

    // Store file in R2
    try {
      await this.env.EVIDENCE_VAULT.put(filePath, fileData, {
        httpMetadata: {
          contentType: 'text/markdown',
        },
        customMetadata: {
          attackerId,
          uploadedBy,
          uploadedAt: uploadedAt.toString(),
        },
      });
    } catch (error) {
      console.error('R2 upload failed:', error);
      throw new Error('Failed to upload file to storage');
    }

    // Parse Markdown content
    const content = new TextDecoder().decode(fileData);
    const parsedData = await this.parseMarkdown(content);

    // Store parsed data in D1
    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB
          .prepare(
            'INSERT INTO knowledge_graph_data (id, attacker_id, file_name, file_path, parsed_data, uploaded_at, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            fileId,
            attackerId,
            fileName,
            filePath,
            JSON.stringify(parsedData),
            uploadedAt,
            uploadedBy
          )
          .run();
      } else {
        // Fallback to KV
        await this.env.DEFENDER_FORGE.put(
          `knowledge-graph:${attackerId}:${fileId}`,
          JSON.stringify({
            fileName,
            filePath,
            parsedData,
            uploadedAt,
            uploadedBy,
          })
        );
      }
    } catch (error) {
      console.error('Database storage failed:', error);
      // File is already in R2, so we continue
    }

    return {
      fileId,
      fileName,
      filePath,
      parsedData,
      uploadedAt,
      attackerId,
    };
  }

  /**
   * Get uploaded files for an attacker
   */
  async getFiles(attackerId: string): Promise<Array<{
    id: string;
    fileName: string;
    filePath: string;
    uploadedAt: number;
    uploadedBy: string;
  }>> {
    try {
      if (this.env.DEFENDER_DB) {
        const result = await this.env.DEFENDER_DB
          .prepare(
            'SELECT id, file_name, file_path, uploaded_at, uploaded_by FROM knowledge_graph_data WHERE attacker_id = ? ORDER BY uploaded_at DESC'
          )
          .bind(attackerId)
          .all<{
            id: string;
            file_name: string;
            file_path: string;
            uploaded_at: number;
            uploaded_by: string;
          }>();

        return result.results.map((row) => ({
          id: row.id,
          fileName: row.file_name,
          filePath: row.file_path,
          uploadedAt: row.uploaded_at,
          uploadedBy: row.uploaded_by,
        }));
      } else {
        // Fallback to KV
        const prefix = `knowledge-graph:${attackerId}:`;
        const list = await this.env.DEFENDER_FORGE.list({ prefix });
        const files = [];

        for (const key of list.keys) {
          const data = await this.env.DEFENDER_FORGE.get(key.name, 'json') as {
            fileName: string;
            filePath: string;
            uploadedAt: number;
            uploadedBy: string;
          } | null;

          if (data) {
            files.push({
              id: key.name.split(':').pop() || '',
              fileName: data.fileName,
              filePath: data.filePath,
              uploadedAt: data.uploadedAt,
              uploadedBy: data.uploadedBy,
            });
          }
        }

        return files.sort((a, b) => b.uploadedAt - a.uploadedAt);
      }
    } catch (error) {
      console.error('Failed to get files:', error);
      return [];
    }
  }

  /**
   * Get parsed knowledge graph data for an attacker
   */
  async getKnowledgeGraphData(attackerId: string): Promise<FileUploadResult['parsedData']> {
    try {
      if (this.env.DEFENDER_DB) {
        const result = await this.env.DEFENDER_DB
          .prepare('SELECT parsed_data FROM knowledge_graph_data WHERE attacker_id = ?')
          .bind(attackerId)
          .all<{ parsed_data: string }>();

        // Merge all parsed data
        const merged: FileUploadResult['parsedData'] = {
          entities: [],
          relationships: [],
          facts: [],
        };

        for (const row of result.results) {
          const data = JSON.parse(row.parsed_data) as FileUploadResult['parsedData'];
          merged.entities.push(...data.entities);
          merged.relationships.push(...data.relationships);
          merged.facts.push(...data.facts);
        }

        // Deduplicate
        merged.entities = Array.from(
          new Map(merged.entities.map((e) => [`${e.type}:${e.name}`, e])).values()
        );
        merged.relationships = Array.from(
          new Map(
            merged.relationships.map((r) => [`${r.source}:${r.type}:${r.target}`, r])
          ).values()
        );
        merged.facts = Array.from(
          new Map(
            merged.facts.map((f) => [`${f.subject}:${f.predicate}:${f.object}`, f])
          ).values()
        );

        return merged;
      } else {
        // Fallback to KV
        const prefix = `knowledge-graph:${attackerId}:`;
        const list = await this.env.DEFENDER_FORGE.list({ prefix });
        const merged: FileUploadResult['parsedData'] = {
          entities: [],
          relationships: [],
          facts: [],
        };

        for (const key of list.keys) {
          const data = await this.env.DEFENDER_FORGE.get(key.name, 'json') as {
            parsedData: FileUploadResult['parsedData'];
          } | null;

          if (data?.parsedData) {
            merged.entities.push(...data.parsedData.entities);
            merged.relationships.push(...data.parsedData.relationships);
            merged.facts.push(...data.parsedData.facts);
          }
        }

        return merged;
      }
    } catch (error) {
      console.error('Failed to get knowledge graph data:', error);
      return { entities: [], relationships: [], facts: [] };
    }
  }
}

