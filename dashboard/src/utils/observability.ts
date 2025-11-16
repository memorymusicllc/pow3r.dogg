import type { ComponentEvent } from '../types/observational';

export interface ObservabilityEvent extends ComponentEvent {
  level?: 'info' | 'warning' | 'error' | 'debug';
  trace_id?: string;
  span_id?: string;
}

class ObservabilityEmitter {
  private events: ObservabilityEvent[] = [];
  private maxEvents = 1000;
  private listeners: Array<(event: ObservabilityEvent) => void> = [];

  emit(event: ObservabilityEvent): void {
    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }

    // Add to events array
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in observability listener:', error);
      }
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[Observability]', event);
    }

    // Send to CloudFlare observability if configured
    if (typeof window !== 'undefined' && (window as any).cloudflare?.observability) {
      try {
        (window as any).cloudflare.observability.log(event);
      } catch (error) {
        console.warn('Failed to send event to CloudFlare observability:', error);
      }
    }
  }

  on(listener: (event: ObservabilityEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getEvents(componentId?: string, eventType?: string): ObservabilityEvent[] {
    let filtered = this.events;
    if (componentId) {
      filtered = filtered.filter((e) => e.component_id === componentId);
    }
    if (eventType) {
      filtered = filtered.filter((e) => e.event_type === eventType);
    }
    return filtered;
  }

  clear(): void {
    this.events = [];
  }
}

export const observabilityEmitter = new ObservabilityEmitter();

export function emitComponentEvent(
  componentId: string,
  eventType: string,
  data: Record<string, unknown>,
  metadata?: Record<string, unknown>
): void {
  observabilityEmitter.emit({
    event_type: eventType,
    component_id: componentId,
    timestamp: Date.now(),
    data,
    metadata,
    level: 'info',
  });
}

export function emitErrorEvent(
  componentId: string,
  error: Error,
  metadata?: Record<string, unknown>
): void {
  observabilityEmitter.emit({
    event_type: 'error',
    component_id: componentId,
    timestamp: Date.now(),
    data: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    metadata,
    level: 'error',
  });
}

export function emitTraceEvent(
  componentId: string,
  operation: string,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  observabilityEmitter.emit({
    event_type: 'trace',
    component_id: componentId,
    timestamp: Date.now(),
    data: {
      operation,
      duration,
    },
    metadata,
    level: 'debug',
  });
}

