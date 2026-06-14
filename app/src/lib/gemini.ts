import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error('GEMINI_API_KEY not set in .env.local');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string,
  jsonMode = true,
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: jsonMode
      ? {
          responseMimeType: 'application/json',
          temperature: 0.3,
        }
      : {
          temperature: 0.7,
        },
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userPrompt);
  const text = result.response.text();
  return text;
}

// ─── Segment Filter Generation ────────────────────────────────────────────────

export async function generateSegmentFilter(naturalLanguage: string) {
  const systemPrompt = `You are a CRM audience segmentation assistant. Convert natural language audience descriptions into structured filter JSON.

IMPORTANT: Return ONLY valid JSON matching this schema exactly:
{
  "filterJson": {
    "operator": "AND" | "OR",
    "conditions": [
      {
        "field": one of ["totalSpend", "lastOrderDate", "daysSinceLastOrder", "tags", "orderCount", "name", "email"],
        "op": one of ["gt", "lt", "gte", "lte", "eq", "neq", "contains", "not_contains", "in", "between", "is_null", "is_not_null"],
        "value": string | number | array of strings | null
      }
    ]
  },
  "description": "Human-readable description of this audience"
}

Field meanings:
- totalSpend: total money spent in INR (rupees)
- daysSinceLastOrder: number of days since last purchase (use for "inactive", "churned" etc)
- lastOrderDate: ISO date string
- tags: customer tags like "vip", "frequent", "new", "churned", "loyal", "high-value"
- orderCount: number of orders placed
- name: customer full name
- email: customer email address

Op meanings:
- gte/lte/gt/lt: numeric comparisons
- eq/neq: exact match
- contains: string/tag contains value
- in: field value is one of array
- between: value is [min, max] array
- is_null/is_not_null: field has/has no value`;

  const response = await generateWithGemini(systemPrompt, naturalLanguage);

  try {
    return JSON.parse(response);
  } catch {
    throw new Error('AI returned invalid JSON for segment filter');
  }
}

// ─── Campaign Copy Generation ─────────────────────────────────────────────────

export async function generateCampaignCopy(params: {
  segmentDescription: string;
  goal: string;
  channel: string;
  audienceCount: number;
}) {
  const channelConstraints: Record<string, string> = {
    sms: 'STRICT: Max 160 characters total. No subject line. Plain text only. Must include opt-out hint.',
    email: 'Include a subject line AND body. Body can be 200-500 words. Personalize with [Name]. Can use formatting.',
    whatsapp: 'Conversational, warm tone. 1-3 short paragraphs. Emojis encouraged. Max 500 chars. No formal subject.',
    rcs: 'Rich conversational tone. 1-3 paragraphs. Can suggest buttons/CTAs. Max 800 chars. Engaging.',
  };

  const goalContext: Record<string, string> = {
    'win-back': 'Re-engage customers who haven\'t purchased recently. Offer an incentive or reminder of value.',
    'upsell': 'Encourage customers to try a premium product or add complementary items.',
    'new-arrival': 'Announce a new product/collection. Create excitement and urgency.',
    'retention': 'Thank loyal customers and reinforce their relationship with the brand.',
    'promotional': 'Promote a sale, discount, or limited-time offer.',
  };

  const systemPrompt = `You are an expert D2C marketing copywriter. Generate engaging campaign messages.

Return ONLY valid JSON with this exact schema:
{
  "variants": [
    {
      "id": "v1",
      "subject": "string (only for email, null otherwise)",
      "content": "the message content",
      "preview": "first 100 chars for preview",
      "tone": "formal | casual | urgent | warm"
    }
  ]
}

Generate exactly 3 variants with different tones/approaches.`;

  const userPrompt = `Create ${params.channel.toUpperCase()} campaign messages for:
- Audience: ${params.segmentDescription} (${params.audienceCount} customers)
- Goal: ${goalContext[params.goal] || params.goal}
- Channel constraints: ${channelConstraints[params.channel] || 'Standard messaging guidelines'}

Make each variant meaningfully different in approach and tone.`;

  const response = await generateWithGemini(systemPrompt, userPrompt);
  try {
    return JSON.parse(response);
  } catch {
    throw new Error('AI returned invalid JSON for campaign copy');
  }
}

// ─── Channel Suggestion ───────────────────────────────────────────────────────

