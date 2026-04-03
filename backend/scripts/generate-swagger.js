const { zodToJsonSchema } = require('zod-to-json-schema');
const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

const schemas = require('../dist/schemas');

const agentOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Agent API', version: '1.0.0', description: 'API for agent registration and access requests' },
    servers: [{ url: 'http://localhost:8080', description: 'Agent API' }],
    components: {
      securitySchemes: {
        SignatureAuth: { type: 'apiKey', in: 'header', name: 'X-Signature', description: 'RSA signature with SHA256' },
      },
      schemas: {
        AgentRegister: zodToJsonSchema(schemas.registerSchema),
        AccessRequest: zodToJsonSchema(schemas.requestSchema),
      },
    },
    paths: {
      '/api/status': { get: { summary: 'Health check', responses: { '200': { description: 'Server status' } } } },
      '/api/register': {
        post: {
          summary: 'Register new agent',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentRegister' } } } },
          responses: { '201': { description: 'Agent registered' }, '400': { description: 'Validation error' }, '409': { description: 'Agent name already exists' } },
        },
      },
      '/api/request-access': {
        post: {
          summary: 'Submit access request',
          security: [{ SignatureAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AccessRequest' } } } },
          responses: { '202': { description: 'Request submitted' }, '400': { description: 'Validation error' }, '401': { description: 'Invalid signature' } },
        },
      },
    },
  },
  apis: [],
};

const adminOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Admin API', version: '1.0.0', description: 'API for admin management' },
    servers: [{ url: 'http://localhost:8081', description: 'Admin API' }],
    components: {
      schemas: {
        Grant: zodToJsonSchema(schemas.grantSchema),
        Notification: zodToJsonSchema(schemas.notificationSchema),
        ApproveRequest: zodToJsonSchema(schemas.approveRequestSchema),
      },
    },
    paths: {
      '/api/status': { get: { summary: 'Health check', responses: { '200': { description: 'Server status' } } } },
      '/api/agents': { get: { summary: 'List all agents', responses: { '200': { description: 'List of agents' } } } },
      '/api/agents/{id}': {
        get: { summary: 'Get agent by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'number' } }], responses: { '200': { description: 'Agent details' }, '404': { description: 'Agent not found' } } },
        delete: { summary: 'Delete agent', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'number' } }], responses: { '200': { description: 'Agent deleted' } } },
      },
      '/api/requests/pending': { get: { summary: 'Get pending requests', responses: { '200': { description: 'Pending requests list' } } } },
      '/api/requests/{id}/approve': {
        post: { summary: 'Approve access request', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'number' } }], requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ApproveRequest' } } } }, responses: { '200': { description: 'Request approved' }, '404': { description: 'Request not found' } } },
      },
      '/api/requests/{id}/deny': {
        post: { summary: 'Deny access request', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'number' } }], responses: { '200': { description: 'Request denied' }, '404': { description: 'Request not found' } } },
      },
      '/api/grants': {
        get: { summary: 'List all grants', responses: { '200': { description: 'List of grants' } } },
        post: { summary: 'Create grant', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Grant' } } } }, responses: { '201': { description: 'Grant created' }, '400': { description: 'Validation error' } } },
      },
      '/api/grants/{id}': {
        put: { summary: 'Update grant', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'number' } }], requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Grant' } } } }, responses: { '200': { description: 'Grant updated' }, '404': { description: 'Grant not found' } } },
        delete: { summary: 'Delete grant', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'number' } }], responses: { '200': { description: 'Grant deleted' }, '404': { description: 'Grant not found' } } },
      },
      '/api/notifications': {
        get: { summary: 'List all notifications', responses: { '200': { description: 'List of notifications' } } },
        post: { summary: 'Create notification', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } } }, responses: { '201': { description: 'Notification created' }, '400': { description: 'Validation error' } } },
      },
      '/api/notifications/{id}': {
        put: { summary: 'Update notification', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'number' } }], requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } } }, responses: { '200': { description: 'Notification updated' }, '404': { description: 'Notification not found' } } },
        delete: { summary: 'Delete notification', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'number' } }], responses: { '200': { description: 'Notification deleted' }, '404': { description: 'Notification not found' } } },
      },
      '/api/websocket/stats': { get: { summary: 'WebSocket statistics', responses: { '200': { description: 'WebSocket stats' } } } },
    },
  },
  apis: [],
};

fs.writeFileSync(path.join(__dirname, '../dist/agent-openapi.json'), JSON.stringify(swaggerJsdoc(agentOptions), null, 2));
fs.writeFileSync(path.join(__dirname, '../dist/admin-openapi.json'), JSON.stringify(swaggerJsdoc(adminOptions), null, 2));

console.log('Generated OpenAPI specs');