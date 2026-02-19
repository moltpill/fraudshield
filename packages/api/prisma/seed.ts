import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tierLimits = [
  {
    tier: 'FREE',
    monthlyLimit: 1000,
    features: JSON.stringify({
      customDomains: false,
      support: 'community',
      apiVersions: ['v1'],
      dataRetentionDays: 7,
    }),
  },
  {
    tier: 'STARTER',
    monthlyLimit: 10000,
    features: JSON.stringify({
      customDomains: true,
      support: 'email',
      apiVersions: ['v1'],
      dataRetentionDays: 30,
    }),
  },
  {
    tier: 'GROWTH',
    monthlyLimit: 100000,
    features: JSON.stringify({
      customDomains: true,
      support: 'priority',
      apiVersions: ['v1'],
      dataRetentionDays: 90,
      webhooks: true,
    }),
  },
  {
    tier: 'SCALE',
    monthlyLimit: 1000000,
    features: JSON.stringify({
      customDomains: true,
      support: 'priority',
      apiVersions: ['v1'],
      dataRetentionDays: 365,
      webhooks: true,
      customRules: true,
    }),
  },
  {
    tier: 'ENTERPRISE',
    monthlyLimit: -1, // Unlimited
    features: JSON.stringify({
      customDomains: true,
      support: 'dedicated',
      apiVersions: ['v1'],
      dataRetentionDays: -1, // Unlimited
      webhooks: true,
      customRules: true,
      sla: true,
      onPremise: true,
    }),
  },
];

async function main() {
  console.log('Seeding tier limits...');

  for (const limit of tierLimits) {
    await prisma.tierLimit.upsert({
      where: { tier: limit.tier },
      update: {
        monthlyLimit: limit.monthlyLimit,
        features: limit.features,
      },
      create: limit,
    });
    console.log(`  ✓ ${limit.tier}: ${limit.monthlyLimit === -1 ? 'unlimited' : limit.monthlyLimit.toLocaleString()} requests/month`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
