/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * Service for managing prompt templates (CRUD operations).
 * Handles both built-in templates (read-only) and custom templates (full CRUD).
 */

import {Op} from 'sequelize';
import {PromptTemplate} from '@/db';

/**
 * Input interface for creating a new prompt template.
 */
export interface PromptTemplateInput {
  /**
   * Unique identifier for the template.
   * Used to reference the template programmatically.
   */
  name: string;
  /**
   * Human-readable name for the template.
   * Displayed in the UI.
   */
  displayName: string;
  /**
   * Detailed description of the template's purpose.
   */
  description: string;
  /**
   * The template content string.
   * May contain variable placeholders in the format {{variableName}}.
   */
  content: string;
  /**
   * Category for organizing templates.
   */
  category: string;
  /**
   * Array of variable definitions used in the template.
   * Each variable defines a placeholder that can be substituted.
   */
  variables?: Array<{
    /** The variable name used in placeholders (e.g., {{name}}) */
    name: string;
    /** Description of what the variable represents */
    description: string;
    /** Whether the variable must be provided for rendering */
    required?: boolean;
  }>;
  /**
   * Additional configuration settings for the template.
   * Stored as key-value pairs with unknown types.
   */
  settings?: Record<string, unknown>;
  /**
   * Whether this template should be set as the default.
   * If true, other default templates will be unset.
   */
  isDefault?: boolean;
}

/**
 * Input interface for updating an existing prompt template.
 * All properties are optional.
 */
export interface PromptTemplateUpdateInput {
  /** Human-readable name for the template. */
  displayName?: string;
  /** Detailed description of the template's purpose. */
  description?: string;
  /** The template content string. */
  content?: string;
  /** Category for organizing templates. */
  category?: string;
  /** Array of variable definitions used in the template. */
  variables?: Array<{
    /** The variable name used in placeholders */
    name: string;
    /** Description of what the variable represents */
    description: string;
    /** Whether the variable must be provided for rendering */
    required?: boolean;
  }>;
  /** Additional configuration settings for the template. */
  settings?: Record<string, unknown>;
  /** Whether this template should be set as the default. */
  isDefault?: boolean;
}

class PromptTemplateService {
  /** Get all custom (non-built-in) templates */
  async getAll(): Promise<PromptTemplate[]> {
    return PromptTemplate.findAll({
      order: [['createdAt', 'ASC']],
    });
  }

  /** Get templates filtered by category */
  async getByCategory(category?: string): Promise<PromptTemplate[]> {
    const where: Record<string, unknown> = {};
    if (category) {
      where.category = category;
    }
    return PromptTemplate.findAll({
      where,
      order: [['createdAt', 'ASC']],
    });
  }

  /** Get a single template by ID */
  async getById(id: number): Promise<PromptTemplate | null> {
    return PromptTemplate.findByPk(id);
  }

  /** Get a single template by name */
  async getByName(name: string): Promise<PromptTemplate | null> {
    return PromptTemplate.findOne({
      where: {name},
    });
  }

  /** Create a new custom template */
  async create(input: PromptTemplateInput): Promise<PromptTemplate> {
    // Set isDefault: true if no other default exists
    let isDefault = false;
    if (input.isDefault) {
      const existingDefault = await PromptTemplate.findOne({
        where: {isDefault: true},
      });
      if (existingDefault) {
        await existingDefault.update({isDefault: false});
      }
    } else {
      // Check if this is the first template (no defaults exist)
      const defaultCount = await PromptTemplate.count({where: {isDefault: true}});
      if (defaultCount === 0) {
        isDefault = true;
      }
    }

    const template = await PromptTemplate.create({
      name: input.name,
      displayName: input.displayName,
      description: input.description,
      content: input.content,
      category: input.category,
      isBuiltIn: false,
      isDefault: isDefault || input.isDefault || false,
      variables: JSON.stringify(input.variables ?? []),
      settings: input.settings ? JSON.stringify(input.settings) : null,
    });

    return template;
  }

  /** Update an existing template */
  async update(id: number, input: PromptTemplateUpdateInput): Promise<PromptTemplate | null> {
    const template = await PromptTemplate.findByPk(id);
    if (!template) {
      return null;
    }

    // If setting isDefault, clear the old default
    if (input.isDefault === true) {
      const existingDefault = await PromptTemplate.findOne({
        where: {isDefault: true, id: {[Op.ne]: id}},
      });
      if (existingDefault) {
        await existingDefault.update({isDefault: false});
      }
    }

    const updateData: Record<string, unknown> = {};
    if (input.displayName !== undefined) updateData.displayName = input.displayName;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;
    if (input.variables !== undefined) updateData.variables = JSON.stringify(input.variables);
    if (input.settings !== undefined) updateData.settings = JSON.stringify(input.settings);

    await template.update(updateData);

    return PromptTemplate.findByPk(id);
  }

  /** Delete a template (fails for built-in) */
  async delete(id: number): Promise<boolean> {
    const template = await PromptTemplate.findByPk(id);
    if (!template) {
      return false;
    }

    if (template.isBuiltIn) {
      throw new Error('Cannot delete built-in templates');
    }

    await template.destroy();
    return true;
  }

  /** Set a template as default */
  async setDefault(id: number): Promise<PromptTemplate | null> {
    const template = await PromptTemplate.findByPk(id);
    if (!template) {
      return null;
    }

    // Clear all other defaults
    await PromptTemplate.update(
      {isDefault: false},
      {where: {isDefault: true}},
    );

    template.isDefault = true;
    await template.save();

    return template;
  }

  /** Validate template name is unique */
  async validateName(name: string, excludeId?: number): Promise<boolean> {
    const where: Record<string, unknown> = {name};
    if (excludeId) {
      where.id = {[Op.ne]: excludeId};
    }
    const existing = await PromptTemplate.findOne({where});
    return !existing;
  }

  /** Parse template variables from JSON string */
  parseVariables(jsonString: string): Array<{name: string; description: string; required: boolean}> {
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  }

  /** Substitute variables in template content */
  substituteVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /** Render a template with given variable values */
  async renderTemplate(
    template: PromptTemplate,
    variables: Record<string, string>,
  ): Promise<{content: string; variables: Record<string, string>}> {
    const parsedVariables = this.parseVariables(template.variables);

    // Check required variables
    const missingRequired = parsedVariables
      .filter((v: {required: boolean}) => v.required)
      .map((v: {name: string}) => v.name)
      .filter((name: string) => !variables[name] || variables[name].trim() === '');

    if (missingRequired.length > 0) {
      throw new Error(`Missing required variables: ${missingRequired.join(', ')}`);
    }

    const content = this.substituteVariables(template.content, variables);

    return {content, variables};
  }
}

export const promptTemplateService = new PromptTemplateService();
export default promptTemplateService;
