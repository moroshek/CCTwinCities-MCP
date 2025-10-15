#!/bin/bash

echo "🚀 Starting Catholic Charities Twin Cities MCP Server..."
echo ""
echo "Next steps:"
echo "1. In another terminal, run: ngrok http 2091"
echo "2. Copy the ngrok HTTPS URL"
echo "3. In ChatGPT Settings → Connectors, create a new connector:"
echo "   - Name: CCTwinCities"
echo "   - URL: <ngrok-url>/mcp"
echo "4. Enable the connector in Developer Mode"
echo "5. Test with: '@CCTwinCities find volunteer opportunities in Minneapolis'"
echo ""
echo "Starting server..."
echo ""

npm run dev
