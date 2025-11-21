/**
 * LLM Account Management System
 * 
 * Manages multiple LLM provider accounts with rate limiting, cost tracking, and health monitoring
 */

import type { Env } from '../types';

export interface LLMAccount {
  id: string;
  provider: 'openai' | 'anthropic' | 'azure' | 'self-hosted' | 'google' | 'cohere';
  accountName: string;
  apiKey?: string;
  endpointUrl?: string;
  models: string[];
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  costPerToken: number;
  status: 'active' | 'inactive' | 'error' | 'rate_limited';
  lastUsed?: number;
  successCount: number;
  failureCount: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface LLMAccountOptions {
  provider: LLMAccount['provider'];
  accountName: string;
  apiKey?: string;
  endpointUrl?: string;
  models: string[];
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  costPerToken?: number;
  metadata?: Record<string, unknown>;
}

export class LLMAccountManager {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Create a new LLM account
   */
  async createAccount(options: LLMAccountOptions): Promise<LLMAccount> {
    const id = crypto.randomUUID();
    const account: LLMAccount = {
      id,
      provider: options.provider,
      accountName: options.accountName,
      apiKey: options.apiKey,
      endpointUrl: options.endpointUrl,
      models: options.models,
      rateLimitPerMinute: options.rateLimitPerMinute || 60,
      rateLimitPerDay: options.rateLimitPerDay || 10000,
      costPerToken: options.costPerToken || 0.0,
      status: 'active',
      successCount: 0,
      failureCount: 0,
      metadata: options.metadata,
      createdAt: Date.now(),
    };

    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB
          .prepare(
            'INSERT INTO llm_accounts (id, provider, account_name, api_key, endpoint_url, models, rate_limit_per_minute, rate_limit_per_day, cost_per_token, status, success_count, failure_count, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            id,
            options.provider,
            options.accountName,
            options.apiKey || null,
            options.endpointUrl || null,
            JSON.stringify(options.models),
            account.rateLimitPerMinute,
            account.rateLimitPerDay,
            account.costPerToken,
            account.status,
            0,
            0,
            options.metadata ? JSON.stringify(options.metadata) : null,
            account.createdAt
          )
          .run();
      } else {
        // Fallback to KV
        await this.env.CONFIG_STORE.put(
          `llm_account:${id}`,
          JSON.stringify(account)
        );
      }
    } catch (error) {
      console.error('Failed to create LLM account:', error);
      // Still store in KV
      await this.env.CONFIG_STORE.put(
        `llm_account:${id}`,
        JSON.stringify(account)
      );
    }

