// src/web.config.ts

import { INestApplication } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js'; // Import INestApplication

export const corsConfig: CorsOptions = {
  origin: '*', // Allow all origins
  methods: '*', // Allow all HTTP methods
  allowedHeaders: '*', // Allow all headers
  credentials: true, // Allow credentials if needed
};

// Common method to configure web settings
export function configureWebSettings(app: INestApplication) {
  // Use INestApplication here
  // Enable CORS
  app.enableCors(corsConfig);

  // You can add other web-related configurations here
  // For example, setting global prefixes, security headers, etc.

  // Example: Setting a global prefix for your API
  // base.setGlobalPrefix('api/1.0.0'); // Optional: adds 'api' prefix to all routes
}
