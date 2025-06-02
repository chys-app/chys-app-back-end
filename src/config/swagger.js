const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pet App API Documentation',
      version: '1.0.0',
      description: 'API documentation for Pet App',
      contact: {
        name: 'API Support',
        email: 'support@petapp.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.js', './src/models/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs; 