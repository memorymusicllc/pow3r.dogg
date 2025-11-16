export interface ObservationalData {
  timestamp: number;
  source: string;
  type: string;
  data: Record<string, unknown>;
  metadata?: {
    component_id?: string;
    event_id?: string;
    trace_id?: string;
    [key: string]: unknown;
  };
}

export interface ComponentEvent {
  event_type: string;
  component_id: string;
  timestamp: number;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ObservationalDataAdapter<T> {
  adapt(data: ObservationalData): T;
  validate(data: ObservationalData): boolean;
}

export interface DataSubscription {
  id: string;
  component_id: string;
  data_type: string;
  callback: (data: ObservationalData) => void;
  unsubscribe: () => void;
}

export class ObservationalDataStore {
  private subscriptions: Map<string, DataSubscription[]> = new Map();
  private dataCache: Map<string, ObservationalData[]> = new Map();

  subscribe(
    componentId: string,
    dataType: string,
    callback: (data: ObservationalData) => void
  ): DataSubscription {
    const id = `${componentId}-${dataType}-${Date.now()}`;
    const subscription: DataSubscription = {
      id,
      component_id: componentId,
      data_type: dataType,
      callback,
      unsubscribe: () => {
        const subs = this.subscriptions.get(componentId) || [];
        const filtered = subs.filter((s) => s.id !== id);
        if (filtered.length === 0) {
          this.subscriptions.delete(componentId);
        } else {
          this.subscriptions.set(componentId, filtered);
        }
      },
    };

    const existing = this.subscriptions.get(componentId) || [];
    this.subscriptions.set(componentId, [...existing, subscription]);

    return subscription;
  }

  emit(componentId: string, data: ObservationalData): void {
    const subscriptions = this.subscriptions.get(componentId) || [];
    subscriptions.forEach((sub) => {
      if (sub.data_type === data.type || sub.data_type === '*') {
        sub.callback(data);
      }
    });

    // Cache data
    const cacheKey = `${componentId}-${data.type}`;
    const cached = this.dataCache.get(cacheKey) || [];
    cached.push(data);
    // Keep last 100 items
    if (cached.length > 100) {
      cached.shift();
    }
    this.dataCache.set(cacheKey, cached);
  }

  getCached(componentId: string, dataType: string): ObservationalData[] {
    const cacheKey = `${componentId}-${dataType}`;
    return this.dataCache.get(cacheKey) || [];
  }

  clearCache(componentId?: string): void {
    if (componentId) {
      const keys = Array.from(this.dataCache.keys()).filter((k) =>
        k.startsWith(componentId)
      );
      keys.forEach((k) => this.dataCache.delete(k));
    } else {
      this.dataCache.clear();
    }
  }
}

export const observationalDataStore = new ObservationalDataStore();

