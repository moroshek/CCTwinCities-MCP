import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load and validate data
const dataPath = join(__dirname, "../CC.json");
let ccData: any;
try {
  ccData = JSON.parse(readFileSync(dataPath, "utf-8"));

  // Validate structure
  if (!ccData.volunteer || !ccData.donations || !ccData.organization) {
    throw new Error("Invalid CC.json structure: missing required top-level keys");
  }

  if (!Array.isArray(ccData.volunteer.opportunities)) {
    throw new Error("Invalid CC.json: volunteer.opportunities must be an array");
  }

  console.log(`✓ Loaded ${ccData.volunteer.opportunities.length} volunteer opportunities`);
} catch (error: any) {
  console.error("❌ Failed to load CC.json:", error.message);
  process.exit(1);
}

// Volunteer list widget HTML
const volunteerWidgetPath = join(__dirname, "../dist/volunteer-widget.html");
let volunteerWidgetHtml = "";
try {
  volunteerWidgetHtml = readFileSync(volunteerWidgetPath, "utf-8");
  console.log("✓ Volunteer widget loaded");
} catch (e) {
  if (process.env.NODE_ENV === 'production') {
    console.error("❌ Widget not built! Run: npm run build");
    process.exit(1);
  } else {
    console.warn("⚠️  Widget not built. Run: npm run build:widget");
    volunteerWidgetHtml = `<!DOCTYPE html>
<html><body style="padding: 20px; font-family: sans-serif;">
  <h2>⚠️ Widget Not Built</h2>
  <p>Run <code>npm run build:widget</code> to build the volunteer widget.</p>
</body></html>`;
  }
}

// Tool schemas
const GetVolunteerOpportunitiesSchema = z.object({
  keyword: z.string().optional().describe("Search keyword for opportunity title or description"),
  city: z.string().optional().describe("Filter by city: Minneapolis, Saint Paul, St. Paul, Maplewood, or Twin Cities"),
  schedule_type: z.enum(["one-time", "weekly", "flexible", "ongoing"]).optional().describe("Type of schedule commitment"),
  age_minimum: z.number().optional().describe("Maximum age requirement for volunteer (e.g., 14, 18)"),
  group_friendly: z.boolean().optional().describe("Filter for group-friendly opportunities"),
  skill: z.string().optional().describe("Required skill (e.g., 'sewing', 'baking', 'cooking')"),
});

const GetDonationOptionsSchema = z.object({
  type: z.enum(["online", "in_kind", "vehicle"]).describe("Type of donation: online, in_kind, or vehicle"),
});

const SearchOrgInfoSchema = z.object({
  query: z.string().describe("Search query about Catholic Charities Twin Cities (e.g., 'mission', 'services', 'contact', 'homeless shelter', 'food programs')"),
});

