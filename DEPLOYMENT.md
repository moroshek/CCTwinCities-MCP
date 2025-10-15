# Deployment Guide - Render.com

## 🚀 Quick Deploy to Render.com

### Prerequisites
- ✅ GitHub repository: https://github.com/moroshek/CCTwinCities-MCP
- ✅ Render.com account (free tier available)
- ✅ Code pushed to `main` branch

---

## 📋 Step-by-Step Deployment

### Option 1: Automated (Using render.yaml - Recommended)

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com

2. **Create New Blueprint**
   - Click "New" → "Blueprint"
   - Connect your GitHub account if not already connected
   - Select repository: `moroshek/CCTwinCities-MCP`
   - Render will detect `render.yaml` automatically

3. **Review Configuration**
   - Service Name: `cctc-mcp-server`
   - Environment: Node
   - Plan: Free (or choose Starter/Standard)
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

4. **Set Environment Variables**
   Already configured in `render.yaml`:
   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=https://chat.openai.com,https://chatgpt.com
   ```

5. **Deploy**
   - Click "Apply"
   - Render will build and deploy automatically
   - First deploy takes ~5-10 minutes

6. **Get Your URL**
   - After deployment, you'll get a URL like:
   - `https://cctc-mcp-server.onrender.com`

---

### Option 2: Manual Setup (Without render.yaml)

1. **Create New Web Service**
   - Dashboard → New → Web Service
   - Connect GitHub: `moroshek/CCTwinCities-MCP`

2. **Configure Build Settings**
   ```
   Name: cctc-mcp-server
   Environment: Node
   Region: Oregon (or closest to your users)
   Branch: main
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

3. **Configure Environment Variables**
   In Render Dashboard → Environment tab:
   ```
   NODE_ENV = production
   ALLOWED_ORIGINS = https://chat.openai.com,https://chatgpt.com
   ```

4. **Advanced Settings** (Optional)
   - Health Check Path: `/health`
   - Auto-Deploy: On (deploys on git push)

5. **Create Web Service**
   - Click "Create Web Service"
   - Wait for build to complete (~5-10 minutes)

---

## ⚙️ Environment Variables Explained

### Required Variables

**`NODE_ENV=production`**
- Enables production mode
- Widget HTML validation fails if not built (prevents serving broken widget)
- More strict error handling

**`ALLOWED_ORIGINS`**
- CORS configuration
- Must include ChatGPT domains for the app to work
- Format: Comma-separated list (no spaces)
- Example: `https://chat.openai.com,https://chatgpt.com`

### Optional Variables (Already Have Defaults)

**`PORT`**
- **Don't set this!** Render automatically sets it.
- Your code already reads `process.env.PORT || 2091`
- Render uses dynamic ports (usually 10000)

**Rate Limiting** (uses defaults in code):
- Window: 15 minutes
- Max: 100 requests per IP
- To override, modify `src/index.ts` lines 494-498

---

## 🔧 Render-Specific Configuration

### 1. Check PORT Configuration

Your `src/index.ts` line 554 already handles this correctly:
```typescript
const PORT = process.env.PORT || 2091;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
});
```

✅ **No changes needed** - Render will set PORT automatically.

### 2. Health Check Endpoint

Already configured at `/health` endpoint (line 549-551):
```typescript
app.get("/health", (req, res) => {
  res.json({ status: "ok", name: "CCTwinCities MCP Server" });
});
```

✅ **No changes needed** - Render will use this for monitoring.

### 3. Build Process

Your `package.json` already has correct scripts:
```json
{
  "scripts": {
    "build": "tsc && npm run build:widget",
    "start": "node dist/index.js"
  }
}
```

✅ **No changes needed** - Render will run these automatically.

---

## 🔒 Security Considerations

### HTTPS
- ✅ Render provides free SSL certificates automatically
- Your app will be available at `https://cctc-mcp-server.onrender.com`
- No configuration needed

### CORS
- ✅ Already configured in code to read `ALLOWED_ORIGINS` env var
- Set to ChatGPT domains: `https://chat.openai.com,https://chatgpt.com`

### Rate Limiting
- ✅ Already enabled: 100 requests per 15 minutes per IP
- Configured in `src/index.ts` lines 493-501

### CSP Headers
- ✅ Already configured in `src/index.ts` lines 483-491
- Prevents XSS attacks

### No Secrets Required
- ✅ No API keys or database credentials needed for POC
- ✅ Data is static (CC.json)
- ✅ No authentication required

---

## 📡 Connect to ChatGPT

### After Deployment

1. **Get Your Render URL**
   - From Render Dashboard
   - Example: `https://cctc-mcp-server.onrender.com`

2. **Test Health Endpoint**
   ```bash
   curl https://cctc-mcp-server.onrender.com/health
   # Should return: {"status":"ok","name":"CCTwinCities MCP Server"}
   ```

3. **Configure in ChatGPT**
   - Go to ChatGPT Settings → Connectors
   - Click "Create Connector"
   - Fill in:
     ```
     Name: CCTwinCities
     Description: Catholic Charities Twin Cities volunteer and donation info
     Connector URL: https://cctc-mcp-server.onrender.com/mcp
     ```
   - Save

4. **Enable in Chat**
   - Start new chat
   - Click "+" → "Developer mode"
   - Toggle on "CCTwinCities"

