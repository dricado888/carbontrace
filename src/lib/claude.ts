import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

type ParsedRoute = {
  origin: string;
  destination: string;
  weight_kg: number | null;
  transport_mode: 'ground' | 'air' | 'sea' | null;
  confidence: number;
  reasoning: string;
};

export async function parseShippingRequest(userInput: string): Promise<ParsedRoute> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `Extract shipping information from this request. Return JSON only.

Request: "${userInput}"

Extract:
- origin: The starting city (use standard city name like "Shenzhen", "Los Angeles", "NYC")
- destination: The ending city (same format)
- weight_kg: Weight in kg if mentioned, null if not
- transport_mode: "ground", "air", or "sea" if mentioned or implied, null if not
- confidence: 0-1 how confident you are in the extraction
- reasoning: Brief explanation of your interpretation

Return ONLY valid JSON, no markdown, no explanation:
{"origin": "...", "destination": "...", "weight_kg": ..., "transport_mode": "...", "confidence": ..., "reasoning": "..."}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  
  try {
    return JSON.parse(text) as ParsedRoute;
  } catch {
    return {
      origin: '',
      destination: '',
      weight_kg: null,
      transport_mode: null,
      confidence: 0,
      reasoning: 'Failed to parse response',
    };
  }
}