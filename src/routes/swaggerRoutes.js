const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('../config/swagger');
const swaggerCors = require('../middleware/swaggerCors');

// Apply CORS middleware specifically for Swagger UI
router.use(swaggerCors);

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Pet App API Documentation",
  customfavIcon: "/favicon.ico"
}));

module.exports = router; 