/**
 * Abi Progress Monitoring
 * 
 * Sends progress updates to Abi orchestrator for deployment monitoring
 */

import type { Env } from '../types';
import { AbiNotifier } from './abi-notify';

export interface ProgressUpdate {
  step: string;
  status: 'in_progress' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export class AbiProgressMonitor {
  private abiNotifier: AbiNotifier;
  private progressLog: ProgressUpdate[] = [];

  constructor(env: Env) {
    this.abiNotifier = new AbiNotifier(env);
  }

  /**
   * Report progress to Abi
   */
  async reportProgress(update: ProgressUpdate): Promise<void> {
    this.progressLog.push(update);

    // Notify Abi of progress (graceful failure)
    try {
      await this.abiNotifier.notify({
        eventType: 'xmap_node_updated',
        timestamp: update.timestamp,
        metadata: {
          progressUpdate: update,
          progressLog: this.progressLog,
        },
      });
    } catch (error) {
      // Graceful degradation: continue without Abi
      console.warn('Abi progress notification failed (non-critical):', error);
    }

    console.log(`[Abi Monitor] ${update.step}: ${update.status} - ${update.message}`);
  }

  /**
   * Report step start
   */
  async startStep(step: string, message: string): Promise<void> {
    await this.reportProgress({
      step,
      status: 'in_progress',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Report step completion
   */
  async completeStep(step: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.reportProgress({
      step,
      status: 'completed',
      message,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Report step failure
   */
  async failStep(step: string, message: string, error?: Error): Promise<void> {
    await this.reportProgress({
      step,
      status: 'failed',
      message,
      timestamp: new Date().toISOString(),
      metadata: {
        error: error?.message,
        stack: error?.stack,
      },
    });
  }

  /**
   * Get progress summary
   */
  getProgressSummary(): {
    total: number;
    completed: number;
    inProgress: number;
    failed: number;
    percentage: number;
  } {
    const total = this.progressLog.length;
    const completed = this.progressLog.filter((u) => u.status === 'completed').length;
    const inProgress = this.progressLog.filter((u) => u.status === 'in_progress').length;
    const failed = this.progressLog.filter((u) => u.status === 'failed').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      failed,
      percentage,
    };
  }
}

