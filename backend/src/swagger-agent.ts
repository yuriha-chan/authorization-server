import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';

const agentOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Agent API',
      version: '1.0.0',
      description: 'API for agent registration and access requests',
    },
    servers: [
      { url: 'http://localhost:8080', description: 'Agent API' },
    ],
    components: {
      securitySchemes: {
        SignatureAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Signature',
          description: 'RSA signature with SHA256',
        },
      },
    },
    paths: {
      '/api/status': {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'Server status' } },
        },
      },
      '/api/register': {
        post: {
          summary: 'Register new agent',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          responses: {
            '201': { description: 'Agent registered' },
            '400': { description: 'Validation error' },
            '409': { description: 'Agent name already exists' },
          },
        },
      },
      '/api/request-access': {
        post: {
          summary: 'Submit access request',
          security: [{ SignatureAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          responses: {
            '202': { description: 'Request submitted' },
            '400': { description: 'Validation error' },
            '401': { description: 'Invalid signature' },
          },
        },
      },
    },
  },
  apis: [],
};

export const agentSwaggerSpec = swaggerJsdoc(agentOptions);