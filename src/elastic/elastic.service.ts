// src/elastic/elastic.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(ElasticService.name);
  readonly index = 'recipes';
  readonly analyticsIndex = 'search_analytics';

  constructor(private config: ConfigService) {
    const node =
      this.config.get<string>('ELASTICSEARCH_URL') || 'http://localhost:9200';
    this.client = new Client({ node });
  }

  async onModuleInit() {
    try {
      // indices.exists returns boolean in v8
      const exists = await this.client.indices.exists({ index: this.index });
      if (!exists) {
        await this.createIndex();
        this.logger.log(`Created ES index: ${this.index}`);
      } else {
        this.logger.log(`ES index already exists: ${this.index}`);
      }

      const analyticsExists = await this.client.indices.exists({
        index: this.analyticsIndex,
      });
      if (!analyticsExists) {
        await this.client.indices.create({ index: this.analyticsIndex });
        this.logger.log(`Created ES index: ${this.analyticsIndex}`);
      }
    } catch (err) {
      this.logger.error('Error initializing elastic indices', err as any);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async createIndex() {
    return this.client.indices.create({
      index: this.index,
      body: {
        mappings: {
          properties: {
            title: { type: 'text', analyzer: 'english' },
            description: { type: 'text', analyzer: 'english' },
            authorId: { type: 'keyword' },
            authorName: { type: 'text' },
            ingredients: {
              type: 'nested',
              properties: {
                name: { type: 'keyword' },
                name_text: { type: 'text', analyzer: 'english' },
                quantity: { type: 'text' },
              },
            },
            instructions: { type: 'text' },
            avgRating: { type: 'double' },
            commentCount: { type: 'integer' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            cuisine: { type: 'keyword' },
            difficulty: { type: 'keyword' },
            cookingTimeMinutes: { type: 'integer' },
          },
        },
      },
    });
  }

  async indexRecipe(recipe: any) {
    if (!recipe || !recipe.id) return;
    const doc = {
      title: recipe.title,
      description: recipe.description ?? '',
      authorId: recipe.authorId,
      authorName: recipe.author?.name ?? null,
      ingredients: (recipe.ingredients ?? []).map((i: any) => ({
        name: (i.name ?? '').toLowerCase(),
        name_text: i.name ?? '',
        quantity: i.quantity ?? null,
      })),
      instructions: (recipe.instructions ?? [])
        .map((s: any) => s.text)
        .join('\n'),
      avgRating: recipe.avgRating ?? this.computeAvg(recipe.ratings),
      commentCount:
        recipe.commentCount ?? (recipe.comments ? recipe.comments.length : 0),
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      cuisine: recipe.cuisine ?? null,
      difficulty: recipe.difficulty ?? null,
      cookingTimeMinutes: recipe.cookingTimeMinutes ?? null,
    };

    await this.client.index({
      index: this.index,
      id: recipe.id,
      document: doc,
      refresh: 'wait_for',
    });
  }

  async deleteRecipeFromIndex(recipeId: string) {
    try {
      await this.client.delete({
        index: this.index,
        id: recipeId,
        refresh: 'wait_for',
      });
    } catch (err) {
      // ignore not found errors
    }
  }

  computeAvg(ratings: any[]) {
    if (!ratings || ratings.length === 0) return 0;
    const sum = ratings.reduce((s, r) => s + (r.score ?? 0), 0);
    return sum / ratings.length;
  }

  async bulkIndex(recipes: any[]) {
    if (!recipes || recipes.length === 0) return;
    const body: any[] = [];
    for (const r of recipes) {
      body.push({ index: { _index: this.index, _id: r.id } });
      body.push({
        title: r.title,
        description: r.description ?? '',
        authorId: r.authorId,
        authorName: r.author?.name ?? null,
        ingredients: (r.ingredients ?? []).map((i: any) => ({
          name: (i.name ?? '').toLowerCase(),
          name_text: i.name ?? '',
          quantity: i.quantity ?? null,
        })),
        instructions: (r.instructions ?? []).map((s: any) => s.text).join('\n'),
        avgRating: r.avgRating ?? this.computeAvg(r.ratings),
        commentCount: r.commentCount ?? (r.comments ? r.comments.length : 0),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      });
    }
    await this.client.bulk({ index: this.index, refresh: 'wait_for', body });
  }

  async searchRecipes({
    q,
    ingredients,
    cuisine,
    difficulty,
    cookingTimeMin,
    cookingTimeMax,
    sortBy,
    page,
    perPage,
  }: {
    q?: string;
    ingredients?: string[];
    cuisine?: string;
    difficulty?: string;
    cookingTimeMin?: number;
    cookingTimeMax?: number;
    sortBy?: 'relevance' | 'rating' | 'newest';
    page?: number;
    perPage?: number;
  }) {
    const must: any[] = [];
    const filter: any[] = [];

    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: [
            'title^3',
            'description',
            'ingredients.name_text',
            'instructions',
          ],
          fuzziness: 'AUTO',
        },
      });
    } else {
      must.push({ match_all: {} });
    }

    if (ingredients && ingredients.length) {
      for (const ing of ingredients) {
        filter.push({
          nested: {
            path: 'ingredients',
            query: { term: { 'ingredients.name': ing.toLowerCase() } },
          },
        });
      }
    }

    if (cuisine) filter.push({ term: { cuisine } });
    if (difficulty) filter.push({ term: { difficulty } });
    if (
      typeof cookingTimeMin === 'number' ||
      typeof cookingTimeMax === 'number'
    ) {
      const range: any = {};
      if (typeof cookingTimeMin === 'number') range.gte = cookingTimeMin;
      if (typeof cookingTimeMax === 'number') range.lte = cookingTimeMax;
      filter.push({ range: { cookingTimeMinutes: range } });
    }

    const sort: any[] = [];
    if (sortBy === 'rating') sort.push({ avgRating: { order: 'desc' } });
    else if (sortBy === 'newest') sort.push({ createdAt: { order: 'desc' } });
    else sort.push('_score');

    const pageNum = Math.max(1, page ?? 1);
    const size = perPage ?? 10;

    const body = {
      query: {
        bool: {
          must,
          filter,
        },
      },
      sort,
      _source: true,
      from: (pageNum - 1) * size,
      size,
    };

    const resp = await this.client.search({ index: this.index, body });
    // resp.hits.hits[]. _source is any; cast to any before spreading
    const hits = (resp.hits.hits as any[]).map((h: any) => ({
      id: h._id,
      score: h._score,
      ...(h._source as any),
    }));
    return { total: (resp.hits.total as any) ?? 0, results: hits };
  }

  async autocompleteIngredient(prefix: string, size = 10) {
    if (!prefix || prefix.trim().length === 0) return [];
    const resp = await this.client.search({
      index: this.index,
      body: {
        size: 0,
        aggs: {
          ing_suggest: {
            terms: {
              field: 'ingredients.name',
              include: `${prefix.toLowerCase()}.*`,
              size,
            },
          },
        },
      },
    });

    // cast aggregations as any to access buckets safely
    const buckets = (resp.aggregations as any)?.ing_suggest?.buckets ?? [];
    return buckets.map((b: any) => b.key);
  }

  async recordSearchEvent(event: {
    userId?: string;
    query?: string;
    ingredients?: string[];
    timestamp?: string;
  }) {
    await this.client.index({
      index: this.analyticsIndex,
      document: {
        userId: event.userId ?? null,
        query: event.query ?? null,
        ingredients: event.ingredients ?? [],
        timestamp: event.timestamp ?? new Date().toISOString(),
      },
      refresh: false,
    });
  }
}