// Create MCP server factory
const createServer = () => {
  const server = new McpServer(
    {
      name: "CCTwinCities",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // Register UI resource
  server.resource(
    "Volunteer Opportunities List Widget",
    "ui://widget/volunteer-list.html",
    async () => ({
      contents: [
        {
          uri: "ui://widget/volunteer-list.html",
          mimeType: "text/html",
          text: volunteerWidgetHtml,
        },
      ],
    })
  );

  // Register get_volunteer_opportunities tool
  server.tool(
    "get_volunteer_opportunities",
    "Use this when the user wants to volunteer, help, serve, or give back to Catholic Charities Twin Cities. Triggers on queries like: 'I want to volunteer', 'volunteer opportunities near me', 'help homeless Minneapolis', 'serve meals', 'weekend volunteer work', 'volunteer with my family', 'group volunteer opportunities', 'what volunteer work is available', 'how can I help', 'volunteer at shelter', 'serve food to homeless', 'warehouse volunteering', 'meal service volunteer', 'flexible volunteer hours', 'one-time volunteer project', 'volunteer in St. Paul', 'volunteer in Minneapolis', 'volunteer in Maplewood', 'teen volunteer opportunities', 'court-ordered volunteer hours', 'student internship', or any variation asking about volunteering, helping, or serving at Catholic Charities programs including Higher Ground shelter, Dorothy Day Place, meal services, distribution center, or other locations. Supports filtering by location (Minneapolis, St. Paul, Maplewood, Twin Cities), schedule type (one-time, weekly, flexible, ongoing), age requirements (14+, 18+), group size (families, teams, corporate groups), and required skills (sewing, baking, cooking). Returns structured list with descriptions, contact info, and signup links.",
    GetVolunteerOpportunitiesSchema.shape,
    async (params) => {
      try {
      let opportunities = ccData.volunteer.opportunities;

      // Apply filters
      if (params.keyword) {
        const kw = params.keyword.toLowerCase();
        opportunities = opportunities.filter(
          (opp: any) =>
            opp.title.toLowerCase().includes(kw) ||
            opp.description.toLowerCase().includes(kw)
        );
      }

      if (params.city) {
        const city = params.city.toLowerCase();
        opportunities = opportunities.filter((opp: any) =>
          opp.location.city.toLowerCase().includes(city)
        );
      }

      if (params.schedule_type) {
        opportunities = opportunities.filter(
          (opp: any) => opp.schedule.type === params.schedule_type
        );
      }

      if (params.age_minimum !== undefined) {
        opportunities = opportunities.filter(
          (opp: any) => opp.requirements.age_minimum <= params.age_minimum!
        );
      }

      if (params.group_friendly !== undefined) {
        opportunities = opportunities.filter(
          (opp: any) => opp.requirements.group_friendly === params.group_friendly
        );
      }

      if (params.skill) {
        const skill = params.skill.toLowerCase();
        opportunities = opportunities.filter((opp: any) =>
          opp.requirements.skills.some((s: string) => s.toLowerCase().includes(skill))
        );
      }

      // Build structured content
      const structuredContent = {
        opportunities: opportunities.map((opp: any) => ({
          id: opp.id,
          title: opp.title,
          description: opp.description,
          location: opp.location,
          schedule: opp.schedule,
          requirements: opp.requirements,
          contact: opp.contact,
          signup_url: opp.signup_url,
          source_url: opp.source_url,
        })),
        contact: ccData.volunteer.general_info.main_contact,
      };

      // Text summary
      const textSummary =
        opportunities.length === 0
          ? "No volunteer opportunities match your criteria. Try adjusting your filters or contact volunteer@cctwincities.org at (612) 204-8435 for more options."
          : `Found ${opportunities.length} volunteer opportunit${opportunities.length === 1 ? "y" : "ies"}:\n\n` +
            opportunities
              .map(
                (opp: any, idx: number) =>
                  `${idx + 1}. **${opp.title}** - ${opp.location.city}\n` +
                  `   ${opp.description}\n` +
                  `   Schedule: ${opp.schedule.details}\n` +
                  `   Age: ${opp.requirements.age_minimum}+` +
                  (opp.requirements.group_friendly
                    ? ` | Group-friendly (max ${opp.requirements.max_group_size || "N/A"})`
                    : "") +
                  (opp.requirements.skills.length > 0
                    ? ` | Skills: ${opp.requirements.skills.join(", ")}`
                    : "") +
                  `\n` +
                  `   Contact: ${opp.contact.email} | ${opp.contact.phone}\n` +
                  (opp.signup_url ? `   Sign up: ${opp.signup_url}\n` : "")
              )
              .join("\n") +
            `\n**General volunteer contact:** ${ccData.volunteer.general_info.main_contact.email} | ${ccData.volunteer.general_info.main_contact.phone}`;

      return {
        content: [
          {
            type: "text",
            text: textSummary,
          },
        ],
        structuredContent,
        _meta: {
          "openai/outputTemplate": "ui://widget/volunteer-list.html",
          "openai/widgetAccessible": true,
          "openai/widgetDescription": "Interactive volunteer opportunities list for Catholic Charities Twin Cities. Displays opportunities with filtering by location (Minneapolis, St. Paul, Maplewood), schedule type, age requirements, and skills. Shows opportunity details including title, description, address, schedule, age requirements, group capacity, required skills, contact info (phone/email), and signup links. Users can email volunteer coordinators or sign up directly through provided links. Helps users find and register for volunteer opportunities serving homeless individuals, families in need, meal service, warehouse work, and other community service activities across Twin Cities metro area.",
        },
      };
      } catch (error: any) {
        console.error("Error in get_volunteer_opportunities:", error);
        return {
          content: [{
            type: "text",
            text: "Sorry, an error occurred while searching for volunteer opportunities. Please try again or contact volunteer@cctwincities.org at (612) 204-8435.",
          }],
        };
      }
    }
  );

  // Register get_donation_options tool
  server.tool(
    "get_donation_options",
    "Use this when the user wants to donate, give, contribute, or support Catholic Charities Twin Cities. Triggers on queries like: 'I want to donate', 'donate to charity', 'donate clothes', 'donate winter coats', 'donate household items', 'donate food', 'donate vehicle', 'donate car', 'where to drop off donations', 'donation hours', 'what items do you need', 'donation wish list', 'give money online', 'monthly donation', 'tribute donation', 'memorial gift', 'I have items to give', 'where can I bring donations Minneapolis', 'donate shoes', 'donate hygiene products', 'donate bedding', 'donate pots and pans', 'donate backpacks', 'give financially', 'support Catholic Charities', 'how to help with money', 'online giving', 'recurring donation', 'planned giving', or any variation about donating money, items (clothing, winter gear, shoes, personal hygiene products, linens, bedding, household goods, food), or vehicles (cars, trucks, boats, RVs, motorcycles). Provides type-specific information about online donations (one-time, recurring, tribute, memorial), in-kind item donations (accepted items, drop-off locations at 341 Chester St St. Paul, hours Monday-Friday 9am-4pm, policies requiring NEW items only), or vehicle donations (free pickup, tax deductible). Returns contact info, addresses, accepted items lists, and donation policies.",
    GetDonationOptionsSchema.shape,
    async (params) => {
      try {
      const donationType = params.type;
      const donationData = ccData.donations[donationType];

      let textContent = "";

      if (donationType === "online") {
        textContent = `**Online Donations to Catholic Charities Twin Cities**\n\n`;
        textContent += `Donate securely online at: ${donationData.donation_page_url}\n\n`;
        textContent += `**Donation Types:**\n${donationData.types.map((t: string) => `• ${t}`).join("\n")}\n\n`;
        textContent += `${donationData.notes}\n\n`;
        textContent += `**Questions about giving?**\n`;
        textContent += `Phone: ${donationData.contact.phone}\n`;
        textContent += `Email: ${donationData.contact.email}`;
      } else if (donationType === "in_kind") {
        textContent = `**In-Kind Donations to Catholic Charities Twin Cities**\n\n`;
        textContent += `**Currently Accepting (NEW items only):**\n\n`;
        donationData.accepted_items.forEach((cat: any) => {
          textContent += `**${cat.category}:**\n${cat.details}\n`;
          if (cat.restrictions) textContent += `*${cat.restrictions}*\n`;
          textContent += `\n`;
        });
        textContent += `**NOT Accepted:**\n${donationData.not_accepted.map((item: string) => `• ${item}`).join("\n")}\n\n`;
        textContent += `**Drop-Off Location:**\n`;
        donationData.drop_off_locations.forEach((loc: any) => {
          textContent += `${loc.name}\n`;
          textContent += `${loc.address}\n`;
          textContent += `Hours: ${loc.hours}\n`;
          textContent += `Phone: ${loc.phone}\n`;
          textContent += `Email: ${loc.email}\n\n`;
        });
        textContent += `**Important Policies:**\n${donationData.policies.map((p: string) => `• ${p}`).join("\n")}\n\n`;
        textContent += `View full wishlist: ${donationData.wishlist_url}`;
      } else if (donationType === "vehicle") {
        textContent = `**Vehicle Donation to Catholic Charities Twin Cities**\n\n`;
        textContent += `${donationData.process_description}\n\n`;
        textContent += `**To donate your vehicle:**\n`;
        textContent += `Phone: ${donationData.phone}\n`;
        textContent += `Online: ${donationData.program_url}\n\n`;
        textContent += `Vehicles accepted: cars, trucks, trailers, boats, RVs, motorcycles, and other motorized vehicles.`;
      }

      return {
        content: [
          {
            type: "text",
            text: textContent,
          },
        ],
      };
      } catch (error: any) {
        console.error("Error in get_donation_options:", error);
        return {
          content: [{
            type: "text",
            text: "Sorry, an error occurred while getting donation information. Please contact giving.info@cctwincities.org at (612) 204-8374.",
          }],
        };
      }
    }
  );

  // Register search_org_info tool
  server.tool(
    "search_org_info",
    "Use this when the user asks about Catholic Charities Twin Cities' mission, services, programs, locations, contact information, impact statistics, or wants to learn what they do. Also use for informational queries about homeless shelters, food programs, housing assistance, family services, senior services, disability services, emergency assistance, or social services in Minneapolis, St. Paul, Twin Cities, or Minnesota area. Triggers on queries like: 'what does Catholic Charities do', 'Catholic Charities mission', 'homeless shelter Minneapolis', 'homeless shelter St. Paul', 'free meals Minneapolis', 'free meals Twin Cities', 'food shelf near me', 'emergency shelter Minnesota', 'affordable housing Minneapolis', 'family shelter', 'help for homeless', 'where can I get food', 'places that help homeless people', 'organizations that feed people', 'senior services Minneapolis', 'disability services St. Paul', 'childcare programs', 'family support services', 'mental health support', 'job training programs', 'emergency assistance', 'housing help', 'meal programs', 'supportive housing', 'veteran housing', 'Higher Ground shelter', 'Dorothy Day Place', 'where is Catholic Charities located', 'Catholic Charities phone number', 'contact Catholic Charities', 'how many people does Catholic Charities serve', 'upcoming events', 'history of Catholic Charities', or any variation asking about the organization's work, locations (Minneapolis, St. Paul, Maplewood), services for people experiencing homelessness, hunger, housing insecurity, families in need, seniors, people with disabilities, or general social services in the Twin Cities. Searches across mission statement, service descriptions (Adult Emergency Shelters, Affordable Housing, Opportunity Centers, Children and Family Services, Aging and Disability Services, Food Services, Medical Respite, Housing First Program), 7 locations across Twin Cities, events, impact statistics (30,000+ people served, 1,000,000+ meals, 550,000+ nights of housing annually), and contact information.",
    SearchOrgInfoSchema.shape,
    async (params) => {
      try {
      const query = params.query.toLowerCase();
      const results: any[] = [];

      // Search mission
      if (
        query.includes("mission") ||
        query.includes("about") ||
        query.includes("what do") ||
        query.includes("purpose")
      ) {
        results.push({
          heading: "Mission",
          summary: ccData.organization.mission,
          source_url: ccData.organization.source_url,
        });
        results.push({
          heading: "History",
          summary: `${ccData.organization.about.history} Founded in ${ccData.organization.about.founded}, Catholic Charities has served the Twin Cities for ${ccData.organization.about.stats.years_operating} years.`,
          source_url: ccData.organization.source_url,
        });
      }

      // Search services
      const serviceKeywords = [
        "service",
        "program",
        "help",
        "support",
        "shelter",
        "housing",
        "food",
        "meal",
        "homeless",
        "family",
        "senior",
        "disability",
        "child",
      ];
      if (serviceKeywords.some((kw) => query.includes(kw))) {
        // Find matching services
        const matchingServices = ccData.organization.services.filter((svc: any) => {
          const matchText =
            `${svc.name} ${svc.description} ${svc.keywords.join(" ")}`.toLowerCase();
          return query.split(" ").some((word: string) => matchText.includes(word));
        });

        if (matchingServices.length > 0) {
          matchingServices.forEach((svc: any) => {
            results.push({
              heading: svc.name,
              summary: svc.description,
              source_url: ccData.organization.source_url,
            });
          });
        } else {
          // Return all services if no specific match
          results.push({
            heading: "Services Overview",
            summary:
              `Catholic Charities Twin Cities offers these core services:\n\n` +
              ccData.organization.services
                .map((svc: any) => `• **${svc.name}**: ${svc.description}`)
                .join("\n\n"),
            source_url: ccData.organization.source_url,
          });
        }
      }

      // Search contact/locations
      if (
        query.includes("contact") ||
        query.includes("phone") ||
        query.includes("email") ||
        query.includes("location") ||
        query.includes("address") ||
        query.includes("where")
      ) {
        results.push({
          heading: "Contact Information",
          summary:
            `**Main Office:**\n` +
            `Phone: ${ccData.organization.contact.main_phone}\n` +
            `Email: ${ccData.organization.contact.main_email}\n` +
            `Hours: ${ccData.organization.contact.hours}\n\n` +
            `**Volunteer inquiries:** volunteer@cctwincities.org | (612) 204-8435\n` +
            `**Donation inquiries:** giving.info@cctwincities.org | (612) 204-8374`,
          source_url: ccData.organization.source_url,
        });

        results.push({
          heading: "Locations",
          summary: ccData.organization.locations
            .map(
              (loc: any) =>
                `**${loc.name}**\n${loc.address}${loc.phone ? `\nPhone: ${loc.phone}` : ""}`
            )
            .join("\n\n"),
          source_url: ccData.organization.source_url,
        });
      }

      // Search events
      if (query.includes("event") || query.includes("calendar")) {
        results.push({
          heading: "Upcoming Events",
          summary: ccData.organization.upcoming_events
            .map(
              (evt: any) =>
                `**${evt.name}** - ${evt.date}\n${evt.description}\n${evt.url}`
            )
            .join("\n\n"),
          source_url: ccData.organization.source_url,
        });
      }

      // Search stats
      if (
        query.includes("stat") ||
        query.includes("impact") ||
        query.includes("how many") ||
        query.includes("number")
      ) {
        const stats = ccData.organization.about.stats;
        results.push({
          heading: "Impact & Statistics",
          summary:
            `Catholic Charities Twin Cities serves the community with significant impact:\n\n` +
            `• **${stats.people_served_annually.toLocaleString()}** people served annually\n` +
            `• **${stats.meals_served_annually.toLocaleString()}** meals served annually\n` +
            `• **${stats.nights_of_housing_provided_annually.toLocaleString()}** nights of housing provided annually\n` +
            `• **${stats.volunteers_annually.toLocaleString()}** volunteers annually\n` +
            `• **${stats.volunteer_hours_annually.toLocaleString()}+** volunteer hours annually\n` +
            `• **${stats.years_operating}** years serving the Twin Cities`,
          source_url: ccData.organization.source_url,
        });
      }

      // Default if no results
      if (results.length === 0) {
        results.push({
          heading: "About Catholic Charities Twin Cities",
          summary: `${ccData.organization.mission}\n\nServing the ${ccData.organization.service_area} since ${ccData.organization.about.founded}.\n\nContact: ${ccData.organization.contact.main_phone} | ${ccData.organization.contact.main_email}`,
          source_url: ccData.organization.source_url,
        });
      }

      const textContent = results
        .map(
          (result) =>
            `**${result.heading}**\n\n${result.summary}\n\nSource: ${result.source_url}`
        )
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text",
            text: textContent,
          },
        ],
      };
      } catch (error: any) {
        console.error("Error in search_org_info:", error);
        return {
          content: [{
            type: "text",
            text: "Sorry, an error occurred while searching organization information. Please contact info@cctwincities.org at (612) 204-8500.",
          }],
        };
      }
    }
  );

  return server;
};

