/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import type {RegisteredPrompt} from '@/mcp/prompts/registry';

const promptTemplates: RegisteredPrompt[] = [
  {
    name: 'code_review',
    description: 'Generate a code review prompt with context about the code to review',
    arguments: [
      {name: 'language', description: 'Programming language', required: true},
      {name: 'code', description: 'The code to review', required: true},
      {name: 'focus', description: 'Areas to focus on (e.g., "security", "performance", "readability")'},
    ],
    async handler(args) {
      return {
        description: 'Code review assistant prompt',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `You are an expert code reviewer specializing in ${args.language}.`,
              '',
              `Please review the following ${args.language} code${args.focus ? `, focusing on ${args.focus}` : ''}:`,
              '',
              '```' + args.language,
              args.code,
              '```',
              '',
              'Provide a structured review with:',
              '1. Summary of what the code does',
              '2. Issues found (with severity levels)',
              '3. Suggestions for improvement',
              '4. Security concerns (if any)',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'explain_concept',
    description: 'Generate a prompt for explaining a technical concept',
    arguments: [
      {name: 'concept', description: 'The concept to explain', required: true},
      {name: 'audience', description: 'Target audience level (beginner, intermediate, expert)'},
      {name: 'context', description: 'Additional context or domain'},
    ],
    async handler(args) {
      return {
        description: 'Concept explanation prompt',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Please explain the concept of "${args.concept}"`,
              args.audience ? `for a ${args.audience} audience` : 'in a clear and comprehensive way',
              args.context ? `in the context of ${args.context}` : '',
              '.',
              '',
              'Include:',
              '1. A simple definition',
              '2. How it works (with analogies if helpful)',
              '3. Practical examples',
              '4. Common misconceptions',
            ].join(' '),
          },
        }],
      };
    },
  },
  {
    name: 'write_unit_tests',
    description: 'Generate unit tests for a given code snippet',
    arguments: [
      {name: 'code', description: 'The code to test', required: true},
      {name: 'framework', description: 'Testing framework (e.g., Jest, PyTest, JUnit)'},
      {name: 'language', description: 'Programming language', required: true},
    ],
    async handler(args) {
      return {
        description: 'Unit test generation prompt',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write comprehensive unit tests for the following ${args.language} code`,
              args.framework ? `using the ${args.framework} framework` : '',
              '.',
              '',
              '```' + args.language,
              args.code,
              '```',
              '',
              'Ensure the tests cover:',
              '1. Happy paths',
              '2. Edge cases',
              '3. Error handling',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'refactor_code',
    description: 'Suggest refactoring for code to improve quality',
    arguments: [
      {name: 'code', description: 'The code to refactor', required: true},
      {name: 'goals', description: 'Refactoring goals (e.g., "reduce complexity", "improve naming")'},
      {name: 'language', description: 'Programming language', required: true},
    ],
    async handler(args) {
      return {
        description: 'Code refactoring prompt',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Refactor the following ${args.language} code.`,
              args.goals ? `Focus on: ${args.goals}.` : 'Focus on general best practices, readability, and performance.',
              '',
              '```' + args.language,
              args.code,
              '```',
              '',
              'Provide the refactored code and explain the changes made.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'generate_api_docs',
    description: 'Generate API documentation from code or a description',
    arguments: [
      {name: 'input', description: 'Code snippet or API description', required: true},
      {name: 'format', description: 'Output format (e.g., Swagger, Markdown)'},
    ],
    async handler(args) {
      return {
        description: 'API documentation generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Generate API documentation for the following input:',
              args.format ? `Format the output as ${args.format}.` : '',
              '',
              'Input:',
              args.input,
              '',
              'Include endpoints, parameters, request/response bodies, and status codes.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'debug_error',
    description: 'Analyze an error message and stack trace to suggest fixes',
    arguments: [
      {name: 'error', description: 'The error message', required: true},
      {name: 'stack_trace', description: 'The stack trace (if available)'},
      {name: 'code', description: 'Code where the error occurred'},
    ],
    async handler(args) {
      return {
        description: 'Debugging assistant',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'I am encountering the following error:',
              `Error: ${args.error}`,
              args.stack_trace ? `Stack Trace:\n${args.stack_trace}` : '',
              args.code ? `Code Context:\n${args.code}` : '',
              '',
              'Analyze the root cause and provide specific steps to fix it.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'convert_language',
    description: 'Convert code from one programming language to another',
    arguments: [
      {name: 'code', description: 'Source code', required: true},
      {name: 'source_lang', description: 'Source language', required: true},
      {name: 'target_lang', description: 'Target language', required: true},
    ],
    async handler(args) {
      return {
        description: 'Language converter',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Convert the following ${args.source_lang} code to ${args.target_lang}.`,
              '',
              '```' + args.source_lang,
              args.code,
              '```',
              '',
              'Ensure the code follows the idioms and best practices of the target language.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'design_schema',
    description: 'Design a database schema for a given scenario',
    arguments: [
      {name: 'scenario', description: 'Description of the application/data requirements', required: true},
      {name: 'db_type', description: 'Database type (SQL, NoSQL, Graph)'},
    ],
    async handler(args) {
      return {
        description: 'Database schema designer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Design a database schema ${args.db_type ? `for a ${args.db_type} database` : ''} for the following scenario:`,
              args.scenario,
              '',
              'Provide tables/collections, fields, relationships, and indices.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'optimize_sql',
    description: 'Optimize a SQL query for better performance',
    arguments: [
      {name: 'query', description: 'The SQL query', required: true},
      {name: 'schema', description: 'Relevant table schema'},
    ],
    async handler(args) {
      return {
        description: 'SQL optimization prompt',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Optimize the following SQL query for performance:',
              args.schema ? `Schema:\n${args.schema}\n` : '',
              'Query:',
              args.query,
              '',
              'Explain your changes and suggest any necessary indexes.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'write_commit_message',
    description: 'Generate a conventional commit message',
    arguments: [
      {name: 'diff', description: 'Git diff output', required: true},
      {name: 'context', description: 'Context about the changes'},
    ],
    async handler(args) {
      return {
        description: 'Commit message generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Write a clear Conventional Commit message for the following changes:',
              args.context ? `Context: ${args.context}\n` : '',
              'Diff:',
              '```',
              args.diff,
              '```',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'create_cli_help',
    description: 'Generate help text for a CLI command',
    arguments: [
      {name: 'command', description: 'Name of the command', required: true},
      {name: 'functionality', description: 'Description of what the command does', required: true},
      {name: 'options', description: 'List of options/flags'},
    ],
    async handler(args) {
      return {
        description: 'CLI help text generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Generate a standard help text output for a CLI command named "${args.command}".`,
              `Functionality: ${args.functionality}`,
              args.options ? `Options: ${args.options}` : '',
              '',
              'Include usage examples and descriptions.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'generate_regex',
    description: 'Generate a regular expression for a specific pattern',
    arguments: [
      {name: 'description', description: 'Description of the pattern to match', required: true},
      {name: 'language', description: 'Language/Engine specific syntax (e.g., Python, JS)'},
    ],
    async handler(args) {
      return {
        description: 'Regex generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Generate a regular expression ${args.language ? `for ${args.language}` : ''} that matches: ${args.description}`,
              '',
              'Provide the regex pattern and a breakdown of how it works.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'dockerfile_best_practices',
    description: 'Review or generate a Dockerfile following best practices',
    arguments: [
      {name: 'dockerfile', description: 'Existing Dockerfile content'},
      {name: 'app_type', description: 'Type of application (e.g., Node.js, Python, Go)'},
    ],
    async handler(args) {
      return {
        description: 'Dockerfile optimization',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              args.dockerfile
                ? `Review the following Dockerfile for a ${args.app_type || 'generic'} application and suggest improvements for security and size.`
                : `Generate a production-ready Dockerfile for a ${args.app_type} application following best practices.`,
              '',
              args.dockerfile ? `Dockerfile:\n${args.dockerfile}` : '',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'k8s_deployment',
    description: 'Generate a Kubernetes Deployment manifest',
    arguments: [
      {name: 'app_name', description: 'Name of the application', required: true},
      {name: 'image', description: 'Docker image name', required: true},
      {name: 'port', description: 'Container port'},
      {name: 'replicas', description: 'Number of replicas'},
    ],
    async handler(args) {
      return {
        description: 'K8s Deployment generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Generate a Kubernetes Deployment YAML manifest.',
              `App Name: ${args.app_name}`,
              `Image: ${args.image}`,
              args.port ? `Port: ${args.port}` : '',
              args.replicas ? `Replicas: ${args.replicas}` : '',
              '',
              'Include liveness and readiness probes.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'terraform_plan',
    description: 'Generate Terraform configuration (HCL) for a resource',
    arguments: [
      {name: 'resource', description: 'The cloud resource to create (e.g., AWS S3 bucket)', required: true},
      {name: 'attributes', description: 'Key attributes and configuration'},
    ],
    async handler(args) {
      return {
        description: 'Terraform generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write Terraform HCL code to create a ${args.resource}.`,
              args.attributes ? `Configuration details: ${args.attributes}` : '',
              '',
              'Follow best practices for variables and outputs.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'ci_cd_config',
    description: 'Generate a CI/CD pipeline configuration',
    arguments: [
      {name: 'platform', description: 'CI/CD Platform (GitHub Actions, GitLab CI, Jenkins)', required: true},
      {name: 'steps', description: 'List of steps required in the pipeline'},
      {name: 'language', description: 'Programming language'},
    ],
    async handler(args) {
      return {
        description: 'CI/CD pipeline generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Generate a ${args.platform} configuration file.`,
              `Project Language: ${args.language || 'Generic'}`,
              args.steps ? `Steps: ${args.steps}` : 'The pipeline should include lint, test, and build stages.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'ansible_playbook',
    description: 'Generate an Ansible playbook for a system task',
    arguments: [
      {name: 'task', description: 'The task to automate (e.g., install Docker)', required: true},
      {name: 'os', description: 'Target Operating System'},
    ],
    async handler(args) {
      return {
        description: 'Ansible playbook generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create an Ansible playbook to ${args.task}.`,
              args.os ? `Target OS: ${args.os}` : '',
              '',
              'Ensure idempotency and proper error handling.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'blog_post_outline',
    description: 'Create a structured outline for a blog post',
    arguments: [
      {name: 'topic', description: 'Topic of the blog post', required: true},
      {name: 'tone', description: 'Tone of the article (e.g., informative, humorous)'},
      {name: 'keywords', description: 'SEO keywords to include'},
    ],
    async handler(args) {
      return {
        description: 'Blog post outliner',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create a detailed outline for a blog post about "${args.topic}".`,
              args.tone ? `Tone: ${args.tone}` : '',
              args.keywords ? `Keywords: ${args.keywords}` : '',
              '',
              'Include H2 headers, bullet points for key sections, and a call to action.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'social_media_post',
    description: 'Generate engaging social media content',
    arguments: [
      {name: 'platform', description: 'Platform (LinkedIn, Twitter, Instagram)', required: true},
      {name: 'topic', description: 'Topic to discuss', required: true},
      {name: 'style', description: 'Style (professional, casual, viral)'},
    ],
    async handler(args) {
      return {
        description: 'Social media content generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write a ${args.style || 'engaging'} social media post for ${args.platform} about ${args.topic}.`,
              '',
              'Optimize for the platform\'s algorithm and character limits. Include relevant hashtags.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'email_drafter',
    description: 'Draft a professional email',
    arguments: [
      {name: 'recipient', description: 'Who is the email for?', required: true},
      {name: 'purpose', description: 'The goal of the email', required: true},
      {name: 'tone', description: 'Tone (formal, polite, urgent)'},
    ],
    async handler(args) {
      return {
        description: 'Email drafter',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Draft an email to a ${args.recipient}.`,
              `Purpose: ${args.purpose}`,
              `Tone: ${args.tone || 'Professional'}`,
              '',
              'Include a clear subject line and the body text.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'product_description',
    description: 'Write a persuasive product description',
    arguments: [
      {name: 'product', description: 'Name of the product', required: true},
      {name: 'features', description: 'List of key features'},
      {name: 'audience', description: 'Target audience'},
    ],
    async handler(args) {
      return {
        description: 'Product description copywriter',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write a compelling product description for ${args.product}.`,
              args.audience ? `Target Audience: ${args.audience}` : '',
              args.features ? `Key Features: ${args.features}` : '',
              '',
              'Focus on benefits over features. Include a strong closing sentence.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'headline_generator',
    description: 'Generate catchy headlines for articles or ads',
    arguments: [
      {name: 'topic', description: 'The subject', required: true},
      {name: 'type', description: 'Type (Blog, Ad, Newsletter)'},
    ],
    async handler(args) {
      return {
        description: 'Headline generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Generate 10 catchy headlines for a ${args.type || 'Blog'} about: ${args.topic}`,
              '',
              'Use proven copywriting frameworks (e.g., How-to, Lists, Questions).',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'summarize_text',
    description: 'Summarize a long text',
    arguments: [
      {name: 'text', description: 'The text to summarize', required: true},
      {name: 'length', description: 'Summary length (brief, detailed, bullet points)'},
    ],
    async handler(args) {
      return {
        description: 'Text summarizer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Provide a ${args.length || 'brief'} summary of the following text:`,
              '',
              args.text,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'paraphrase_text',
    description: 'Rewrite text to avoid plagiarism or improve flow',
    arguments: [
      {name: 'text', description: 'Text to rewrite', required: true},
      {name: 'style', description: 'Style (academic, simple, business)'},
    ],
    async handler(args) {
      return {
        description: 'Paraphrasing tool',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Paraphrase the following text in a ${args.style || 'neutral'} style. Keep the original meaning but change the vocabulary and structure.`,
              '',
              args.text,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'translate_text',
    description: 'Translate text to another language',
    arguments: [
      {name: 'text', description: 'Text to translate', required: true},
      {name: 'target_lang', description: 'Target language', required: true},
    ],
    async handler(args) {
      return {
        description: 'Translator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Translate the following text into ${args.target_lang}.`,
              '',
              args.text,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'swot_analysis',
    description: 'Perform a SWOT analysis for a business idea',
    arguments: [
      {name: 'idea', description: 'Business or project idea', required: true},
      {name: 'context', description: 'Industry or market context'},
    ],
    async handler(args) {
      return {
        description: 'SWOT analysis generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Perform a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for the following idea:`,
              args.idea,
              args.context ? `Context: ${args.context}` : '',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'user_story_creation',
    description: 'Write Agile user stories',
    arguments: [
      {name: 'feature', description: 'The feature to build', required: true},
      {name: 'role', description: 'User persona'},
    ],
    async handler(args) {
      return {
        description: 'User story generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write Agile user stories for the feature: ${args.feature}`,
              args.role ? `User Role: ${args.role}` : '',
              '',
              'Use the format: "As a [type of user], I want [goal] so that [benefit]." Include acceptance criteria.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'competitor_analysis',
    description: 'Analyze competitors in a specific niche',
    arguments: [
      {name: 'niche', description: 'Market niche', required: true},
      {name: 'competitors', description: 'Specific competitor names (optional)'},
    ],
    async handler(args) {
      return {
        description: 'Competitor analysis prompt',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Perform a competitor analysis for the ${args.niche} market.`,
              args.competitors ? `Focus on: ${args.competitors}` : 'Identify major players and analyze them generally.',
              '',
              'Compare pricing, features, and marketing strategies.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'meeting_minutes',
    description: 'Format meeting notes into professional minutes',
    arguments: [
      {name: 'notes', description: 'Raw meeting notes', required: true},
      {name: 'attendees', description: 'List of attendees'},
    ],
    async handler(args) {
      return {
        description: 'Meeting minutes formatter',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Convert the following raw notes into professional meeting minutes.',
              args.attendees ? `Attendees: ${args.attendees}` : '',
              '',
              'Include sections for: Attendees, Agenda, Discussion Points, Action Items, Next Meeting.',
              '',
              'Notes:',
              args.notes,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'okr_planning',
    description: 'Define Objectives and Key Results (OKRs)',
    arguments: [
      {name: 'goal', description: 'High level goal', required: true},
      {name: 'timeframe', description: 'Quarterly or Annual'},
    ],
    async handler(args) {
      return {
        description: 'OKR planner',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Help me define OKRs for the following goal: ${args.goal}`,
              args.timeframe ? `Timeframe: ${args.timeframe}` : '',
              '',
              'Provide 3-5 Objectives, each with 3-4 measurable Key Results.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'risk_assessment',
    description: 'Identify risks for a project',
    arguments: [
      {name: 'project', description: 'Project description', required: true},
      {name: 'category', description: 'Category (Financial, Technical, Security)'},
    ],
    async handler(args) {
      return {
        description: 'Risk assessment generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Identify potential risks for the following project: ${args.project}`,
              args.category ? `Focus on ${args.category} risks.` : '',
              '',
              'List risks, their likelihood, impact, and potential mitigation strategies.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'elevator_pitch',
    description: 'Create a short elevator pitch',
    arguments: [
      {name: 'subject', description: 'Product, service, or self', required: true},
      {name: 'audience', description: 'Target audience (Investors, Customers)'},
    ],
    async handler(args) {
      return {
        description: 'Elevator pitch generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write a 30-second elevator pitch for: ${args.subject}`,
              args.audience ? `Target Audience: ${args.audience}` : '',
              '',
              'Make it punchy, clear, and memorable.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'csv_analyzer',
    description: 'Analyze CSV data structure and insights',
    arguments: [
      {name: 'headers', description: 'CSV headers', required: true},
      {name: 'sample_rows', description: 'Sample data rows'},
    ],
    async handler(args) {
      return {
        description: 'CSV analysis prompt',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Analyze the following CSV data structure.',
              'Headers: ' + args.headers,
              args.sample_rows ? 'Sample Rows:\n' + args.sample_rows : '',
              '',
              'Suggest potential data analysis queries, data types, and possible cleaning issues.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'chart_suggestion',
    description: 'Suggest the best chart type for data',
    arguments: [
      {name: 'data_desc', description: 'Description of the data', required: true},
      {name: 'goal', description: 'What we want to show (trend, comparison, distribution)'},
    ],
    async handler(args) {
      return {
        description: 'Data visualization advisor',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `I have data that ${args.data_desc}.`,
              args.goal ? `I want to visualize ${args.goal}.` : '',
              '',
              'Suggest the best chart types (e.g., Bar, Line, Scatter) and explain why.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'data_cleaning_strategy',
    description: 'Create a plan to clean a messy dataset',
    arguments: [
      {name: 'issues', description: 'Description of data quality issues', required: true},
      {name: 'format', description: 'Data format (CSV, JSON, SQL)'},
    ],
    async handler(args) {
      return {
        description: 'Data cleaning strategy',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `I have a ${args.format || 'dataset'} with the following issues: ${args.issues}`,
              '',
              'Propose a step-by-step strategy to clean this data using Python/Pandas or SQL.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'sql_query_generator',
    description: 'Generate SQL from natural language',
    arguments: [
      {name: 'question', description: 'Natural language question about data', required: true},
      {name: 'schema', description: 'Database schema context'},
    ],
    async handler(args) {
      return {
        description: 'Text-to-SQL generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Convert the following natural language request into a SQL query.',
              args.schema ? `Schema Context: ${args.schema}` : '',
              '',
              `Request: ${args.question}`,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'quiz_generator',
    description: 'Generate a quiz on a specific topic',
    arguments: [
      {name: 'topic', description: 'Quiz topic', required: true},
      {name: 'count', description: 'Number of questions'},
      {name: 'difficulty', description: 'Difficulty level'},
    ],
    async handler(args) {
      return {
        description: 'Quiz creator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Generate a ${args.difficulty || 'mixed'} difficulty quiz about ${args.topic}.`,
              args.count ? `Number of questions: ${args.count}` : 'Generate 5 questions.',
              '',
              'Include multiple choice options and the correct answer key at the end.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'study_plan',
    description: 'Create a study plan for learning a skill',
    arguments: [
      {name: 'skill', description: 'Skill to learn', required: true},
      {name: 'duration', description: 'Duration (e.g., 4 weeks)'},
      {name: 'level', description: 'Current level (Beginner)'},
    ],
    async handler(args) {
      return {
        description: 'Study plan generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create a study plan to learn ${args.skill}.`,
              `Current Level: ${args.level || 'Beginner'}`,
              `Duration: ${args.duration || 'Self-paced'}`,
              '',
              'Break it down into weekly goals with resources and practice tasks.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'flashcards',
    description: 'Generate flashcards for memorization',
    arguments: [
      {name: 'topic', description: 'Topic', required: true},
      {name: 'count', description: 'Number of cards'},
    ],
    async handler(args) {
      return {
        description: 'Flashcard generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create ${args.count || 10} flashcards for studying ${args.topic}.`,
              '',
              'Format as "Front: [Question/Term] | Back: [Answer/Definition]".',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'analogy_generator',
    description: 'Explain complex topics using analogies',
    arguments: [
      {name: 'topic', description: 'Complex topic', required: true},
      {name: 'audience', description: 'Audience type (e.g., 5-year-old)'},
    ],
    async handler(args) {
      return {
        description: 'Analogy explainer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Explain "${args.topic}" using a simple analogy.`,
              args.audience ? `Target audience: ${args.audience}` : '',
              '',
              'Ensure the analogy captures the core mechanics of the concept.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'socratic_tutor',
    description: 'Generate questions to guide learning (Socratic method)',
    arguments: [
      {name: 'problem', description: 'The problem or subject', required: true},
    ],
    async handler(args) {
      return {
        description: 'Socratic tutor',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `I am trying to understand/ solve: ${args.problem}`,
              '',
              'Act as a Socratic tutor. Do not give me the answer. Instead, ask me a series of guiding questions that help me figure it out myself.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'security_audit',
    description: 'Scan code for security vulnerabilities',
    arguments: [
      {name: 'code', description: 'The code to audit', required: true},
      {name: 'language', description: 'Programming language'},
    ],
    async handler(args) {
      return {
        description: 'Security auditor',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Perform a security audit on the following ${args.language || 'code'}.`,
              '',
              '```',
              args.code,
              '```',
              '',
              'Look for SQL injection, XSS, hardcoded secrets, and authentication issues.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'password_policy',
    description: 'Define a password policy for an organization',
    arguments: [
      {name: 'context', description: 'Type of application/system', required: true},
      {name: 'compliance', description: 'Compliance standards (GDPR, HIPAA)'},
    ],
    async handler(args) {
      return {
        description: 'Password policy generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Draft a password policy for a ${args.context} system.`,
              args.compliance ? `Must adhere to ${args.compliance} standards.` : '',
              '',
              'Specify length, character requirements, rotation, and locking mechanisms.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'incident_response',
    description: 'Generate an incident response plan',
    arguments: [
      {name: 'incident_type', description: 'Type of incident (e.g., Data Breach, DDoS)', required: true},
    ],
    async handler(args) {
      return {
        description: 'Incident response planner',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create an incident response plan checklist for a ${args.incident_type}.`,
              '',
              'Structure it into phases: Detection, Containment, Eradication, Recovery, and Post-Incident Analysis.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'story_starter',
    description: 'Generate a writing prompt to start a story',
    arguments: [
      {name: 'genre', description: 'Story genre', required: true},
      {name: 'theme', description: 'Central theme'},
    ],
    async handler(args) {
      return {
        description: 'Story starter',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Provide a creative writing prompt for a ${args.genre} story.`,
              args.theme ? `The story should explore the theme of ${args.theme}.` : '',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'character_development',
    description: 'Create a detailed character profile',
    arguments: [
      {name: 'name', description: 'Character name'},
      {name: 'archetype', description: 'Character archetype', required: true},
    ],
    async handler(args) {
      return {
        description: 'Character creator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create a detailed character profile for a ${args.archetype} archetype.`,
              args.name ? `Name: ${args.name}` : '',
              '',
              'Include backstory, personality traits, strengths, weaknesses, and a secret.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'brainstorming_session',
    description: 'Generate ideas for a specific problem',
    arguments: [
      {name: 'problem', description: 'Problem to solve', required: true},
      {name: 'constraints', description: 'Any constraints or limitations'},
    ],
    async handler(args) {
      return {
        description: 'Brainstorming partner',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `I need to brainstorm solutions for: ${args.problem}`,
              args.constraints ? `Constraints: ${args.constraints}` : '',
              '',
              'Provide 10 diverse, creative ideas. Think outside the box.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'recipe_generator',
    description: 'Generate a recipe based on available ingredients',
    arguments: [
      {name: 'ingredients', description: 'List of ingredients', required: true},
      {name: 'cuisine', description: 'Type of cuisine'},
    ],
    async handler(args) {
      return {
        description: 'Recipe generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Suggest a recipe using the following ingredients: ${args.ingredients}.`,
              args.cuisine ? `Cuisine style: ${args.cuisine}` : '',
              '',
              'Include instructions and serving suggestions.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'resume_review',
    description: 'Critique a resume',
    arguments: [
      {name: 'resume_text', description: 'Text content of the resume', required: true},
      {name: 'job_title', description: 'Target job title'},
    ],
    async handler(args) {
      return {
        description: 'Resume reviewer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Review this resume for a ${args.job_title || 'general'} position.`,
              '',
              '```',
              args.resume_text,
              '```',
              '',
              'Provide feedback on formatting, content, impact, and keywords.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'interview_prep',
    description: 'Generate interview questions and answers',
    arguments: [
      {name: 'role', description: 'Job role', required: true},
      {name: 'company', description: 'Company type (Tech, Finance, etc.)'},
    ],
    async handler(args) {
      return {
        description: 'Interview prep',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Generate 5 difficult interview questions for a ${args.role} role.`,
              args.company ? `Context: ${args.company} company.` : '',
              '',
              'Also provide high-quality example answers using the STAR method.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'cover_letter',
    description: 'Write a cover letter',
    arguments: [
      {name: 'job_desc', description: 'Job description snippet', required: true},
      {name: 'user_skills', description: 'Key skills of the applicant'},
    ],
    async handler(args) {
      return {
        description: 'Cover letter writer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Write a professional cover letter for this job description:',
              args.job_desc,
              '',
              'Applicant Skills:',
              args.user_skills,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'salary_negotiation',
    description: 'Generate a script for negotiating salary',
    arguments: [
      {name: 'offer', description: 'The offer details', required: true},
      {name: 'target', description: 'Desired salary range'},
    ],
    async handler(args) {
      return {
        description: 'Salary negotiation script',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Draft a polite and professional salary negotiation email or script.',
              `Current Offer: ${args.offer}`,
              `Target Salary: ${args.target}`,
              '',
              'Focus on value and market rates.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'feedback_giver',
    description: 'Draft constructive feedback for an employee',
    arguments: [
      {name: 'situation', description: 'Specific situation', required: true},
      {name: 'tone', description: 'Tone (Direct, Soft, Encouraging)'},
    ],
    async handler(args) {
      return {
        description: 'Feedback drafter',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Draft constructive feedback for an employee regarding: ${args.situation}`,
              `Tone: ${args.tone || 'Professional'}`,
              '',
              'Use the "Situation-Behavior-Impact" (SBI) model.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'persona_developer',
    description: 'Create a persona for an AI assistant',
    arguments: [
      {name: 'role', description: 'Role of the assistant', required: true},
      {name: 'traits', description: 'Personality traits'},
    ],
    async handler(args) {
      return {
        description: 'AI persona creator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create a system prompt for an AI assistant acting as a ${args.role}.`,
              args.traits ? `Personality traits: ${args.traits}` : '',
              '',
              'Define the assistant\'s goal, constraints, and tone of voice.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'prompt_enhancer',
    description: 'Improve a basic prompt to get better results',
    arguments: [
      {name: 'prompt', description: 'The basic prompt', required: true},
      {name: 'goal', description: 'Specific goal of the prompt'},
    ],
    async handler(args) {
      return {
        description: 'Prompt enhancer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Improve the following prompt to get better, more detailed results.',
              `Goal: ${args.goal}`,
              '',
              'Original Prompt:',
              args.prompt,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'json_validator',
    description: 'Validate and format JSON',
    arguments: [
      {name: 'json', description: 'JSON string', required: true},
    ],
    async handler(args) {
      return {
        description: 'JSON validator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Check the following JSON for syntax errors and formatting issues.',
              'If valid, format it with 2-space indentation.',
              '',
              '```json',
              args.json,
              '```',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'yaml_converter',
    description: 'Convert data to YAML or review YAML',
    arguments: [
      {name: 'data', description: 'Data structure or YAML content', required: true},
      {name: 'action', description: 'Convert to YAML or Review'},
    ],
    async handler(args) {
      return {
        description: 'YAML helper',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `${args.action === 'Review' ? 'Review and fix syntax in' : 'Convert the following to'} YAML:`,
              '',
              args.data,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'markdown_formatter',
    description: 'Format text into clean Markdown',
    arguments: [
      {name: 'text', description: 'Unformatted text', required: true},
      {name: 'headers', description: 'Instruction on header structure'},
    ],
    async handler(args) {
      return {
        description: 'Markdown formatter',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Convert the following text into clean, well-structured Markdown.',
              args.headers ? `Header instructions: ${args.headers}` : '',
              '',
              args.text,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'api_endpoint_design',
    description: 'Design REST API endpoints',
    arguments: [
      {name: 'resource', description: 'Resource name', required: true},
      {name: 'actions', description: 'CRUD actions needed'},
    ],
    async handler(args) {
      return {
        description: 'API endpoint designer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Design RESTful API endpoints for the following resource:',
              `Resource: ${args.resource}`,
              args.actions ? `Actions needed: ${args.actions}` : '',
              '',
              'List the HTTP methods (GET, POST, PUT, DELETE), paths, and expected status codes.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'microservice_architecture',
    description: 'Propose a microservice breakdown',
    arguments: [
      {name: 'app_description', description: 'Description of the monolith app', required: true},
    ],
    async handler(args) {
      return {
        description: 'Microservice architect',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Propose a microservice architecture breakdown for the following application:',
              args.app_description,
              '',
              'Define service boundaries, communication protocols, and data storage strategies.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'system_design_interview',
    description: 'Practice system design',
    arguments: [
      {name: 'problem', description: 'System design problem (e.g., Design Twitter)', required: true},
      {name: 'scale', description: 'Scale constraints (e.g., 10M users)'},
    ],
    async handler(args) {
      return {
        description: 'System design interviewer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Act as a system design interviewer. Ask me questions to help me design: ${args.problem}.`,
              args.scale ? `Scale requirements: ${args.scale}` : '',
              '',
              'Start by asking clarifying questions. Do not provide the solution immediately.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'dependency_update_changelog',
    description: 'Write a changelog for dependency updates',
    arguments: [
      {name: 'updates', description: 'List of package updates', required: true},
    ],
    async handler(args) {
      return {
        description: 'Changelog generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Write a concise changelog entry for the following dependency updates:',
              args.updates,
              '',
              'Group by patch, minor, and major versions. Highlight breaking changes.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'onboarding_guide',
    description: 'Create an onboarding guide for a new dev',
    arguments: [
      {name: 'stack', description: 'Tech stack', required: true},
      {name: 'role', description: 'Role details'},
    ],
    async handler(args) {
      return {
        description: 'Onboarding guide creator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create a Day 1 onboarding checklist for a ${args.role} joining a team using ${args.stack}.`,
              '',
              'Include environment setup, access permissions, and first tasks.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'sop_creation',
    description: 'Create a Standard Operating Procedure',
    arguments: [
      {name: 'process', description: 'The process to document', required: true},
    ],
    async handler(args) {
      return {
        description: 'SOP writer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write a Standard Operating Procedure (SOP) for: ${args.process}`,
              '',
              'Structure it with Purpose, Scope, Definitions, and Steps.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'video_script',
    description: 'Write a script for a video (YouTube/TikTok)',
    arguments: [
      {name: 'topic', description: 'Video topic', required: true},
      {name: 'duration', description: 'Target duration'},
      {name: 'style', description: 'Style (Educational, Entertaining)'},
    ],
    async handler(args) {
      return {
        description: 'Video scriptwriter',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write a script for a ${args.duration || 'short'} video about ${args.topic}.`,
              `Style: ${args.style || 'Engaging'}`,
              '',
              'Include scene descriptions, dialogue, and visual cues.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'podcast_outline',
    description: 'Create an outline for a podcast episode',
    arguments: [
      {name: 'theme', description: 'Podcast theme', required: true},
      {name: 'guests', description: 'Guest profiles'},
    ],
    async handler(args) {
      return {
        description: 'Podcast outliner',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create an outline for a podcast episode about ${args.theme}.`,
              args.guests ? `Guests: ${args.guests}` : '',
              '',
              'Include intro, segment topics, ad spots, and outro questions.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'newsletter_draft',
    description: 'Draft a newsletter',
    arguments: [
      {name: 'updates', description: 'Key updates to share', required: true},
      {name: 'company_name', description: 'Company name'},
    ],
    async handler(args) {
      return {
        description: 'Newsletter drafter',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Draft a company newsletter.',
              `Company: ${args.company_name}`,
              'Updates to include:',
              args.updates,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'seo_keywords',
    description: 'Generate SEO keywords for a topic',
    arguments: [
      {name: 'topic', description: 'Content topic', required: true},
      {name: 'intent', description: 'Search intent (Informational, Commercial)'},
    ],
    async handler(args) {
      return {
        description: 'SEO keyword generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Generate a list of high-value SEO keywords for ${args.intent || 'informational'} content about: ${args.topic}`,
              '',
              'Group them by short-tail and long-tail keywords.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'ad_copy',
    description: 'Write advertisement copy',
    arguments: [
      {name: 'product', description: 'Product name', required: true},
      {name: 'platform', description: 'Ad platform (Facebook, Google)'},
      {name: 'usp', description: 'Unique Selling Proposition'},
    ],
    async handler(args) {
      return {
        description: 'Ad copywriter',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write ad copy for ${args.platform} for ${args.product}.`,
              args.usp ? `Key USP: ${args.usp}` : '',
              '',
              'Create 3 variations: Headline, Body, and CTA.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'press_release',
    description: 'Write a press release',
    arguments: [
      {name: 'news', description: 'News to announce', required: true},
      {name: 'company', description: 'Company name'},
    ],
    async handler(args) {
      return {
        description: 'Press release writer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Write a formal press release.',
              `Company: ${args.company}`,
              `Announcement: ${args.news}`,
              '',
              'Follow standard PR format (FOR IMMEDIATE RELEASE, Dateline, Body, Contact Info).',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'faq_generator',
    description: 'Generate FAQs for a product or service',
    arguments: [
      {name: 'subject', description: 'Subject', required: true},
    ],
    async handler(args) {
      return {
        description: 'FAQ generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Generate 5 Frequently Asked Questions and answers for: ${args.subject}`,
              '',
              'Make the answers clear and concise.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'troubleshooting_guide',
    description: 'Create a troubleshooting guide',
    arguments: [
      {name: 'product', description: 'Product or software name', required: true},
      {name: 'common_issues', description: 'List of common issues'},
    ],
    async handler(args) {
      return {
        description: 'Troubleshooting guide creator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create a troubleshooting guide for ${args.product}.`,
              args.common_issues ? `Focus on these issues: ${args.common_issues}` : 'Cover the top 5 most common issues.',
              '',
              'Structure with Problem, Possible Cause, and Solution.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'git_conflict_resolver',
    description: 'Explain how to resolve a specific git conflict',
    arguments: [
      {name: 'conflict_snippet', description: 'The conflict markers in the file', required: true},
    ],
    async handler(args) {
      return {
        description: 'Git conflict helper',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'I have a git merge conflict. Help me resolve it.',
              '',
              '```',
              args.conflict_snippet,
              '```',
              '',
              'Explain the changes and suggest the corrected code.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'feature_specification',
    description: 'Write a detailed specification for a feature',
    arguments: [
      {name: 'feature', description: 'Feature name/description', required: true},
      {name: 'requirements', description: 'List of requirements'},
    ],
    async handler(args) {
      return {
        description: 'Feature spec writer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write a technical specification for the feature: ${args.feature}`,
              args.requirements ? `Requirements: ${args.requirements}` : '',
              '',
              'Include Functional Requirements, Non-functional Requirements, UI Mockups description, and Edge cases.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'pr_description',
    description: 'Write a Pull Request description',
    arguments: [
      {name: 'code_changes', description: 'Summary of changes', required: true},
      {name: 'testing', description: 'Testing performed'},
    ],
    async handler(args) {
      return {
        description: 'PR description generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Write a Pull Request description based on these changes.',
              `Changes: ${args.code_changes}`,
              args.testing ? `Testing: ${args.testing}` : '',
              '',
              'Include a "Type of change" checklist and relevant screenshots placeholder.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'cloud_cost_estimation',
    description: 'Estimate cloud infrastructure costs',
    arguments: [
      {name: 'architecture', description: 'Description of components', required: true},
      {name: 'provider', description: 'Cloud provider (AWS, Azure, GCP)'},
    ],
    async handler(args) {
      return {
        description: 'Cloud cost estimator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Estimate the monthly cost for the following architecture on ${args.provider || 'AWS'}.`,
              args.architecture,
              '',
              'Identify the key cost drivers (compute, storage, data transfer).',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'capacity_planning',
    description: 'Plan capacity for a growing application',
    arguments: [
      {name: 'current_load', description: 'Current metrics', required: true},
      {name: 'growth_rate', description: 'Expected growth'},
    ],
    async handler(args) {
      return {
        description: 'Capacity planner',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Create a capacity planning strategy.',
              `Current Load: ${args.current_load}`,
              `Expected Growth: ${args.growth_rate}`,
              '',
              'Recommend scaling thresholds (vertical vs horizontal) and lead times for provisioning.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'compliance_check',
    description: 'Check requirements for compliance (GDPR/HIPAA)',
    arguments: [
      {name: 'system_desc', description: 'System description', required: true},
      {name: 'standard', description: 'Compliance standard'},
    ],
    async handler(args) {
      return {
        description: 'Compliance checker',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Review the following system description for ${args.standard || 'GDPR'} compliance.`,
              '',
              args.system_desc,
              '',
              'List potential violations and suggest remediation steps.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'ethical_review',
    description: 'Review AI or tech implementation for ethical concerns',
    arguments: [
      {name: 'description', description: 'Project description', required: true},
    ],
    async handler(args) {
      return {
        description: 'Ethical reviewer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Perform an ethical review of the following project.',
              args.description,
              '',
              'Analyze bias, privacy impact, and potential for misuse.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'innovation_ideas',
    description: 'Brainstorm innovative uses for a technology',
    arguments: [
      {name: 'tech', description: 'Technology name', required: true},
    ],
    async handler(args) {
      return {
        description: 'Innovation consultant',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Brainstorm 5 innovative, non-obvious use cases for ${args.tech}.`,
              '',
              'Focus on emerging markets or solving neglected problems.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'naming_convention_suggester',
    description: 'Suggest names for variables, functions, or products',
    arguments: [
      {name: 'context', description: 'Purpose of the name', required: true},
      {name: 'style', description: 'Naming style (camelCase, snake_case)'},
    ],
    async handler(args) {
      return {
        description: 'Naming expert',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Suggest 10 names for: ${args.context}`,
              args.style ? `Style: ${args.style}` : '',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'logo_concept_ideas',
    description: 'Generate ideas for a logo design',
    arguments: [
      {name: 'brand_name', description: 'Brand name', required: true},
      {name: 'industry', description: 'Industry'},
    ],
    async handler(args) {
      return {
        description: 'Logo concept generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Suggest 5 logo concepts for a brand called "${args.brand_name}" in the ${args.industry} industry.`,
              '',
              'Describe the symbols, typography, and color psychology for each.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'color_palette_generator',
    description: 'Generate color palettes for UI/Design',
    arguments: [
      {name: 'vibe', description: 'The vibe/mood', required: true},
    ],
    async handler(args) {
      return {
        description: 'Color palette generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Generate a color palette (Hex codes) for a project with a "${args.vibe}" vibe.`,
              '',
              'Include Primary, Secondary, Accent, and Background colors.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'ui_copy_writer',
    description: 'Write microcopy for UI elements',
    arguments: [
      {name: 'element', description: 'UI element (e.g., Error message, Button)', required: true},
      {name: 'context', description: 'User context'},
    ],
    async handler(args) {
      return {
        description: 'UX writer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write copy for a UI element: ${args.element}`,
              args.context ? `Context: ${args.context}` : '',
              '',
              'Provide 3 options: Functional, Friendly, and Playful.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'ux_critique',
    description: 'Critique a user flow or design description',
    arguments: [
      {name: 'flow', description: 'Description of the flow', required: true},
    ],
    async handler(args) {
      return {
        description: 'UX critic',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Perform a UX critique of the following user flow:',
              args.flow,
              '',
              'Identify friction points, cognitive load issues, and navigation improvements.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'accessibility_audit',
    description: 'Suggest accessibility improvements (WCAG)',
    arguments: [
      {name: 'component', description: 'UI Component description', required: true},
    ],
    async handler(args) {
      return {
        description: 'Accessibility auditor',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Audit the following UI component for WCAG compliance: ${args.component}`,
              '',
              'Check for keyboard navigation, screen reader support, and color contrast.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'mobile_app_review',
    description: 'Generate a test plan for a mobile app',
    arguments: [
      {name: 'app_type', description: 'Type of app', required: true},
    ],
    async handler(args) {
      return {
        description: 'Mobile QA planner',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create a test plan for a ${args.app_type} mobile app.`,
              '',
              'Include cases for OS compatibility, interrupts (calls/notifications), and offline mode.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'backend_api_tester',
    description: 'Generate API test cases (Postman/K6)',
    arguments: [
      {name: 'endpoint', description: 'API Endpoint info', required: true},
    ],
    async handler(args) {
      return {
        description: 'API test generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Generate a set of integration tests for the following API:',
              args.endpoint,
              '',
              'Include tests for valid request, invalid params, auth errors, and load testing strategy.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'integration_flow_design',
    description: 'Design a data integration flow between two systems',
    arguments: [
      {name: 'system_a', description: 'Source system', required: true},
      {name: 'system_b', description: 'Target system', required: true},
      {name: 'data', description: 'Data description'},
    ],
    async handler(args) {
      return {
        description: 'Integration architect',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Design a data integration flow.',
              `From: ${args.system_a}`,
              `To: ${args.system_b}`,
              `Data: ${args.data}`,
              '',
              'Define the sync pattern (Real-time vs Batch), error handling, and idempotency.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'message_queue_schema',
    description: 'Design a message schema for a queue (Kafka/RabbitMQ)',
    arguments: [
      {name: 'event', description: 'Event type', required: true},
      {name: 'data_fields', description: 'Required data fields'},
    ],
    async handler(args) {
      return {
        description: 'Event schema designer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Design a JSON schema for a "${args.event}" event message.`,
              args.data_fields ? `Must include: ${args.data_fields}` : '',
              '',
              'Include headers (correlation ID, timestamp) and payload structure.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'caching_strategy',
    description: 'Recommend a caching strategy',
    arguments: [
      {name: 'data_pattern', description: 'Read/Write pattern description', required: true},
    ],
    async handler(args) {
      return {
        description: 'Caching strategist',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Recommend a caching strategy for the following data pattern: ${args.data_pattern}`,
              '',
              'Discuss Cache-aside, Write-through, or Write-back, and eviction policies.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'database_migration_plan',
    description: 'Plan a database migration with zero downtime',
    arguments: [
      {name: 'change', description: 'Schema change description', required: true},
    ],
    async handler(args) {
      return {
        description: 'DB migration planner',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Create a step-by-step zero-downtime migration plan for:',
              args.change,
              '',
              'Use the expand-contract pattern if applicable.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'log_analysis',
    description: 'Interpret a log snippet',
    arguments: [
      {name: 'logs', description: 'Log content', required: true},
    ],
    async handler(args) {
      return {
        description: 'Log analyzer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Analyze the following log snippet for errors and warnings.',
              '',
              '```',
              args.logs,
              '```',
              '',
              'Identify the root cause of the error if present.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'alerting_rules',
    description: 'Generate Prometheus/Grafana alerting rules',
    arguments: [
      {name: 'metric', description: 'Metric name', required: true},
      {name: 'condition', description: 'Alert condition (e.g., > 90%)'},
    ],
    async handler(args) {
      return {
        description: 'Alerting rule generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Write a Prometheus alerting rule expression.',
              `Metric: ${args.metric}`,
              `Condition: ${args.condition}`,
              '',
              'Include the alert name, expr, and a clear annotation summary.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'backup_strategy',
    description: 'Define a backup strategy',
    arguments: [
      {name: 'data_type', description: 'Type of data', required: true},
      {name: 'rpo_rto', description: 'RPO and RTO requirements'},
    ],
    async handler(args) {
      return {
        description: 'Backup strategist',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Design a backup strategy for ${args.data_type} data.`,
              args.rpo_rto ? `Requirements: ${args.rpo_rto}` : '',
              '',
              'Discuss full vs incremental backups, retention, and restoration testing.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'disaster_recovery_plan',
    description: 'Create a Disaster Recovery (DR) plan',
    arguments: [
      {name: 'system', description: 'System name', required: true},
    ],
    async handler(args) {
      return {
        description: 'DR planner',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Draft a Disaster Recovery plan for ${args.system}.`,
              '',
              'Include RTO/RPO, failover steps, and communication plan.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'architecture_decision_record',
    description: 'Write an ADR (Architecture Decision Record)',
    arguments: [
      {name: 'decision', description: 'The decision made', required: true},
      {name: 'context', description: 'Context and drivers'},
      {name: 'alternatives', description: 'Alternatives considered'},
    ],
    async handler(args) {
      return {
        description: 'ADR writer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Write an Architecture Decision Record (ADR).',
              `Context: ${args.context}`,
              `Decision: ${args.decision}`,
              args.alternatives ? `Alternatives: ${args.alternatives}` : '',
              '',
              'Use standard ADR structure: Status, Context, Decision, Consequences.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'contract_review',
    description: 'Summarize key points of a contract (Legal aid, not advice)',
    arguments: [
      {name: 'contract_text', description: 'Contract snippet', required: true},
    ],
    async handler(args) {
      return {
        description: 'Contract summarizer',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Summarize the key obligations and clauses in this contract text.',
              'Disclaimer: This is for informational purposes only, not legal advice.',
              '',
              args.contract_text,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'negotiation_strategy',
    description: 'Plan a negotiation strategy',
    arguments: [
      {name: 'objective', description: 'Goal of negotiation', required: true},
      {name: 'party', description: 'Who is the other party?'},
    ],
    async handler(args) {
      return {
        description: 'Negotiation strategist',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Develop a negotiation strategy to achieve: ${args.objective}`,
              args.party ? `Counterparty: ${args.party}` : '',
              '',
              'Define ZOPA (Zone of Possible Agreement), BATNA, and opening tactics.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'motivational_speech',
    description: 'Write a short motivational speech',
    arguments: [
      {name: 'theme', description: 'Theme (e.g., perseverance)', required: true},
    ],
    async handler(args) {
      return {
        description: 'Motivational speaker',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write a 2-minute motivational speech about ${args.theme}.`,
              '',
              'Use rhetorical devices and an inspiring tone.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'meditation_script',
    description: 'Generate a guided meditation script',
    arguments: [
      {name: 'focus', description: 'Focus area (e.g., sleep, anxiety)', required: true},
      {name: 'duration', description: 'Duration in minutes'},
    ],
    async handler(args) {
      return {
        description: 'Meditation guide',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Write a guided meditation script for ${args.duration || '5'} minutes focused on ${args.focus}.`,
              '',
              'Include cues for breathing and visualization.',
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'tech_joke',
    description: 'Generate a tech-related joke',
    arguments: [
      {name: 'topic', description: 'Topic (e.g., Java, CSS, Hardware)'},
    ],
    async handler(args) {
      return {
        description: 'Tech comedian',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Tell me a funny joke about ${args.topic || 'programming'}.`,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'riddle_creator',
    description: 'Create a riddle',
    arguments: [
      {name: 'answer', description: 'The answer to the riddle', required: true},
      {name: 'difficulty', description: 'Difficulty level'},
    ],
    async handler(args) {
      return {
        description: 'Riddler',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create a ${args.difficulty || 'medium'} difficulty riddle where the answer is "${args.answer}".`,
            ].join('\n'),
          },
        }],
      };
    },
  },
  {
    name: 'quote_inspiration',
    description: 'Generate an inspirational quote',
    arguments: [
      {name: 'topic', description: 'Topic'},
    ],
    async handler(args) {
      return {
        description: 'Quote generator',
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Generate an original inspirational quote about ${args.topic || 'life'}.`,
            ].join('\n'),
          },
        }],
      };
    },
  },
];

export default promptTemplates;
