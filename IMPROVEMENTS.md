# Best Practices Implementation

## ✅ What We Fixed

### 1. **HTTP+SSE Transport (Critical)**
- ❌ **Before:** Used `StdioServerTransport` - can't be reached over ngrok/HTTPS
- ✅ **After:** Used `SSEServerTransport` with Express HTTP server
- **Why:** ChatGPT requires an HTTPS `/mcp` endpoint. Stdio only works for local CLI tools.
- **Impact:** Server can now be exposed via ngrok and connected to ChatGPT

### 2. **widgetAccessible Metadata (Advanced)**
- ❌ **Before:** Widget had no ability to call tools or interact with server
- ✅ **After:** Added `"openai/widgetAccessible": true` to `get_volunteer_opportunities`
- **Why:** Enables component-initiated tool access - widget can call server tools
- **Use Cases:**
  - User filters opportunities → widget can re-query server
  - User clicks "Ask More" → sends follow-up message
  - User clicks "How to Donate" → calls `get_donation_options` tool

### 3. **widgetDescription Metadata (Best Practice)**
- ❌ **Before:** No widget description for the model
- ✅ **After:** Added `"openai/widgetDescription": "Interactive volunteer opportunities list..."`
- **Why:** Helps ChatGPT understand the widget's purpose and when to use it
- **Impact:** Better tool selection and widget rendering decisions

### 4. **window.openai API Implementation (Critical)**
- ❌ **Before:** Widget only had placeholder types, no actual integration
- ✅ **After:** Implemented full `window.openai` API:
  - `sendFollowUpMessage` - Send conversational prompts
  - `openUrl` - Open external links securely
  - `callTool` - Call server tools from widget
  - `setWidgetState` - Persist widget state
  - `widgetState` - Retrieve persisted state
  - `displayMode` - React to inline/fullscreen/pip modes
  - `maxHeight` - Responsive layout hints

### 5. **useOpenAiGlobal Hook (Advanced)**
- ❌ **Before:** No reactive state management
- ✅ **After:** Implemented proper React hook using `useSyncExternalStore`
- **Why:** Subscribe to global state changes reactively
- **Pattern:**
```typescript
function useOpenAiGlobal<K extends keyof OpenAIGlobal>(key: K): OpenAIGlobal[K] {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = () => onChange();
      window.addEventListener('openai:setGlobal', handleSetGlobal);
      return () => window.removeEventListener('openai:setGlobal', handleSetGlobal);
    },
    () => window.openai?.[key],
    () => undefined
  );
}
```

### 6. **Display Mode Handling (UX)**
- ❌ **Before:** Single layout regardless of display mode
- ✅ **After:** Responsive to `displayMode`:
  - **Inline:** Single column, compact padding
  - **Fullscreen:** Multi-column grid, expanded padding
  - **PiP:** (Future) Could show minimal summary
- **Why:** Better UX across different viewing contexts

### 7. **Widget State Persistence (UX)**
- ❌ **Before:** Filters reset on every render
- ✅ **After:** Filter state persists using `setWidgetState`
- **Why:** User's filter choices survive navigation/conversation changes
- **Implementation:**
```typescript
useEffect(() => {
  if (window.openai?.setWidgetState) {
    window.openai.setWidgetState({ filterCity, filterSchedule });
  }
}, [filterCity, filterSchedule]);
```

### 8. **Interactive Widget Features (Advanced)**
- ❌ **Before:** Static list with basic links
- ✅ **After:** Rich interactive features:
  - **Client-side filtering** - City & schedule dropdowns
  - **"Ask More" button** - Sends follow-up via `sendFollowUpMessage`
  - **"How to Donate" button** - Calls `get_donation_options` tool
  - **Secure URL opening** - All links go through `openUrl`
  - **Email composition** - Pre-filled mailto links
  - **Hover effects** - Visual feedback on cards

### 9. **Proper MCP Server Factory Pattern (Architecture)**
- ❌ **Before:** Single server instance
- ✅ **After:** Factory function that creates new server per SSE session
- **Why:** Each SSE connection needs its own server instance for session isolation
- **Pattern:**
```typescript
const createServer = () => {
  const server = new McpServer(...);
  // Register tools and resources
  return server;
};

app.get('/mcp', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  const server = createServer(); // New instance per session
  await server.connect(transport);
});
```

### 10. **Health Check Endpoint (DevOps)**
- ❌ **Before:** No way to verify server is running
- ✅ **After:** `/health` endpoint returns server status
- **Why:** Easy monitoring and debugging

## 🚀 Advanced Features Now Enabled

1. **Component→Server Communication**
   - Widget can call any tool marked as `widgetAccessible`
   - Enables dynamic, interactive experiences

2. **Conversational Widget Actions**
   - "Ask More" triggers natural follow-ups
   - "How to Donate" seamlessly transitions between tools
   - User stays in conversational flow

3. **Stateful Widget**
   - Filters persist across navigation
   - User can return to widget in same state

4. **Responsive Layout**
   - Adapts to inline vs fullscreen
   - Grid layout in fullscreen for better space usage

5. **Secure URL Handling**
   - All external links go through `openUrl`
   - Prevents XSS and maintains security

## 📋 Remaining Best Practices (Optional for v2)

### Not Critical for POC:

1. **OAuth Authentication**
   - Current: No auth
   - Future: OAuth 2.1 for personalized data

2. **Content Security Policy**
   - Current: Default CSP
   - Future: Custom CSP headers for widget security

3. **Localization**
   - Current: English only
   - Future: IETF BCP 47 locale support

4. **Analytics & Telemetry**
   - Current: Basic console logging
   - Future: Track tool calls, widget interactions

5. **Error Boundaries**
   - Current: Basic error handling
   - Future: React error boundaries in widget

6. **Loading States**
   - Current: Simple "Loading..." message
   - Future: Skeleton screens, progress indicators

7. **requestDisplayMode**
   - Current: Respects initial display mode
   - Future: Widget can request fullscreen on demand

8. **Multiple Widgets**
   - Current: One widget for volunteers
   - Future: Separate widgets for donations, org info

## 🎯 What Makes This Production-Ready

✅ Proper HTTP/SSE transport for ChatGPT integration
✅ widgetAccessible for interactive experiences
✅ State management with persistence
✅ Responsive display modes
✅ Secure URL handling
✅ Component-server bidirectional communication
✅ Conversational follow-up actions
✅ Session isolation
✅ Health monitoring

## 📚 References

- [MCP Server Build Guide](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Custom UX Guide](https://developers.openai.com/apps-sdk/build/custom-ux)
- [Pizzaz Examples](https://developers.openai.com/apps-sdk/build/examples)
- [Apps SDK Concepts](https://developers.openai.com/apps-sdk/concepts)
