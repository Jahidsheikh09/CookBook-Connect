// scripts/reindex.ts (execute with ts-node or compile & run)
import { PrismaClient } from '@prisma/client';
import { Client } from '@elastic/elasticsearch';

const prisma = new PrismaClient();
const es = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });

async function run() {
  const recipes = await prisma.recipe.findMany({ include: { ingredients: true, instructions: true, ratings: true, comments: true, author: true } });
  const body: any[] = [];
  for (const r of recipes) {
    body.push({ index: { _index: 'recipes', _id: r.id } });
    body.push({
      title: r.title,
      description: r.description ?? '',
      authorId: r.authorId,
      authorName: r.author?.name ?? null,
      ingredients: (r.ingredients ?? []).map((i: any) => ({ name: (i.name ?? '').toLowerCase(), name_text: i.name ?? '', quantity: i.quantity ?? null })),
      instructions: (r.instructions ?? []).map((s: any) => s.text).join('\n'),
      avgRating: r.ratings.length ? r.ratings.reduce((s,a)=>s+a.score,0)/r.ratings.length : 0,
      commentCount: r.comments.length,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }
  if (body.length) {
    await es.bulk({ refresh: true, body });
    console.log('Indexed', recipes.length, 'recipes');
  } else {
    console.log('No recipes to index');
  }
  await prisma.$disconnect();
}

run().catch(console.error);
