/**
 * claude-context
 * Main entry point for the claude-context MCP server
 * Provides context management and vector search capabilities for Claude AI
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { toolHandlers } from './tools/index.js';
import { toolDefinitions } from './tools/definitions.js';
import { logger } from './utils/logger.js';

// Load environment variables
config();

const SERVER_NAME = 'claude-context';
const SERVER_VERSION = '0.1.0';

/**
 * Initialize and start the MCP server
 */
async function main(): Promise<void> {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolDefinitions,
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    logger.info(`Tool called: ${name}`);

    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      return await handler(args ?? {});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Tool ${name} failed: ${message}`);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info(`${SERVER_NAME} v${SERVER_VERSION} started`);
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