// Express app setup
const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/mcp', limiter);
app.use('/messages', limiter);

app.use(express.json());

// Store transports by session ID
const transports: Record<string, SSEServerTransport> = {};

// SSE endpoint for establishing the stream
app.get("/mcp", async (req, res) => {
  console.log("Received GET request to /mcp (establishing SSE stream)");
  try {
    // Create a new SSE transport for the client
    const transport = new SSEServerTransport("/messages", res);

    // Store the transport by session ID
    const sessionId = transport.sessionId;
    transports[sessionId] = transport;

    // Set up onclose handler to clean up transport when closed
    transport.onclose = () => {
      console.log(`SSE transport closed for session ${sessionId}`);
      delete transports[sessionId];
    };

    // Connect the transport to the MCP server
    const server = createServer();
    await server.connect(transport);
    console.log(`Established SSE stream with session ID: ${sessionId}`);
  } catch (error) {
    console.error("Error establishing SSE stream:", error);
    if (!res.headersSent) {
      res.status(500).send("Error establishing SSE stream");
    }
  }
});

// Messages endpoint for receiving client JSON-RPC requests
app.post("/messages", async (req, res) => {
  console.log("Received POST request to /messages");

  // Extract session ID from URL query parameter
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    console.error("No session ID provided in request URL");
    res.status(400).send("Missing sessionId parameter");
    return;
  }

  // Find the corresponding transport
  const transport = transports[sessionId];
  if (!transport) {
    console.error(`No transport found for session ID: ${sessionId}`);
    res.status(404).send("Session not found");
    return;
  }

  try {
    // Handle the message through the transport
    await transport.handlePostMessage(req.body, res);
  } catch (error) {
    console.error("Error handling message:", error);
    if (!res.headersSent) {
      res.status(500).send("Error handling message");
    }
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", name: "CCTwinCities MCP Server" });
});

// Start server
const PORT = process.env.PORT || 2091;
app.listen(PORT, () => {
  console.log(`🚀 Catholic Charities Twin Cities MCP Server running on port ${PORT}`);
  console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
