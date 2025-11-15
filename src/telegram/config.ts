/**
 * Telegram Bot Configuration Loader
 * 
 * Loads and validates telegram-bot.yaml configuration
 */

// YAML parsing - in production use 'yaml' package or fetch from KV
// For Cloudflare Workers, we'll parse YAML manually or use a lightweight parser

export interface TelegramBotConfig {
  metadata: {
    name: string;
    version: string;
    classification: string;
  };
  components: {
    guard_dog: GuardDogConfig;
    impersonation_bot: ImpersonationBotConfig;
    capture_system: CaptureSystemConfig;
  };
  deployment: DeploymentConfig;
  authentication: AuthenticationConfig;
  stealth_features: StealthFeaturesConfig;
  integration: IntegrationConfig;
  monitoring: MonitoringConfig;
}

export interface GuardDogConfig {
  name: string;
  purpose: string;
  capabilities: string[];
  detection_rules: DetectionRule[];
  monitoring: MonitoringSettings;
}

export interface DetectionRule {
  rule: string;
  patterns: string[];
  threshold: number;
  action: string;
}

export interface MonitoringSettings {
  channels: string[];
  events: string[];
  real_time: boolean;
  batch_processing: boolean;
}

export interface ImpersonationBotConfig {
  name: string;
  purpose: string;
  capabilities: string[];
  style_analysis: StyleAnalysisConfig;
  time_waste_strategies: TimeWasteStrategy[];
  emotional_mirroring: EmotionalMirroringConfig;
  conversation_goals: ConversationGoals;
}

export interface StyleAnalysisConfig {
  sources: string[];
  model: string;
  update_frequency: string;
}

export interface TimeWasteStrategy {
  strategy: string;
  description: string;
  target_duration: string;
}

export interface EmotionalMirroringConfig {
  detect_attacker_emotion: boolean;
  mirror_intensity: number;
  natural_variation: number;
  escalation_prevention: boolean;
}

export interface ConversationGoals {
  primary: string;
  secondary: string;
  tertiary: string;
  constraints: string[];
}

export interface CaptureSystemConfig {
  name: string;
  purpose: string;
  capabilities: string[];
  capture_methods: CaptureMethod[];
  storage: StorageConfig;
}

export interface CaptureMethod {
  method: string;
  timing: string;
  format?: string;
  quality?: string;
  engine?: string;
  languages?: string[];
  confidence_threshold?: number;
  fields?: string[];
}

export interface StorageConfig {
  primary: string;
  backup: string;
  retention: string;
  encryption: string;
  access_control: string;
}

export interface DeploymentConfig {
  architecture: string;
  components: DeploymentComponents;
}

export interface DeploymentComponents {
  mcp_server: ComponentConfig;
  mtproto_handler: ComponentConfig;
  impersonation_engine: ComponentConfig;
}

export interface ComponentConfig {
  location: string;
  endpoint?: string;
  protocol?: string;
  security?: string;
  communication?: string;
  model?: string;
  api?: string;
  caching?: string;
  bindings?: string[];
}

export interface AuthenticationConfig {
  method: string;
  credentials: CredentialsConfig;
  rotation: string;
  fallback: string;
}

export interface CredentialsConfig {
  telegram_api_id: string;
  telegram_api_hash: string;
  telegram_bot_token: string;
}

export interface StealthFeaturesConfig {
  read_receipt_delays: ReadReceiptDelaysConfig;
  typing_indicators: TypingIndicatorsConfig;
  online_status: OnlineStatusConfig;
  message_timing: MessageTimingConfig;
}

export interface ReadReceiptDelaysConfig {
  min_seconds: number;
  max_seconds: number;
  distribution: string;
}

export interface TypingIndicatorsConfig {
  enabled: boolean;
  pattern: string;
  variation: number;
  min_chars: number;
  max_chars: number;
}

export interface OnlineStatusConfig {
  guard_dog: string;
  impersonation: string;
  switching: string;
}