export async function generateChannelSuggestion(params: {
  segmentName: string;
  channelStats: Record<string, { opens: number; clicks: number; total: number }>;
}) {
  const systemPrompt = `You are a marketing analytics AI. Suggest the best channel for a campaign based on historical engagement data.

Return ONLY valid JSON matching this exact schema:
{
  "suggestedChannel": "whatsapp" | "sms" | "email" | "rcs",
  "rationale": "One concise sentence (max 20 words) naming the winning channel and its top stat",
  "reasoning": "A 2-3 sentence paragraph that: (1) states the exact open and click rates of the winning channel, (2) compares it to the second-best channel using a multiplier (e.g. '2.1× higher open rate than Email'), and (3) explains why this advantage matters for CRM re-engagement. Be specific and data-driven.",
  "stats": {
    "whatsapp": { "openRate": number, "clickRate": number },
    "sms": { "openRate": number, "clickRate": number },
    "email": { "openRate": number, "clickRate": number },
    "rcs": { "openRate": number, "clickRate": number }
  },
  "confidence": "high" | "medium" | "low"
}

Rules:
- openRate = (opens / total) * 100, rounded to nearest integer. If total is 0, openRate = 0.
- clickRate = (clicks / total) * 100, rounded to nearest integer. If total is 0, clickRate = 0.
- Choose the channel with the highest combined open+click signal.
- If data is sparse (total < 5 for all channels), set confidence to "low" and explain that in reasoning.`;

  const statsText = Object.entries(params.channelStats)
    .map(([ch, s]) => `${ch}: ${s.opens} opens, ${s.clicks} clicks out of ${s.total} customers`)
    .join('\n');

  const userPrompt = `Segment: "${params.segmentName}"
Historical engagement data:
${statsText}

Suggest the best channel for the next campaign targeting this segment.`;

  const response = await generateWithGemini(systemPrompt, userPrompt);
  try {
    return JSON.parse(response);
  } catch {
    throw new Error('AI returned invalid JSON for channel suggestion');
  }
}

// ─── Performance Summary ──────────────────────────────────────────────────────

export async function generatePerformanceSummary(params: {
  campaignName: string;
  channel: string;
  goal: string;
  stats: {
    total: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    converted: number;
  };
}) {
  const systemPrompt = `You are a marketing analytics AI. Write a concise, actionable campaign performance summary.

Return ONLY valid JSON:
{
  "summary": "2-3 sentence plain English summary of results, mention key metrics",
  "suggestion": "One specific, actionable recommendation for the next campaign",
  "sentiment": "positive" | "neutral" | "negative",
  "highlights": ["key metric 1", "key metric 2", "key metric 3"]
}`;

  const { stats } = params;
  const deliveryRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0;
  const openRate = stats.delivered > 0 ? Math.round((stats.opened / stats.delivered) * 100) : 0;
  const clickRate = stats.opened > 0 ? Math.round((stats.clicked / stats.opened) * 100) : 0;

  const userPrompt = `Campaign: "${params.campaignName}"
Channel: ${params.channel} | Goal: ${params.goal}
Results:
- Total targeted: ${stats.total}
- Delivered: ${stats.delivered} (${deliveryRate}%)
- Failed: ${stats.failed}
- Opened: ${stats.opened} (${openRate}% of delivered)
- Clicked: ${stats.clicked} (${clickRate}% of opened)
- Converted: ${stats.converted}

Write a performance summary and actionable next-step suggestion.`;

  const response = await generateWithGemini(systemPrompt, userPrompt, false);

  // Try JSON parse, fallback to structured mock
  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      summary: `Your ${params.channel} campaign reached ${deliveryRate}% delivery with ${openRate}% open rate and ${clickRate}% click-through rate.`,
      suggestion: `Consider A/B testing different message times for your next ${params.channel} campaign to improve open rates.`,
      sentiment: openRate > 30 ? 'positive' : openRate > 15 ? 'neutral' : 'negative',
      highlights: [`${deliveryRate}% delivery rate`, `${openRate}% open rate`, `${stats.converted} conversions`],
    };
  }
}

// ─── Mock fallbacks (used when API key is missing / rate limited) ──────────────

export function getMockSegmentFilter(naturalLanguage: string) {
  const lower = naturalLanguage.toLowerCase();
  if (lower.includes('spend') || lower.includes('₹') || lower.includes('value')) {
    return {
      filterJson: { operator: 'AND', conditions: [{ field: 'totalSpend', op: 'gte', value: 5000 }] },
      description: 'Customers who spent ₹5,000 or more',
    };
  }
  if (lower.includes('inactive') || lower.includes('churn') || lower.includes('days')) {
    return {
      filterJson: { operator: 'AND', conditions: [{ field: 'daysSinceLastOrder', op: 'gte', value: 60 }] },
      description: 'Customers inactive for 60+ days',
    };
  }
  return {
    filterJson: { operator: 'AND', conditions: [{ field: 'tags', op: 'contains', value: 'vip' }] },
    description: 'VIP customers',
  };
}
