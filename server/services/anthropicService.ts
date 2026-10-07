import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

export class AnthropicService {
  private client: Anthropic | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  public isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  public async analyzeStock(symbol: string, companyName: string, price: number, prompt: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables.');
    }

    const anthropic = this.client || new Anthropic({ apiKey });

    const systemPrompt = `You are Anthropic Claude, a senior Wall Street quantitative research analyst and trading strategist at AlphaPulse Terminal.
Analyze financial instruments, market trends, technical patterns, risk profiles, and macroeconomic sentiment. Provide structured, high-conviction insights with key levels (Support, Resistance, Target).`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Instrument: ${symbol} (${companyName})
Current Price: $${price.toFixed(2)}

User Analysis Request:
${prompt}`,
        },
      ],
    });

    const contentBlock = response.content[0];
    if (contentBlock && contentBlock.type === 'text') {
      return contentBlock.text;
    }
    return 'No text generated from Anthropic Claude API.';
  }
}

export const anthropicService = new AnthropicService();