export interface MessageTimingConfig {
  response_delay_min: number;
  response_delay_max: number;
  urgency_modifier: number;
  natural_variation: boolean;
}

export interface IntegrationConfig {
  xmap: XMAPIntegrationConfig;
  abi: AbiIntegrationConfig;
}

export interface XMAPIntegrationConfig {
  node_type: string;
  update_on: string[];
  notify_abi: boolean;
}

export interface AbiIntegrationConfig {
  webhook_url: string;
  events: string[];
  retry_policy: RetryPolicyConfig;
}

export interface RetryPolicyConfig {
  max_retries: number;
  backoff: string;
  timeout: number;
}

export interface MonitoringConfig {
  metrics: string[];
  alerts: string[];
  dashboard: string;
}

export class TelegramConfigLoader {
  /**
   * Load configuration from YAML file
   */
  static async loadConfig(yamlContent: string): Promise<TelegramBotConfig> {
    try {
      // In production, use a YAML parser library
      // For now, parse JSON if YAML is actually JSON, or use a simple parser
      let parsed: { telegram_bot?: TelegramBotConfig };
      
      // Try JSON first (some YAML is valid JSON)
      try {
        parsed = JSON.parse(yamlContent);
      } catch {
        // If not JSON, use a simple YAML parser or fetch from KV
        // In production, would use 'yaml' npm package
        throw new Error('YAML parsing requires yaml package - use loadFromKV instead');
      }
      
      if (!parsed.telegram_bot) {
        throw new Error('Invalid telegram-bot.yaml: missing telegram_bot root');
      }

      return parsed.telegram_bot;
    } catch (error) {
      throw new Error(`Failed to parse telegram-bot.yaml: ${error}`);
    }
  }
  
  /**
   * Load config from KV store (recommended for Cloudflare Workers)
   */
  static async loadFromKV(kv: KVNamespace, key: string = 'telegram-bot.yaml'): Promise<TelegramBotConfig> {
    const yamlContent = await kv.get(key);
    if (!yamlContent) {
      throw new Error(`Telegram bot config not found in KV: ${key}`);
    }
    return this.loadConfig(yamlContent);
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: TelegramBotConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate metadata
    if (!config.metadata?.name) {
      errors.push('Missing metadata.name');
    }
    if (!config.metadata?.version) {
      errors.push('Missing metadata.version');
    }

    // Validate components
    if (!config.components?.guard_dog) {
      errors.push('Missing components.guard_dog');
    }
    if (!config.components?.impersonation_bot) {
      errors.push('Missing components.impersonation_bot');
    }
    if (!config.components?.capture_system) {
      errors.push('Missing components.capture_system');
    }

    // Validate authentication
    if (!config.authentication?.credentials?.telegram_api_id) {
      errors.push('Missing authentication.credentials.telegram_api_id');
    }
    if (!config.authentication?.credentials?.telegram_api_hash) {
      errors.push('Missing authentication.credentials.telegram_api_hash');
    }
    if (!config.authentication?.credentials?.telegram_bot_token) {
      errors.push('Missing authentication.credentials.telegram_bot_token');
    }

    // Validate stealth features
    if (!config.stealth_features?.read_receipt_delays) {
      errors.push('Missing stealth_features.read_receipt_delays');
    }
    if (!config.stealth_features?.typing_indicators) {
      errors.push('Missing stealth_features.typing_indicators');
    }

    // Validate integration
    if (!config.integration?.xmap) {
      errors.push('Missing integration.xmap');
    }
    if (!config.integration?.abi) {
      errors.push('Missing integration.abi');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Load config from file (for Node.js environments)
   */
  static async loadFromFile(filePath: string): Promise<TelegramBotConfig> {
    // In Cloudflare Workers, use KV or fetch
    // Load configuration from KV storage
    const response = await fetch(filePath);
    const yamlContent = await response.text();
    return this.loadConfig(yamlContent);
  }
}

