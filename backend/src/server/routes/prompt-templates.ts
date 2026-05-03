/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module server/routes/prompt-templates
 * @description API endpoints for managing prompt templates.
 *
 * Provides full CRUD operations for prompt templates with support for:
 *
 * - Built-in (read-only) and custom templates
 * - Variable substitution and template rendering
 * - Category-based filtering
 * - Default template management
 * - Search, Pagination, Cloning, Bulk Operations, Import/Export
 *
 * ## Routes
 *
 * | Method | Path | Description |
 * |--------|------|---------|
 * | GET | `/api/prompt-templates` | List all templates (supports pagination & search) |
 * | GET | `/api/prompt-templates/stats` | Get usage statistics |
 * | GET | `/api/prompt-templates/:id` | Get template by ID |
 * | GET | `/api/prompt-templates/name/:name` | Get template by name |
 * | POST | `/api/prompt-templates` | Create new template |
 * | PUT | `/api/prompt-templates/:id` | Update template |
 * | DELETE | `/api/prompt-templates/:id` | Delete template |
 * | PATCH | `/api/prompt-templates/:id/default` | Set as default |
 * | PATCH | `/api/prompt-templates/rename-category` | Rename a category in bulk |
 * | GET | `/api/prompt-templates/categories` | List categories |
 * | POST | `/api/prompt-templates/render` | Render template (dry run) |
 * | POST | `/api/prompt-templates/validate` | Validate template structure |
 * | POST | `/api/prompt-templates/extract-variables` | Extract variables from content string |
 * | POST | `/api/prompt-templates/:id/clone` | Clone an existing template |
 * | POST | `/api/prompt-templates/bulk-delete` | Delete multiple templates |
 * | POST | `/api/prompt-templates/export` | Export templates to JSON |
 * | POST | `/api/prompt-templates/import` | Import templates from JSON |
 */

import {spaceCase} from 'case-anything';
import {promptTemplateService} from '@/services/prompt-template-service';
import {PromptTemplate} from '@/db';
import promptTemplates from '@/constants/prompt-templates';
import type {FastifyInstance} from 'fastify';
import type {TextContent} from '@/mcp/types';

