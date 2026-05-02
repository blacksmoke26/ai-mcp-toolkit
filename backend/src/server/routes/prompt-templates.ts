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
 *
 * ## Routes
 *
 * | Method | Path | Description |
 * |--------|------|---------|
 * | GET | `/api/prompt-templates` | List all templates |
 * | GET | `/api/prompt-templates/:id` | Get template by ID |
 * | GET | `/api/prompt-templates/name/:name` | Get template by name |
 * | POST | `/api/prompt-templates` | Create new template |
 * | PUT | `/api/prompt-templates/:id` | Update template |
 * | DELETE | `/api/prompt-templates/:id` | Delete template |
 * | PATCH | `/api/prompt-templates/:id/default` | Set as default |
 * | GET | `/api/prompt-templates/categories` | List categories |
 * | POST | `/api/prompt-templates/render` | Render template (dry run) |
 */

import {FastifyInstance} from 'fastify';
import {promptTemplateService} from '@/services/prompt-template-service';
import {PromptTemplate} from '@/db';

const promptTemplatesRoutes = async (fastify: FastifyInstance): Promise<void> => {

  /**
   * GET /api/prompt-templates
   * List all prompt templates with optional category filter.
   *
   * Query Parameters:
   * - category (optional): Filter by category
   */
  fastify.get<{
    Querystring: { category?: string };
  }>(
    '/api/prompt-templates',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            category: {type: 'string', minLength: 1},
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
      const {category} = request.query;
      const templates = await promptTemplateService.getByCategory(category);
      return reply.send({templates});
    },
  );

  /**
   * GET /api/prompt-templates/:id
   * Get a single template by ID.
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
            name: {type: 'string', minLength: 1},
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
            settings: {type: 'object'},
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

      // Validate name format
      if (!/^[a-z0-9_]+$/.test(body.name)) {
        return reply.code(400).send({error: 'Name must contain only lowercase letters, numbers, and underscores'});
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
            name: {type: 'string', minLength: 1},
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
            settings: {type: 'object'},
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

      // If name is being updated, check uniqueness
      if (body && 'name' in body && body.name) {
        if (!/^[a-z0-9_]+$/.test(body.name)) {
          return reply.code(400).send({error: 'Name must contain only lowercase letters, numbers, and underscores'});
        }
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
      try {
        const deleted = await promptTemplateService.delete(id);
        if (!deleted) {
          return reply.code(404).send({error: 'Template not found'});
        }
        return reply.send({status: 'deleted'});
      } catch (err) {
        if (err instanceof Error && err.message.includes('Cannot delete built-in')) {
          return reply.code(403).send({error: 'Built-in templates cannot be deleted'});
        }
        return reply.code(404).send({error: err instanceof Error ? err.message : String(err)});
      }
    },
  );

  /**
   * PATCH /api/prompt-templates/:id/default template as the default.
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
   * GET /api/prompt-templates/categories
   * Get all unique categories.
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
      const templates = await PromptTemplate.findAll({
        attributes: ['category'],
        group: ['category'],
      });
      const categories = templates.map((t) => t.category).filter(Boolean);
      return reply.send({categories});
    },
  );

  /**
   * POST /api/prompt-templates/render
   * Render a template with variable values (dry run, doesn't modify DB).
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
    },
    async (request, reply) => {
      const body = request.body;
      const id = Number(body.id);
      const template = await promptTemplateService.getById(id);
      if (!template) {
        return reply.code(404)
          .send({ error: 'Template not found' });
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
          .send({ error: err instanceof Error ? err.message : String(err) });
      }
    },
  );
};

export default promptTemplatesRoutes;
