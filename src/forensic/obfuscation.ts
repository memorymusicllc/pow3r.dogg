/**
 * Investigation Obfuscation
 * 
 * Hides investigation awareness from attackers:
 * - Case name randomization
 * - PII masking in logs
 * - Access pattern obfuscation
 * - Evidence export encryption
 * - Audit trail anonymization
 */

export interface ObfuscationConfig {
  caseNameRandomization: boolean;
  piiMasking: boolean;
  accessPatternObfuscation: boolean;
  evidenceEncryption: boolean;
  auditAnonymization: boolean;
}

export interface MaskedLog {
  original: string;
  masked: string;
  piiDetected: string[];
}

export class InvestigationObfuscator {
  private config: ObfuscationConfig;
  private caseIdMap: Map<string, string> = new Map(); // realId -> obfuscatedId
  private analystIdMap: Map<string, string> = new Map(); // realId -> roleId

  constructor(config: ObfuscationConfig) {
    this.config = config;
  }

  /**
   * Generate obfuscated case ID
   */
  obfuscateCaseId(realCaseId: string): string {
    if (!this.config.caseNameRandomization) {
      return realCaseId;
    }

    if (this.caseIdMap.has(realCaseId)) {
      return this.caseIdMap.get(realCaseId)!;
    }

    // Generate UUID-based obfuscated ID
    const obfuscated = `CASE-${crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase()}`;
    this.caseIdMap.set(realCaseId, obfuscated);
    return obfuscated;
  }

  /**
   * Get real case ID from obfuscated ID
   */
  deobfuscateCaseId(obfuscatedId: string): string | null {
    for (const [real, obfuscated] of this.caseIdMap.entries()) {
      if (obfuscated === obfuscatedId) {
        return real;
      }
    }
    return null;
  }

  /**
   * Mask PII in log entries
   */
  maskPII(text: string): MaskedLog {
    if (!this.config.piiMasking) {
      return {
        original: text,
        masked: text,
        piiDetected: [],
      };
    }

    const piiDetected: string[] = [];
    let masked = text;

    // Email patterns
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    emails.forEach((email) => {
      piiDetected.push(`email:${email}`);
      const [local, domain] = email.split('@');
      const maskedEmail = `${local.substring(0, 1)}***@${domain.substring(0, 1)}***`;
      masked = masked.replace(email, maskedEmail);
    });

    // Phone patterns
    const phoneRegex = /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
    const phones = text.match(phoneRegex) || [];
    phones.forEach((phone) => {
      piiDetected.push(`phone:${phone}`);
      const maskedPhone = phone.replace(/\d(?=\d{4})/g, '*');
      masked = masked.replace(phone, maskedPhone);
    });

    // SSN patterns
    const ssnRegex = /\b\d{3}-?\d{2}-?\d{4}\b/g;
    const ssns = text.match(ssnRegex) || [];
    ssns.forEach((ssn) => {
      piiDetected.push(`ssn:${ssn}`);
      masked = masked.replace(ssn, '***-**-****');
    });

    // Credit card patterns
    const ccRegex = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
    const cards = text.match(ccRegex) || [];
    cards.forEach((card) => {
      piiDetected.push(`credit_card:${card}`);
      const maskedCard = card.replace(/\d(?=\d{4})/g, '*');
      masked = masked.replace(card, maskedCard);
    });

    return {
      original: text,
      masked,
      piiDetected,
    };
  }

  /**
   * Obfuscate access patterns
   */
  obfuscateAccessTime(realTime: Date): Date {
    if (!this.config.accessPatternObfuscation) {
      return realTime;
    }

    // Add random offset between -2 and +2 hours
    const offsetHours = (Math.random() - 0.5) * 4;
    const offsetMs = offsetHours * 3600000;
    return new Date(realTime.getTime() + offsetMs);
  }

  /**
   * Anonymize analyst ID
   */
  anonymizeAnalystId(analystId: string, role: string): string {
    if (!this.config.auditAnonymization) {
      return analystId;
    }

    if (this.analystIdMap.has(analystId)) {
      return this.analystIdMap.get(analystId)!;
    }

    // Generate role-based identifier
    const rolePrefix = role.toUpperCase().substring(0, 3);
    const obfuscated = `${rolePrefix}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    this.analystIdMap.set(analystId, obfuscated);
    return obfuscated;
  }

  /**
   * Encrypt evidence export
   */
  async encryptEvidence(data: ArrayBuffer, caseId: string): Promise<{
    encrypted: ArrayBuffer;
    keyId: string;
  }> {
    if (!this.config.evidenceEncryption) {
      return {
        encrypted: data,
        keyId: 'none',
      };
    }

    // Generate case-specific key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(caseId + 'evidence-key'),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(16),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      data
    );

    const keyId = `key-${crypto.randomUUID()}`;

    return {
      encrypted,
      keyId,
    };
  }

  /**
   * Create obfuscated audit log entry
   */
  createObfuscatedAuditLog(
    action: string,
    analystId: string,
    analystRole: string,
    caseId: string,
    timestamp: Date
  ): Record<string, unknown> {
    const obfuscatedCaseId = this.obfuscateCaseId(caseId);
    const anonymizedAnalyst = this.anonymizeAnalystId(analystId, analystRole);
    const obfuscatedTime = this.obfuscateAccessTime(timestamp);

    return {
      action,
      analyst: anonymizedAnalyst,
      role: analystRole,
      case: obfuscatedCaseId,
      timestamp: obfuscatedTime.toISOString(),
      obfuscated: true,
    };
  }

  /**
   * Clear obfuscation mappings (for security)
   */
  clearMappings(): void {
    this.caseIdMap.clear();
    this.analystIdMap.clear();
  }
}

