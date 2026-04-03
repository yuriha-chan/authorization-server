import swaggerJsdoc from 'swagger-jsdoc';

const adminOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Admin API',
      version: '1.0.0',
      description: 'API for admin management',
    },
    servers: [
      { url: 'http://localhost:8081', description: 'Admin API' },
    ],
    paths: {
      '/api/status': {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'Server status' } },
        },
      },
      '/api/agents': {
        get: {
          summary: 'List all agents',
          responses: { '200': { description: 'List of agents' } },
        },
      },
      '/api/requests/pending': {
        get: {
          summary: 'Get pending requests',
          responses: { '200': { description: 'Pending requests list' } },
        },
      },
      '/api/grants': {
        get: {
          summary: 'List all grants',
          responses: { '200': { description: 'List of grants' } },
        },
        post: {
          summary: 'Create grant',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '201': { description: 'Grant created' }, '400': { description: 'Validation error' } },
        },
      },
      '/api/notifications': {
        get: {
          summary: 'List all notifications',
          responses: { '200': { description: 'List of notifications' } },
        },
        post: {
          summary: 'Create notification',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '201': { description: 'Notification created' }, '400': { description: 'Validation error' } },
        },
      },
      '/api/websocket/stats': {
        get: {
          summary: 'WebSocket statistics',
          responses: { '200': { description: 'WebSocket stats' } },
        },
      },
    },
  },
  apis: [],
};

export const adminSwaggerSpec = swaggerJsdoc(adminOptions);