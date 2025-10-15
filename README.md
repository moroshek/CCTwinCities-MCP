# Catholic Charities Twin Cities - ChatGPT MCP Server

A ChatGPT Apps SDK (MCP) server that helps users discover volunteer opportunities and donation options at Catholic Charities Twin Cities.

## Features

- **🤝 Volunteer Opportunities**: Search and filter opportunities by location, schedule, age, group size, and skills
- **💝 Donation Options**: Get information about online, in-kind, and vehicle donations
- **ℹ️ Organization Info**: Search for mission, services, contact info, locations, and events
- **📱 Interactive Widget**: Beautiful inline volunteer opportunity list with:
  - Client-side filtering by city & schedule type
  - "Ask More" button for conversational follow-ups
  - "How to Donate" button that calls donation tool
  - Persistent filter state across navigation
  - Responsive layout (inline vs fullscreen)
  - Secure URL handling through `window.openai.openUrl`
- **🔧 Advanced Features**:
  - Component-initiated tool calling (`widgetAccessible`)
  - State persistence via `setWidgetState`
  - Display mode adaptation
  - HTTP+SSE transport for ChatGPT integration

## Prerequisites

- Node.js 18+
- npm or yarn
- ngrok (for local development)
- ChatGPT Developer Mode access

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

This will:
- Compile TypeScript to JavaScript
- Bundle the React volunteer widget
- Output to `dist/` directory

### 3. Run Locally with ngrok

In one terminal, start the MCP server:

```bash
npm run dev
```

In another terminal, expose it via ngrok:

```bash
ngrok http 2091
```

Copy the `https://` URL from ngrok (e.g., `https://abc123.ngrok.app`).

### 4. Connect to ChatGPT

1. Open ChatGPT Settings → Connectors
2. Click "Create Connector"
3. Fill in:
   - **Name**: Catholic Charities Twin Cities
   - **Description**: Find volunteer opportunities and donation options at Catholic Charities Twin Cities
   - **URL**: Your ngrok URL + `/mcp` (e.g., `https://abc123.ngrok.app/mcp`)
4. Save and enable the connector

### 5. Test in ChatGPT

Start a new chat and enable Developer Mode. Try these prompts:

**Direct mention:**
- `@CCTwinCities find weekend volunteer opportunities in Minneapolis`

**Organic discovery (no @mention):**
- `I want to volunteer with homeless shelters in Minneapolis`
- `How do I donate a vehicle to charity in Twin Cities?`
- `What does Catholic Charities Twin Cities do?`
- `I have clothes to donate in St. Paul`
- `Find volunteer opportunities for a group of 5 on weekends`

## Tools

### 1. `get_volunteer_opportunities`

Find volunteer opportunities with optional filters.

**Parameters:**
- `keyword` (optional): Search keyword
- `city` (optional): Minneapolis, St. Paul, Maplewood, Twin Cities
- `schedule_type` (optional): one-time, weekly, flexible, ongoing
- `age_minimum` (optional): Maximum age requirement (e.g., 14, 18)
- `group_friendly` (optional): Filter for group opportunities
- `skill` (optional): Required skill (e.g., 'sewing', 'baking')

**Returns:** Structured list with inline widget showing opportunities with contact actions.

### 2. `get_donation_options`

Get donation information.

**Parameters:**
- `type` (required): online, in_kind, or vehicle

**Returns:** Contact info, locations, accepted items, policies, and links.

### 3. `search_org_info`

Search organization information.

**Parameters:**
- `query` (required): Search query (e.g., 'mission', 'services', 'contact', 'homeless shelter')

**Returns:** Relevant information cards with sources.

## Project Structure

```
.
├── src/
│   └── index.ts           # MCP server with tool handlers
├── widget/
│   └── volunteer-list.tsx # React widget for opportunities
├── dist/                  # Build output
├── CC.json                # Static data source
├── package.json
├── tsconfig.json
└── build-widget.js        # Widget build script
```

## Development

### Run in Development Mode

```bash
npm run dev
```

The server runs on `stdio` transport and logs to stderr.

### Rebuild Widget Only

```bash
npm run build:widget
```

### Update Data

Edit `CC.json` to update volunteer opportunities, donations, or organization info. Restart the server to load changes.

## Discovery Optimization

The tool descriptions are optimized for both:
1. **Direct mention**: `@CCTwinCities show me opportunities`
2. **Organic discovery**: `I want to volunteer in Minneapolis`

Key metadata elements:
- Action-oriented tool names
- Clear "Use this when..." descriptions
- Rich parameter descriptions with examples
- Discovery keywords in org data

## Deployment

For production, deploy to:
- Fly.io
- Render
- Railway
- Google Cloud Run
- Azure Container Apps

Ensure your `/mcp` endpoint is accessible via HTTPS.

## Troubleshooting

**Tools not appearing in ChatGPT:**
- Verify ngrok is running and URL is correct
- Check connector URL includes `/mcp`
- Refresh connector in ChatGPT settings

**Widget not rendering:**
- Run `npm run build:widget`
- Check browser console for errors
- Verify `dist/volunteer-widget.html` exists

**Discovery not working:**
- Improve tool descriptions with more keywords
- Test with different prompt phrasings
- Check ChatGPT developer mode is enabled

## License

MIT

## Contact

For questions about Catholic Charities Twin Cities:
- Website: https://cctwincities.org
- Volunteer: volunteer@cctwincities.org | (612) 204-8435
- Donations: giving.info@cctwincities.org | (612) 204-8374