const promptTemplatesRoutes = async (fastify: FastifyInstance): Promise<void> => {

  /**
   * GET /api/prompt-templates
   * List all prompt templates with optional category filter, search, and pagination.
   *
   * @changes 2026-02-20 - Added search query parameter. Added pagination (limit/offset). Enhanced response schema.
   */
  fastify.get<{
    Querystring: { category?: string; search?: string; limit?: string; offset?: string };
  }>(
    '/api/prompt-templates',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            category: {type: 'string', minLength: 1},
            search: {type: 'string', minLength: 1},
            limit: {type: 'string', pattern: '^[0-9]+$'},
            offset: {type: 'string', pattern: '^[0-9]+$'},
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              templates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {type: 'number'},
                    name: {type: 'string'},
                    displayName: {type: 'string'},
                    description: {type: 'string'},
                    content: {type: 'string'},
                    category: {type: 'string'},
                    isBuiltIn: {type: 'boolean'},
                    isDefault: {type: 'boolean'},
                    variables: {type: 'string'},
                    settings: {type: 'string', nullable: true},
                    createdAt: {type: 'string'},
                    updatedAt: {type: 'string'},
                  },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  limit: {type: 'number'},
                  offset: {type: 'number'},
                  total: {type: 'number'},
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {category, search, limit = '50', offset = '0'} = request.query;

      // Fetch all based on category
      let templates = await promptTemplateService.getByCategory(category);

      // Apply search filter if provided
      if (search) {
        const lowerSearch = search.toLowerCase();
        templates = templates.filter(t =>
          t.name.toLowerCase().includes(lowerSearch) ||
          t.displayName.toLowerCase().includes(lowerSearch) ||
          t.description.toLowerCase().includes(lowerSearch)
        );
      }

      // Apply pagination
      const total = templates.length;
      const startIndex = Math.max(0, parseInt(offset, 10));
      const endIndex = Math.min(total, startIndex + parseInt(limit, 10));
      const paginatedTemplates = templates.slice(startIndex, endIndex);

      return reply.send({
        templates: paginatedTemplates,
        meta: {
          limit: parseInt(limit, 10),
          offset: startIndex,
          total,
        },
      });
    },
  );

  /**
   * GET /api/prompt-templates/stats
   * Retrieves statistics about templates (counts by category, built-in vs custom).
   *
   * @changes 2026-02-20 - New endpoint added. Aggregates data for dashboard views.
   */
  fastify.get(
    '/api/prompt-templates/stats',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              total: {type: 'number'},
              builtIn: {type: 'number'},
              custom: {type: 'number'},
              categories: {
                type: 'object',
                additionalProperties: {type: 'number'},
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      // We fetch all to calculate stats. For very large DBs, this should be optimized via raw SQL queries.
      const allTemplates = await promptTemplateService.getByCategory();

      const stats = {
        total: allTemplates.length,
        builtIn: 0,
        custom: 0,
        categories: {} as Record<string, number>,
      };

      allTemplates.forEach(t => {
        if (t.isBuiltIn) {
          stats.builtIn++;
        } else {
          stats.custom++;
        }

        const cat = t.category || 'uncategorized';
        stats.categories[cat] = (stats.categories[cat] || 0) + 1;
      });

      return reply.send(stats);
    },
  );

  /**
   * GET /api/prompt-templates/:id
   * Get a single template by ID.
   *
   * @changes 2026-02-20 - Refined regex pattern for ID. Improved schema strictness.
   */
  fastify.get<{
    Params: { id: string; }
  }>(
    '/api/prompt-templates/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {type: 'string', pattern: '^[0-9]+$'},
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              template: {
                type: 'object',
                properties: {
                  id: {type: 'number'},
                  name: {type: 'string'},
                  displayName: {type: 'string'},
                  description: {type: 'string'},
                  content: {type: 'string'},
                  category: {type: 'string'},
                  isBuiltIn: {type: 'boolean'},
                  isDefault: {type: 'boolean'},
                  variables: {type: 'string'},
                  settings: {type: 'string', nullable: true},
                  createdAt: {type: 'string'},
                  updatedAt: {type: 'string'},
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);
      const template = await promptTemplateService.getById(id);
      if (!template) {
        return reply.code(404).send({error: 'Template not found'});
      }
      return reply.send({template});
    },
  );

  /**
   * GET /api/prompt-templates/name/:name
   * Get a template by its unique name/key.
   *
   * @changes 2026-02-20 - Added schema validation for name param.
   */
  fastify.get<{
    Params: { name: string; }
  }>(
    '/api/prompt-templates/name/:name',
    {
      schema: {
        params: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {type: 'string', minLength: 1, pattern: '^[a-zA-Z0-9_-]+$'},
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              template: {
                type: 'object',
                properties: {
                  id: {type: 'number'},
                  name: {type: 'string'},
                  displayName: {type: 'string'},
                  description: {type: 'string'},
                  content: {type: 'string'},
                  category: {type: 'string'},
                  isBuiltIn: {type: 'boolean'},
                  isDefault: {type: 'boolean'},
                  variables: {type: 'string'},
                  settings: {type: 'string', nullable: true},
                  createdAt: {type: 'string'},
                  updatedAt: {type: 'string'},
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const name = request.params.name;
      const template = await promptTemplateService.getByName(name);

      if (!template) {
        return reply.code(404).send({error: 'Template not found'});
      }
      return reply.send({template});
    },
  );

  /**
   * POST /api/prompt-templates
   * Create a new custom prompt template.
   *
   * @changes 2026-02-20 - Moved regex validation to JSON Schema. Added check to prevent reserved names.
   *                       Added stricter validation for category and content.
   */
  fastify.post<{
    Body: {
      name: string;
      displayName: string;
      description: string;
      content: string;
      category: string;
      variables?: Array<{ name: string; description: string; required?: boolean }>;
      settings?: Record<string, unknown>;
      isDefault?: boolean;
    }
  }>(
    '/api/prompt-templates',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'displayName', 'description', 'content', 'category'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              pattern: '^[a-z0-9_]+$',
            },
            displayName: {type: 'string', minLength: 1, maxLength: 255},
            description: {type: 'string', minLength: 1, maxLength: 1000},
            content: {type: 'string', minLength: 1},
            category: {type: 'string', minLength: 1},
            variables: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: {type: 'string'},
                  description: {type: 'string'},
                  required: {type: 'boolean'},
                },
              },
            },
            settings: {type: 'object', additionalProperties: true},
            isDefault: {type: 'boolean'},
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              status: {type: 'string'},
              template: {
                type: 'object',
                properties: {
                  id: {type: 'number'},
                  name: {type: 'string'},
                  displayName: {type: 'string'},
                  category: {type: 'string'},
                  isBuiltIn: {type: 'boolean'},
                  isDefault: {type: 'boolean'},
                  createdAt: {type: 'string'},
                  updatedAt: {type: 'string'},
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
          409: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;

      // Validation: Ensure name is not a reserved system keyword if applicable
      const reservedNames = ['system', 'default', 'generic'];
      if (reservedNames.includes(body.name)) {
        return reply.code(400).send({error: 'Template name is reserved'});
      }

      // Check for duplicate name
      const isUnique = await promptTemplateService.validateName(body.name);
      if (!isUnique) {
        return reply.code(409).send({error: `Template name '${body.name}' already exists`});
      }

      try {
        const template = await promptTemplateService.create({
          name: body.name,
          displayName: body.displayName,
          description: body.description,
          content: body.content,
          category: body.category,
          variables: body.variables,
          settings: body.settings,
          isDefault: body.isDefault,
        });

        return reply.code(201).send({
          status: 'created',
          template: {
            id: template.id,
            name: template.name,
            displayName: template.displayName,
            category: template.category,
            isBuiltIn: template.isBuiltIn,
            isDefault: template.isDefault,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
          },
        });
      } catch (err) {
        return reply.code(400).send({error: err instanceof Error ? err.message : String(err)});
      }
    },
  );

  /**
   * PUT /api/prompt-templates/:id
   * Update an existing template.
   *
   * @changes 2026-02-20 - Added logic to prevent updates to built-in templates.
   *                       Moved format validation to schema.
   */
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      displayName?: string;
      description?: string;
      content?: string;
      category?: string;
      variables?: Array<{ name: string; description: string; required?: boolean }>;
      settings?: Record<string, unknown>;
      isDefault?: boolean;
    };
  }>(
    '/api/prompt-templates/:id', {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {type: 'string', pattern: '^[0-9]+$'},
          },
        },
        body: {
          type: 'object',
          properties: {
            name: {type: 'string', minLength: 1, pattern: '^[a-z0-9_]+$'},
            displayName: {type: 'string', minLength: 1},
            description: {type: 'string', minLength: 1},
            content: {type: 'string', minLength: 1},
            category: {type: 'string', minLength: 1},
            variables: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {type: 'string'},
                  description: {type: 'string'},
                  required: {type: 'boolean'},
                },
              },
            },
            settings: {type: 'object', additionalProperties: true},
            isDefault: {type: 'boolean'},
          },
          minProperties: 1,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              status: {type: 'string'},
              template: {
                type: 'object',
                properties: {
                  id: {type: 'number'},
                  name: {type: 'string'},
                  displayName: {type: 'string'},
                  isBuiltIn: {type: 'boolean'},
                  isDefault: {type: 'boolean'},
                  updatedAt: {type: 'string'},
                },
              },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
          404: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
          409: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);
      const body = request.body;

      // Fetch existing to check built-in status
      const existing = await promptTemplateService.getById(id);
      if (!existing) {
        return reply.code(404).send({error: 'Template not found'});
      }
      if (existing.isBuiltIn) {
        return reply.code(403).send({error: 'Cannot update built-in templates'});
      }

      // If name is being updated, check uniqueness
      if (body && 'name' in body && body.name) {
        const isUnique = await promptTemplateService.validateName(body.name, id);
        if (!isUnique) {
          return reply.code(409).send({error: `Template name '${body.name}' already exists`});
        }
      }

      const template = await promptTemplateService.update(id, body);
      if (!template) {
        return reply.code(404).send({error: 'Template not found'});
      }

      return reply.send({
        status: 'updated',
        template: {
          id: template.id,
          name: template.name,
          displayName: template.displayName,
          category: template.category,
          isBuiltIn: template.isBuiltIn,
          isDefault: template.isDefault,
          updatedAt: template.updatedAt,
        },
      });
    });

  /**
   * DELETE /api/prompt-templates/:id
   * Delete a template (fails for built-in templates).
   *
   * @changes 2026-02-20 - Refined error handling and response codes.
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    '/api/prompt-templates/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {type: 'string', pattern: '^[0-9]+$'},
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              status: {type: 'string'},
              template: {
                type: 'object',
                properties: {
                  id: {type: 'number'},
                  name: {type: 'string'},
                },
              },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
          404: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);
      const existing = await promptTemplateService.getById(id);

      if (!existing) {
        return reply.code(404).send({error: 'Template not found'});
      }

      if (existing.isBuiltIn) {
        return reply.code(403).send({error: 'Built-in templates cannot be deleted'});
      }

      try {
        await promptTemplateService.delete(id);
        return reply.send({status: 'deleted'});
      } catch (err) {
        return reply.code(500).send({error: err instanceof Error ? err.message : 'Failed to delete template'});
      }
    },
  );

  /**
   * PATCH /api/prompt-templates/:id/default
   * Set a template as the default.
   *
   * @changes 2026-02-20 - Minor schema cleanup.
   */
  fastify.patch<{
    Params: { id: string };
  }>(
    '/api/prompt-templates/:id/default',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {type: 'string', pattern: '^[0-9]+$'},
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              status: {type: 'string'},
              template: {
                type: 'object',
                properties: {
                  id: {type: 'number'},
                  name: {type: 'string'},
                  displayName: {type: 'string'},
                  isDefault: {type: 'boolean'},
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      const template = await promptTemplateService.setDefault(id);
      if (!template) {
        return reply.code(404).send({error: 'Template not found'});
      }
      return reply.send({
        status: 'default set',
        template: {
          id: template.id,
          name: template.name,
          displayName: template.displayName,
          isDefault: template.isDefault,
        },
      });
    },
  );

  /**
   * PATCH /api/prompt-templates/rename-category
   * Renames a category across all templates (bulk update).
   *
   * @changes 2026-02-20 - New endpoint. Complex logic to update category field for multiple records.
   */
  fastify.patch<{
    Body: { oldName: string; newName: string };
  }>(
    '/api/prompt-templates/rename-category',
    {
      schema: {
        body: {
          type: 'object',
          required: ['oldName', 'newName'],
          properties: {
            oldName: {type: 'string', minLength: 1},
            newName: {type: 'string', minLength: 1},
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              status: {type: 'string'},
              count: {type: 'number'},
            },
          },
          400: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {oldName, newName} = request.body;

      if (oldName === newName) {
        return reply.code(400).send({error: 'Old and new category names cannot be the same'});
      }

      // Fetch templates in the old category
      // Note: Built-in templates technically shouldn't have their categories changed via this API
      // if they are immutable, but if they share the category name, we should update custom ones.
      const templates = await promptTemplateService.getByCategory(oldName);
      let updateCount = 0;

      // We need to update only custom templates usually, or check if the service allows updating built-in.
      // Assuming service.update enforces read-only for built-ins.
      for (const template of templates) {
        if (template.isBuiltIn) continue;

        try {
          await promptTemplateService.update(template.id, {category: newName});
          updateCount++;
        } catch (err) {
          // Log error but continue processing others
          fastify.log.error(`Failed to update template ${template.id}: ${err}`);
        }
      }

      return reply.send({
        status: 'category renamed',
        count: updateCount,
      });
    },
  );

  /**
   * GET /api/prompt-templates/categories
   * Get all unique categories.
   *
   * @changes 2026-02-20 - Improved logic to merge DB categories with hardcoded list cleanly.
   *                       Sorted results alphabetically.
   */
  fastify.get(
    '/api/prompt-templates/categories',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              categories: {
                type: 'array',
                items: {type: 'string'},
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const dbTemplates = await PromptTemplate.findAll({
        attributes: ['category'],
        group: ['category'],
        raw: true,
      });

      const dbCategories = dbTemplates
        .map((t: any) => t.category)
        .filter((c: any) => c && typeof c === 'string');

      const staticCategories = [
        'general',
        'code',
        'writing',
        'analysis',
        'creative',
        'business',
      ];

      const combinedSet = new Set([...dbCategories, ...staticCategories]);
      const categories = Array.from(combinedSet).sort();

      return reply.send({categories});
    },
  );

  /**
   * POST /api/prompt-templates/render
   * Render a template with variable values (dry run, doesn't modify DB).
   *
   * @changes 2026-02-20 - Improved schema definition for variables object.
   */
  fastify.post<{
    Body: {
      id: string;
      variables: Record<string, string>;
    };
  }>(
    '/api/prompt-templates/render',
    {
      schema: {
        body: {
          type: 'object',
          required: ['id', 'variables'],
          properties: {
            id: {type: 'string', pattern: '^[0-9]+$'},
            variables: {
              type: 'object',
              additionalProperties: {type: 'string'},
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              template: {
                type: 'object',
                properties: {
                  id: {type: 'number'},
                  name: {type: 'string'},
                  displayName: {type: 'string'},
                  content: {type: 'string'},
                },
              },
              renderedContent: {type: 'string'},
              variables: {
                type: 'object',
                additionalProperties: {type: 'string'},
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
          404: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const id = Number(body.id);
      const template = await promptTemplateService.getById(id);
      if (!template) {
        return reply.code(404)
          .send({error: 'Template not found'});
      }

      try {
        const result = await promptTemplateService.renderTemplate(template, body.variables);
        return reply.send({
          template: {
            id: template.id,
            name: template.name,
            displayName: template.displayName,
            content: template.content,
          },
          renderedContent: result.content,
          variables: result.variables,
        });
      } catch (err) {
        return reply.code(400)
          .send({error: err instanceof Error ? err.message : String(err)});
      }
    },
  );

  /**
   * POST /api/prompt-templates/validate
   * Validates a template's content and variables without saving to DB.
   *
   * @changes 2026-02-20 - New endpoint added for pre-save validation.
   */
  fastify.post<{
    Body: {
      content: string;
      variables?: Array<{ name: string; description: string; required?: boolean }>;
    };
  }>(
    '/api/prompt-templates/validate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: {type: 'string', minLength: 1},
            variables: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {type: 'string'},
                  description: {type: 'string'},
                  required: {type: 'boolean'},
                },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              valid: {type: 'boolean'},
              errors: {
                type: 'array',
                items: {type: 'string'},
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {content, variables} = request.body;
      const errors: string[] = [];

      const matches = content.match(/{{([^}]+)}}/g) || [];

      if (variables) {
        const varNames = new Set(variables.map(v => v.name));
        matches.forEach(match => {
          const name = match.replace(/{{|}}/g, '').trim();
          if (!varNames.has(name)) {
            errors.push(`Variable '${name}' used in content but not defined in variables list.`);
          }
        });

        variables.forEach(v => {
          if (v.required && !matches.some(m => m.includes(v.name))) {
            errors.push(`Required variable '${v.name}' is missing in content.`);
          }
        });
      }

      return reply.send({
        valid: errors.length === 0,
        errors,
      });
    },
  );

  /**
   * POST /api/prompt-templates/extract-variables
   * Analyzes content string and returns a list of detected variables.
   *
   * @changes 2026-02-20 - New endpoint added. Uses regex to find potential placeholders.
   */
  fastify.post<{
    Body: { content: string };
  }>(
    '/api/prompt-templates/extract-variables',
    {
      schema: {
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: {type: 'string'},
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              variables: {
                type: 'array',
                items: {type: 'string'},
              },
              count: {type: 'number'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {content} = request.body;

      // Simple regex for {{variable}} syntax
      const regex = /{{([^}]+)}}/g;
      const matches = new Set<string>();
      let match;

      while ((match = regex.exec(content)) !== null) {
        // match[1] is the content inside the braces
        matches.add(match[1].trim());
      }

      return reply.send({
        variables: Array.from(matches),
        count: matches.size,
      });
    },
  );

  /**
   * POST /api/prompt-templates/:id/clone
   * Clones an existing template creating a new custom one.
   *
   * @changes 2026-02-20 - New endpoint added for cloning templates.
   *                       Includes logic to handle name conflicts (appends _copy, _copy_2, etc).
   */
  fastify.post<{
    Params: { id: string };
    Body: { name?: string };
  }>(
    '/api/prompt-templates/:id/clone',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {type: 'string', pattern: '^[0-9]+$'},
          },
        },
        body: {
          type: 'object',
          properties: {
            name: {type: 'string', minLength: 1, pattern: '^[a-z0-9_]+$'},
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              status: {type: 'string'},
              template: {
                type: 'object',
                properties: {
                  id: {type: 'number'},
                  name: {type: 'string'},
                  displayName: {type: 'string'},
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: {type: 'string'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);
      const sourceTemplate = await promptTemplateService.getById(id);

      if (!sourceTemplate) {
        return reply.code(404).send({error: 'Source template not found'});
      }

      let newName = request.body.name;

      if (!newName) {
        let counter = 1;
        let baseName = `${sourceTemplate.name}_copy`;
        newName = baseName;

        while (true) {
          const exists = await promptTemplateService.validateName(newName);
          if (exists) break;
          newName = `${baseName}_${counter}`;
          counter++;

          if (counter > 1000) {
            return reply.code(500).send({error: 'Could not generate unique name'});
          }
        }
      } else {
        const isUnique = await promptTemplateService.validateName(newName);
        if (!isUnique) {
          return reply.code(409).send({error: `Template name '${newName}' already exists`});
        }
      }

      try {
        const newTemplate = await promptTemplateService.create({
          name: newName,
          displayName: `${sourceTemplate.displayName} (Copy)`,
          description: sourceTemplate.description,
          content: sourceTemplate.content,
          category: sourceTemplate.category,
          variables: JSON.parse(sourceTemplate.variables || '{}'),
          settings: JSON.parse(sourceTemplate.settings || '{}'),
          isDefault: false,
        });

        return reply.code(201).send({
          status: 'cloned',
          template: {
            id: newTemplate.id,
            name: newTemplate.name,
            displayName: newTemplate.displayName,
          },
        });
      } catch (err) {
        return reply.code(400).send({error: err instanceof Error ? err.message : String(err)});
      }
    },
  );

  /**
   * POST /api/prompt-templates/bulk-delete
   * Deletes multiple templates.
   *
   * @changes 2026-02-20 - New endpoint for bulk deletion.
   *                       Skips built-in templates and reports partial failures.
   */
  fastify.post<{
    Body: { ids: string[] };
  }>(
    '/api/prompt-templates/bulk-delete',
    {
      schema: {
        body: {
          type: 'object',
          required: ['ids'],
          properties: {
            ids: {
              type: 'array',
              items: {type: 'string', pattern: '^[0-9]+$'},
              minItems: 1,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              status: {type: 'string'},
              deleted: {type: 'number'},
              skipped: {type: 'number'},
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {type: 'number'},
                    error: {type: 'string'},
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {ids} = request.body;
      let deletedCount = 0;
      let skippedCount = 0;
      const errors: { id: number; error: string }[] = [];

      for (const idStr of ids) {
        const id = Number(idStr);
        try {
          const template = await promptTemplateService.getById(id);
          if (!template) {
            skippedCount++;
            continue;
          }
          if (template.isBuiltIn) {
            skippedCount++;
            continue;
          }
          await promptTemplateService.delete(id);
          deletedCount++;
        } catch (err) {
          errors.push({
            id,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      return reply.send({
        status: 'completed',
        deleted: deletedCount,
        skipped: skippedCount,
        errors,
      });
    },
  );

  /**
   * POST /api/prompt-templates/export
   * Exports custom templates to a JSON format.
   *
   * @changes 2026-02-20 - New endpoint for backup purposes.
   */
  fastify.post<{
    Body: { ids?: string[] };
  }>(
    '/api/prompt-templates/export',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: {type: 'string', pattern: '^[0-9]+$'},
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              exportedAt: {type: 'string', format: 'date-time'},
              count: {type: 'number'},
              templates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: {type: 'string'},
                    displayName: {type: 'string'},
                    description: {type: 'string'},
                    content: {type: 'string'},
                    category: {type: 'string'},
                    variables: {type: 'string'},
                    settings: {type: 'string', nullable: true},
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {ids} = request.body;
      let templates = await promptTemplateService.getByCategory();

      // Filter out built-in templates (usually we only export custom user data)
      templates = templates.filter(t => !t.isBuiltIn);

      if (ids && ids.length > 0) {
        const idSet = new Set(ids.map(Number));
        templates = templates.filter(t => t.id && idSet.has(t.id));
      }

      // Strip internal fields like id, timestamps, isBuiltIn
      const cleanTemplates = templates.map(({id, createdAt, updatedAt, isBuiltIn, ...rest}) => rest);

      return reply.send({
        exportedAt: new Date().toISOString(),
        count: cleanTemplates.length,
        templates: cleanTemplates,
      });
    },
  );

  /**
   * POST /api/prompt-templates/import
   * Imports templates from JSON.
   *
   * @changes 2026-02-20 - New endpoint for migration/restore. Supports conflict resolution strategies.
   */
  fastify.post<{
    Body: {
      templates: Array<{
        name: string;
        displayName: string;
        description: string;
        content: string;
        category: string;
        variables?: any;
        settings?: any;
      }>;
      strategy: 'skip' | 'overwrite' | 'rename';
    };
  }>(
    '/api/prompt-templates/import',
    {
      schema: {
        body: {
          type: 'object',
          required: ['templates'],
          properties: {
            templates: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'displayName', 'description', 'content', 'category'],
                properties: {
                  name: {type: 'string'},
                  displayName: {type: 'string'},
                  description: {type: 'string'},
                  content: {type: 'string'},
                  category: {type: 'string'},
                  variables: {type: 'string'}, // Passed as JSON string from service usually
                  settings: {type: 'string'},
                },
              },
            },
            strategy: {type: 'string', enum: ['skip', 'overwrite', 'rename'], default: 'rename'},
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              status: {type: 'string'},
              imported: {type: 'number'},
              skipped: {type: 'number'},
              failed: {type: 'number'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {templates, strategy = 'rename'} = request.body;
      let imported = 0;
      let skipped = 0;
      let failed = 0;

      for (const tpl of templates) {
        try {
          const existing = await promptTemplateService.getByName(tpl.name);

          if (existing) {
            if (strategy === 'skip') {
              skipped++;
              continue;
            }

            if (strategy === 'overwrite' && existing.isBuiltIn) {
              failed++; // Cannot overwrite built-in
              continue;
            }

            if (strategy === 'overwrite') {
              await promptTemplateService.update(existing.id, tpl);
              imported++;
              continue;
            }

            if (strategy === 'rename') {
              // Generate unique name
              let counter = 1;
              let newName = `${tpl.name}_import`;
              while (!await promptTemplateService.validateName(newName)) {
                newName = `${tpl.name}_import_${counter}`;
                counter++;
              }
              await promptTemplateService.create({...tpl, name: newName});
              imported++;
            }
          } else {
            // New template
            await promptTemplateService.create(tpl);
            imported++;
          }
        } catch (err) {
          failed++;
          fastify.log.error(`Import failed for ${tpl.name}: ${err}`);
        }
      }

      return reply.send({
        status: 'completed',
        imported,
        skipped,
        failed,
      });
    },
  );

  /**
   * GET /api/prompt-templates/samples
   * Get the list of sample prompt templates defined in the constants file.
   *
   * @changes 2026-02-20 - Improved performance using Promise.all for parallel execution.
   *                       Refined type safety for text content extraction.
   */
  fastify.get(
    '/api/prompt-templates/samples',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              templates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: {type: 'string'},
                    displayName: {type: 'string'},
                    description: {type: 'string'},
                    content: {type: 'string'},
                    variables: {type: 'string'},
                  },
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const templates = await Promise.all(
        promptTemplates.map(async (template) => {
          const displayName = spaceCase(template.name).replaceAll('_', ' ');
          const args = template.arguments?.reduce?.((accum, current) => {
            accum[current.name] = `{{${current.name}}}`;
            return accum;
          }, {} as Record<string, string>) ?? {};

          try {
            const result = await template.handler(args);
            const textContent = (result.messages[0].content as TextContent)?.text || '';

            return {
              name: template.name,
              displayName: displayName[0].toUpperCase() + displayName.slice(1),
              description: template.description,
              content: textContent,
              variables: JSON.stringify(template.arguments),
            };
          } catch (e) {
            return {
              name: template.name,
              displayName: displayName[0].toUpperCase() + displayName.slice(1),
              description: template.description,
              content: '[Error generating sample]',
              variables: JSON.stringify(template.arguments),
            };
          }
        })
      );

      return reply.send({templates});
    },
  );
};

export default promptTemplatesRoutes;