    return account;
  }

  /**
   * Get all active accounts for a provider
   */
  async getActiveAccounts(provider?: LLMAccount['provider']): Promise<LLMAccount[]> {
    try {
      if (this.env.DEFENDER_DB) {
        let query = 'SELECT * FROM llm_accounts WHERE status = ?';
        const params: unknown[] = ['active'];

        if (provider) {
          query += ' AND provider = ?';
          params.push(provider);
        }

        query += ' ORDER BY success_count DESC, failure_count ASC';

        const result = await this.env.DEFENDER_DB
          .prepare(query)
          .bind(...params)
          .all<{
            id: string;
            provider: string;
            account_name: string;
            api_key: string | null;
            endpoint_url: string | null;
            models: string;
            rate_limit_per_minute: number;
            rate_limit_per_day: number;
            cost_per_token: number;
            status: string;
            last_used: number | null;
            success_count: number;
            failure_count: number;
            metadata: string | null;
            created_at: number;
          }>();

        return result.results.map((row) => ({
          id: row.id,
          provider: row.provider as LLMAccount['provider'],
          accountName: row.account_name,
          apiKey: row.api_key || undefined,
          endpointUrl: row.endpoint_url || undefined,
          models: JSON.parse(row.models) as string[],
          rateLimitPerMinute: row.rate_limit_per_minute,
          rateLimitPerDay: row.rate_limit_per_day,
          costPerToken: row.cost_per_token,
          status: row.status as LLMAccount['status'],
          lastUsed: row.last_used || undefined,
          successCount: row.success_count,
          failureCount: row.failure_count,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          createdAt: row.created_at,
        }));
      } else {
        // Fallback to KV
        const list = await this.env.CONFIG_STORE.list({ prefix: 'llm_account:' });
        const accounts: LLMAccount[] = [];

        for (const key of list.keys) {
          const data = await this.env.CONFIG_STORE.get(key.name);
          if (data) {
            const account = JSON.parse(data) as LLMAccount;
            if (account.status === 'active' && (!provider || account.provider === provider)) {
              accounts.push(account);
            }
          }
        }

        return accounts.sort((a, b) => {
          const aScore = a.successCount / (a.failureCount + 1);
          const bScore = b.successCount / (b.failureCount + 1);
          return bScore - aScore;
        });
      }
    } catch (error) {
      console.error('Failed to get active accounts:', error);
      return [];
    }
  }

  /**
   * Select best account for a model
   */
  async selectBestAccount(
    provider: LLMAccount['provider'],
    model: string
  ): Promise<LLMAccount | null> {
    const accounts = await this.getActiveAccounts(provider);
    
    // Filter accounts that support the model
    const compatibleAccounts = accounts.filter((acc) => acc.models.includes(model));
    
    if (compatibleAccounts.length === 0) {
      return null;
    }

    // Select account with best success rate and not rate limited
    const availableAccounts = compatibleAccounts.filter(
      (acc) => acc.status === 'active'
    );

    if (availableAccounts.length === 0) {
      return null;
    }

    // Sort by success rate
    availableAccounts.sort((a, b) => {
      const aRate = a.successCount / (a.successCount + a.failureCount + 1);
      const bRate = b.successCount / (b.successCount + b.failureCount + 1);
      return bRate - aRate;
    });

    return availableAccounts[0];
  }

  /**
   * Record account usage
   */
  async recordUsage(
    accountId: string,
    success: boolean,
    cost: number = 0
  ): Promise<void> {
    try {
      if (this.env.DEFENDER_DB) {
        if (success) {
          await this.env.DEFENDER_DB
            .prepare(
              'UPDATE llm_accounts SET success_count = success_count + 1, last_used = ? WHERE id = ?'
            )
            .bind(Date.now(), accountId)
            .run();
        } else {
          await this.env.DEFENDER_DB
            .prepare(
              'UPDATE llm_accounts SET failure_count = failure_count + 1, last_used = ? WHERE id = ?'
            )
            .bind(Date.now(), accountId)
            .run();
        }
      } else {
        // Fallback to KV
        const data = await this.env.CONFIG_STORE.get(`llm_account:${accountId}`);
        if (data) {
          const account = JSON.parse(data) as LLMAccount;
          if (success) {
            account.successCount++;
          } else {
            account.failureCount++;
          }
          account.lastUsed = Date.now();
          await this.env.CONFIG_STORE.put(`llm_account:${accountId}`, JSON.stringify(account));
        }
      }
    } catch (error) {
      console.error('Failed to record usage:', error);
    }
  }

  /**
   * Update account status
   */
  async updateStatus(
    accountId: string,
    status: LLMAccount['status']
  ): Promise<void> {
    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB
          .prepare('UPDATE llm_accounts SET status = ? WHERE id = ?')
          .bind(status, accountId)
          .run();
      } else {
        const data = await this.env.CONFIG_STORE.get(`llm_account:${accountId}`);
        if (data) {
          const account = JSON.parse(data) as LLMAccount;
          account.status = status;
          await this.env.CONFIG_STORE.put(`llm_account:${accountId}`, JSON.stringify(account));
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId: string): Promise<LLMAccount | null> {
    try {
      if (this.env.DEFENDER_DB) {
        const result = await this.env.DEFENDER_DB
          .prepare('SELECT * FROM llm_accounts WHERE id = ?')
          .bind(accountId)
          .first<{
            id: string;
            provider: string;
            account_name: string;
            api_key: string | null;
            endpoint_url: string | null;
            models: string;
            rate_limit_per_minute: number;
            rate_limit_per_day: number;
            cost_per_token: number;
            status: string;
            last_used: number | null;
            success_count: number;
            failure_count: number;
            metadata: string | null;
            created_at: number;
          }>();

        if (!result) return null;

        return {
          id: result.id,
          provider: result.provider as LLMAccount['provider'],
          accountName: result.account_name,
          apiKey: result.api_key || undefined,
          endpointUrl: result.endpoint_url || undefined,
          models: JSON.parse(result.models) as string[],
          rateLimitPerMinute: result.rate_limit_per_minute,
          rateLimitPerDay: result.rate_limit_per_day,
          costPerToken: result.cost_per_token,
          status: result.status as LLMAccount['status'],
          lastUsed: result.last_used || undefined,
          successCount: result.success_count,
          failureCount: result.failure_count,
          metadata: result.metadata ? JSON.parse(result.metadata) : undefined,
          createdAt: result.created_at,
        };
      } else {
        const data = await this.env.CONFIG_STORE.get(`llm_account:${accountId}`);
        if (!data) return null;
        return JSON.parse(data) as LLMAccount;
      }
    } catch (error) {
      console.error('Failed to get account:', error);
      return null;
    }
  }
}

