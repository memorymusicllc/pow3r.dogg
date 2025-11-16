import type {
  Pow3rConfig,
  ComponentConfig,
  WorkflowConfig,
  KnowledgeGraphConfig,
  ThemeConfig,
} from '../config/pow3r-config';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePow3rConfig(config: Pow3rConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate version
  if (!config.version) {
    errors.push('Config version is required');
  } else if (!config.version.match(/^\d+\.\d+\.\d+$/)) {
    errors.push(`Invalid version format: ${config.version}`);
  }

  // Validate schema
  if (!config.schema) {
    errors.push('Config schema is required');
  } else if (config.schema !== 'pow3r-v4') {
    warnings.push(`Schema version ${config.schema} may not be fully supported`);
  }

  // Validate components
  if (config.components) {
    Object.entries(config.components).forEach(([id, component]) => {
      const componentErrors = validateComponentConfig(id, component);
      errors.push(...componentErrors.errors);
      warnings.push(...componentErrors.warnings);
    });
  }

  // Validate workflows
  if (config.workflows) {
    Object.entries(config.workflows).forEach(([id, workflow]) => {
      const workflowErrors = validateWorkflowConfig(id, workflow);
      errors.push(...workflowErrors.errors);
      warnings.push(...workflowErrors.warnings);
    });
  }

  // Validate knowledge graphs
  if (config.knowledgeGraph) {
    Object.entries(config.knowledgeGraph).forEach(([id, graph]) => {
      const graphErrors = validateKnowledgeGraphConfig(id, graph);
      errors.push(...graphErrors.errors);
      warnings.push(...graphErrors.warnings);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateComponentConfig(
  id: string,
  config: ComponentConfig
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.component_id) {
    errors.push(`Component ${id}: component_id is required`);
  }
  if (!config.component_type) {
    errors.push(`Component ${id}: component_type is required`);
  }
  if (!config.version) {
    errors.push(`Component ${id}: version is required`);
  }
  if (!config.config) {
    errors.push(`Component ${id}: config is required`);
  } else {
    if (!config.config.rendering) {
      warnings.push(`Component ${id}: No rendering config specified`);
    }
    if (!config.config.themes) {
      warnings.push(`Component ${id}: No themes config specified`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateWorkflowConfig(
  id: string,
  config: WorkflowConfig
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.workflow_id) {
    errors.push(`Workflow ${id}: workflow_id is required`);
  }
  if (!config.name) {
    errors.push(`Workflow ${id}: name is required`);
  }
  if (!config.steps || !Array.isArray(config.steps)) {
    errors.push(`Workflow ${id}: steps must be an array`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateKnowledgeGraphConfig(
  id: string,
  config: KnowledgeGraphConfig
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.graph_id) {
    errors.push(`Knowledge Graph ${id}: graph_id is required`);
  }
  if (!config.schema) {
    errors.push(`Knowledge Graph ${id}: schema is required`);
  } else {
    if (!config.schema.entities || !Array.isArray(config.schema.entities)) {
      errors.push(`Knowledge Graph ${id}: schema.entities must be an array`);
    }
    if (
      !config.schema.relationships ||
      !Array.isArray(config.schema.relationships)
    ) {
      errors.push(
        `Knowledge Graph ${id}: schema.relationships must be an array`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function getComponentConfigSafe(
  config: Pow3rConfig | null,
  componentId: string
): ComponentConfig | null {
  if (!config || !config.components) {
    return null;
  }
  return config.components[componentId] || null;
}

export function getRenderingConfig(
  componentConfig: ComponentConfig | null,
  mode: '2d' | '3d' | 'react_flow' | 'threejs'
): boolean {
  if (!componentConfig || !componentConfig.config.rendering) {
    return mode === '2d'; // Default to 2D if no config
  }
  const renderingConfig = componentConfig.config.rendering[mode];
  return renderingConfig?.enabled !== false;
}

export function getThemeConfig(
  componentConfig: ComponentConfig | null,
  theme: 'true-black' | 'light' | 'glass'
): ThemeConfig | null {
  if (!componentConfig || !componentConfig.config.themes) {
    return null;
  }
  const themeKey = theme === 'true-black' ? 'dark' : theme;
  return componentConfig.config.themes[themeKey] || null;
}