5. **Test**
   - Try: "I want to volunteer in Minneapolis"
   - Or: "@CCTwinCities find volunteer opportunities"

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Widget not built"**
```
⚠️ Widget not built. Run `npm run build:widget`
```
**Solution:** This shouldn't happen on Render because `npm run build` includes widget build.

Check build logs in Render Dashboard → Logs tab.

---

**Error: "Invalid CC.json"**
```
❌ Failed to load CC.json: Invalid CC.json structure
```
**Solution:**
- Verify CC.json is committed to git
- Check JSON syntax with `cat CC.json | jq .`

---

### Deployment Succeeds but App Crashes

**Check Render Logs:**
- Dashboard → Your Service → Logs tab
- Look for startup errors

**Common Issues:**
1. Missing dependencies: Run `npm install` locally to verify package.json
2. TypeScript errors: Run `npm run build` locally to verify
3. Port binding: Render sets PORT automatically, don't override

---

### Health Check Fails

**Symptom:** Render shows "Service Unavailable"

**Check:**
1. Health endpoint returns 200 OK:
   ```bash
   curl -I https://your-app.onrender.com/health
   ```
2. Server is listening on correct port (check logs for "Server running on port...")

---

### CORS Errors in ChatGPT

**Symptom:** Browser console shows CORS policy errors

**Solution:**
1. Verify `ALLOWED_ORIGINS` env var is set correctly
2. Should include: `https://chat.openai.com,https://chatgpt.com`
3. No spaces in the comma-separated list
4. Restart service after changing env vars

---

### Rate Limit Issues

**Symptom:** "Too many requests" errors

**Temporary Fix:**
- Wait 15 minutes for rate limit window to reset

**Permanent Fix:**
- Increase limit in `src/index.ts` line 497: `max: 100` → `max: 200`
- Rebuild and redeploy

---

## 📊 Monitoring

### Render Dashboard

**Metrics Available (Free Tier):**
- CPU usage
- Memory usage
- Request count
- Response times
- Error rates

**Logs:**
- Real-time streaming logs
- Search and filter
- Download logs

### Health Checks

Render automatically pings `/health` every 30 seconds:
- If fails 3 times → marks as unhealthy
- If unhealthy for 10 minutes → restarts service

### Alerts (Paid Tier)

Set up notifications for:
- Service crashes
- High error rates
- Health check failures
- Deployment failures

---

## 🔄 CI/CD (Continuous Deployment)

### Automatic Deployment

With `autoDeploy: true` in `render.yaml`:
1. Push to GitHub `main` branch
2. Render detects change
3. Automatically builds and deploys
4. Zero-downtime deployment

### Manual Deployment

From Render Dashboard:
1. Go to your service
2. Click "Manual Deploy"
3. Select branch (main)
4. Click "Deploy"

### Deployment Notifications

Enable in Render Dashboard:
- Email notifications on deploy success/failure
- Slack webhook integration
- Discord webhook integration

---

## 💰 Pricing

### Free Tier (Current)
- ✅ Free HTTPS/SSL
- ✅ 750 hours/month (enough for always-on)
- ✅ Automatic deploys
- ✅ Health checks
- ⚠️ Spins down after 15 minutes of inactivity
- ⚠️ Cold start time: ~30 seconds

**Note:** Free tier apps spin down when idle. First request after inactivity takes ~30 seconds.

### Starter Tier ($7/month)
- ✅ Always on (no spin down)
- ✅ 512 MB RAM
- ✅ 0.1 CPU
- ✅ Better for production demos

### Standard Tier ($25/month)
- ✅ 2 GB RAM
- ✅ 0.5 CPU
- ✅ Better performance for higher traffic

**Recommendation for POC:** Start with Free tier, upgrade to Starter ($7/mo) for demo/presentation.

---

## 🚀 Production Checklist

Before going live with leadership:

- [ ] Deploy to Render successfully
- [ ] Test health endpoint: `curl https://your-app.onrender.com/health`
- [ ] Test MCP endpoint in ChatGPT
- [ ] Verify all 3 tools work:
  - [ ] Volunteer opportunities
  - [ ] Donation options
  - [ ] Organization info
- [ ] Test widget rendering
- [ ] Test interactive features (filters, buttons)
- [ ] Test 10-20 discovery prompts (see claude.md)
- [ ] Monitor logs for errors
- [ ] Consider upgrading to Starter tier ($7/mo) to prevent spin-down during demo

---

## 📚 Additional Resources

**Render Docs:**
- Getting Started: https://render.com/docs/web-services
- Node.js Guide: https://render.com/docs/deploy-node-express-app
- Environment Variables: https://render.com/docs/environment-variables
- Blueprints: https://render.com/docs/blueprint-spec

**Your Project Docs:**
- Main README: `README.md`
- Agent Guide: `claude.md`
- Audit Report: `AUDIT-FIXES.md`

---

## 🎯 Quick Reference

```bash
# Get Render URL
https://cctc-mcp-server.onrender.com

# Health Check
curl https://cctc-mcp-server.onrender.com/health

# ChatGPT Connector URL
https://cctc-mcp-server.onrender.com/mcp

# View Logs
# Render Dashboard → Your Service → Logs

# Redeploy
# Push to GitHub main branch (auto-deploys)
# Or: Render Dashboard → Manual Deploy

# Environment Variables
# Render Dashboard → Your Service → Environment
```

---

**Ready to deploy!** Follow Option 1 (render.yaml) for the smoothest experience. 🚀
