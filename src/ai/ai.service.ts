// src/ai/ai.service.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import fetch from 'node-fetch';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/parisma.service';
import { v4 as uuidv4 } from 'uuid';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openAiKey: string;
  private readonly model: string;
  private readonly cacheTtlSeconds: number;
  private readonly rateLimitWindow = 60; // seconds
  private readonly rateLimitMax = 30; // max requests per window per user

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {
    this.openAiKey = this.config.get<string>('OPENAI_API_KEY') || '';
    this.model = this.config.get<string>('OPENAI_MODEL') || 'gpt-4o';
    this.cacheTtlSeconds = Number(this.config.get<number>('AI_CACHE_TTL') ?? 60 * 60 * 24); // default 24h
  }

  /** rate limit per userId (use "anonymous" for unauthenticated) */
  private async checkRateLimit(userId = 'anonymous'): Promise<void> {
    try {
      const key = `ai:rate:${userId}`;
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, this.rateLimitWindow);
      }
      if (current > this.rateLimitMax) {
        throw new Error('Rate limit exceeded');
      }
    } catch (err) {
      this.logger.warn('Rate limit check error: ' + (err as Error).message);
      throw err;
    }
  }

  /** Simple cache key builder */
  private buildCacheKey(type: string, payload: object) {
    // deterministic: JSON stringify sorted keys would be better
    return `ai:cache:${type}:${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
  }

  /** call OpenAI chat completion - safe wrapper */
  private async callOpenAi(prompt: string): Promise<string> {
    if (!this.openAiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const url = 'https://api.openai.com/v1/chat/completions';

    try {
      const body = {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.8,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openAiKey}`,
        },
        body: JSON.stringify(body),
        timeout: 4500, // attempt to keep under 5s
      } as any);

      if (!res.ok) {
        const txt = await res.text();
        this.logger.error(`OpenAI error: ${res.status} ${txt}`);
        throw new Error(`OpenAI error ${res.status}`);
      }

      const json = await res.json();
      // The exact path depends on API shape: chat.completions.choices[0].message.content
      const content = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text ?? '';
      return String(content).trim();
    } catch (err) {
      this.logger.error('OpenAI call failed: ' + (err as Error).message);
      throw err;
    }
  }

  /** public API: generate recipe improvement suggestions */
  async suggestImprovements(userId: string | undefined, recipeId?: string, ingredients?: string[]) {
    const uid = userId || 'anonymous';
    await this.checkRateLimit(uid);

    // build payload
    let recipeText = '';
    if (recipeId) {
      const recipe = await this.prisma.recipe.findUnique({
        where: { id: recipeId },
        include: { ingredients: true, instructions: true, author: true },
      });
      if (!recipe) throw new Error('Recipe not found');
      recipeText = `Title: ${recipe.title}\nDescription: ${recipe.description ?? ''}\nIngredients:\n${(recipe.ingredients ?? [])
        .map((i: any) => `- ${i.name} ${i.quantity ?? ''}`)
        .join('\n')}\nInstructions:\n${(recipe.instructions ?? []).map((s: any) => `${s.stepNumber}. ${s.text}`).join('\n')}`;
    } else if (ingredients && ingredients.length) {
      recipeText = `Ingredients: ${ingredients.join(', ')}`;
    } else {
      throw new Error('Either recipeId or ingredients required');
    }

    const cacheKey = this.buildCacheKey('improve', { recipeText });
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return {
        id: `cache-${uuidv4()}`,
        summary: 'Cached suggestion',
        details: cached,
        source: 'cache',
        createdAt: new Date().toISOString(),
      };
    }

    const prompt = [
      'You are a helpful recipe assistant. Analyze the recipe below and provide:',
      '1) Short summary of improvements (1-2 sentences).',
      '2) Specific ingredient changes or additions (bullet list).',
      '3) Any technique or timing suggestions.',
      '4) One simple alternative for dietary restrictions if applicable.',
      'Return as plain text with clear sections.',
      '---',
      recipeText,
    ].join('\n\n');

    const response = await this.callOpenAi(prompt);
    // cache
    await this.redis.set(cacheKey, response, 'EX', this.cacheTtlSeconds);

    return {
      id: `ai-${uuidv4()}`,
      summary: response.split('\n').slice(0, 2).join(' '),
      details: response,
      source: 'openai',
      createdAt: new Date().toISOString(),
    };
  }

  /** ingredient substitution suggestions */
  async suggestSubstitutions(userId: string | undefined, ingredients: string[], restriction?: string) {
    const uid = userId || 'anonymous';
    await this.checkRateLimit(uid);

    const payload = { ingredients, restriction: restriction ?? '' };
    const cacheKey = this.buildCacheKey('subs', payload);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return {
        id: `cache-${uuidv4()}`,
        summary: 'Cached substitutions',
        details: cached,
        source: 'cache',
        createdAt: new Date().toISOString(),
      };
    }

    const prompt = [
      `You are an expert chef and dietitian. Given the ingredients: ${ingredients.join(', ')}`,
      restriction ? `Provide substitutions suitable for: ${restriction}` : 'Provide substitutions for common constraints (vegan, gluten-free, nut-free).',
      'For each ingredient, give 1-2 substitutions and a brief note on flavor/texture difference.',
    ].join('\n\n');

    const response = await this.callOpenAi(prompt);
    await this.redis.set(cacheKey, response, 'EX', this.cacheTtlSeconds);

    return {
      id: `ai-${uuidv4()}`,
      summary: response.split('\n').slice(0, 2).join(' '),
      details: response,
      source: 'openai',
      createdAt: new Date().toISOString(),
    };
  }

  /** cooking tips and technique suggestions */
  async suggestCookingTips(userId: string | undefined, recipeId?: string, complexity?: 'easy' | 'medium' | 'hard') {
    const uid = userId || 'anonymous';
    await this.checkRateLimit(uid);

    let context = complexity ? `Complexity: ${complexity}` : '';
    if (recipeId) {
      const r = await this.prisma.recipe.findUnique({ where: { id: recipeId }, include: { instructions: true, ingredients: true } });
      if (!r) throw new Error('Recipe not found');
      context += `\nTitle: ${r.title}\nInstructions:\n${r.instructions.map((s: any) => `${s.stepNumber}. ${s.text}`).join('\n')}`;
    }

    const cacheKey = this.buildCacheKey('tips', { context });
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { id: `cache-${uuidv4()}`, summary: 'Cached tips', details: cached, source: 'cache', createdAt: new Date().toISOString() };
    }

    const prompt = `You are a professional chef. Based on: ${context}\nProvide 5 practical cooking tips and techniques to improve outcome. Short bullets.`;
    const response = await this.callOpenAi(prompt);
    await this.redis.set(cacheKey, response, 'EX', this.cacheTtlSeconds);

    return { id: `ai-${uuidv4()}`, summary: response.split('\n')[0] ?? '', details: response, source: 'openai', createdAt: new Date().toISOString() };
  }

  /** pairing suggestions (wine/side dishes) */
  async suggestPairings(userId: string | undefined, recipeId?: string) {
    const uid = userId || 'anonymous';
    await this.checkRateLimit(uid);

    let name = '';
    if (recipeId) {
      const r = await this.prisma.recipe.findUnique({ where: { id: recipeId } });
      if (!r) throw new Error('Recipe not found');
      name = r.title;
    }

    const cacheKey = this.buildCacheKey('pair', { recipeId, name });
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { id: `cache-${uuidv4()}`, summary: 'Cached pairings', details: cached, source: 'cache', createdAt: new Date().toISOString() };
    }

    const prompt = `Suggest 3 wine pairings and 3 side dishes for the recipe: ${name || 'the following ingredients: '}. Explain briefly each choice.`;
    const response = await this.callOpenAi(prompt);
    await this.redis.set(cacheKey, response, 'EX', this.cacheTtlSeconds);

    return { id: `ai-${uuidv4()}`, summary: response.split('\n')[0] ?? '', details: response, source: 'openai', createdAt: new Date().toISOString() };
  }
}
