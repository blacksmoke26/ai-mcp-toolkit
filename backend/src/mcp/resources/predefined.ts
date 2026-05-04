/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import type {RegisteredResource} from './registry';

/**
 * Sample array of resources for demonstration purposes.
 * Each resource includes a URI, name, description, MIME type, and a handler function.
 */
export const sampleResources: RegisteredResource[] = [
  {
    uri: 'config://app/settings',
    name: 'Application Settings',
    description: 'Read-only access to application configuration settings.',
    mimeType: 'application/json',
    async handler(uri: string) {
      return [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({debug: true, version: '1.0.0'}, null, 2),
        },
      ];
    },
  },
  {
    uri: 'file://logs/latest',
    name: 'Latest Logs',
    description: 'The most recent application log entries.',
    mimeType: 'text/plain',
    async handler(uri: string) {
      return [
        {
          uri,
          mimeType: 'text/plain',
          text: '[INFO] Server started\n[WARN] High memory usage detected',
        },
      ];
    },
  },
  {
    uri: 'data://users/summary',
    name: 'User Summary',
    description: 'Aggregated statistics about registered users.',
    mimeType: 'application/json',
    async handler(uri: string) {
      return [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({totalUsers: 150, activeUsers: 42}, null, 2),
        },
      ];
    },
  },
  {
    uri: 'image://assets/logo',
    name: 'Application Logo',
    description: 'Base64 encoded representation of the main application logo.',
    mimeType: 'image/png',
    async handler(uri: string) {
      return [{
        uri,
        mimeType: 'image/png',
        blob: new Blob(['fake-image-data'], {type: 'image/png'}),
      }];
    },
  },
  {
    uri: 'text://readme',
    name: 'README Documentation',
    description: 'Markdown formatted documentation for the project.',
    mimeType: 'text/markdown',
    async handler(uri: string) {
      return [
        {
          uri,
          mimeType: 'text/markdown',
          text: '# Project README\n\nThis is a sample project demonstrating resource handling.',
        },
      ];
    },
  },
  {
    uri: 'data://xml/config',
    name: 'XML Configuration',
    description: 'Legacy configuration stored in XML format.',
    mimeType: 'application/xml',
    async handler(uri: string) {
      return [
        {
          uri,
          mimeType: 'application/xml',
          text: '<?xml version="1.0" encoding="UTF-8"?><config><theme>dark</theme></config>',
        },
      ];
    },
  },
  {
    uri: 'binary://download/archive',
    name: 'Download Archive',
    description: 'A binary file available for download.',
    mimeType: 'application/zip',
    async handler(uri: string) {
      return [
        {
          uri,
          mimeType: 'application/zip',
          blob: await (new Blob(['PK-fake-zip-data'], {type: 'application/zip'})).text(),
        },
      ];
    },
  },
  {
    uri: 'html://templates/home',
    name: 'Home Template',
    description: 'HTML template for the home page.',
    mimeType: 'text/html',
    async handler(uri: string) {
      return [
        {
          uri,
          mimeType: 'text/html',
          text: '<!DOCTYPE html><html><body><h1>Welcome Home</h1></body></html>',
        },
      ];
    },
  },
  {
    uri: 'csv://data/export',
    name: 'Data Export',
    description: 'Comma-separated values export of user data.',
    mimeType: 'text/csv',
    async handler(uri: string) {
      return [
        {
          uri,
          mimeType: 'text/csv',
          text: 'id,name,email\n1,John Doe,john@example.com\n2,Jane Smith,jane@example.com',
        },
      ];
    },
  },
  {
    uri: 'env://system/variables',
    name: 'Environment Variables',
    description: 'Current system environment variables.',
    mimeType: 'text/plain',
    async handler(uri: string) {
      return [
        {
          uri,
          mimeType: 'text/plain',
          text: 'NODE_ENV=production\nPORT=8080\nDB_HOST=localhost',
        },
      ];
    },
  },
];
