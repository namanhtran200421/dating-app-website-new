export interface ArticleSummary {
  slug: string;
  legacyId?: string;
  title: string;
  description: string;
  topic: string;
  published: string;
  modified: string;
}

export const articles: readonly ArticleSummary[] = [
  {
    slug: 'dating-without-swiping',
    title: 'Dating without swiping: what to look for',
    description:
      'Explore ways to meet people beyond the swipe, with practical questions about conversation, shared activities, safety and availability.',
    topic: 'Intentional dating',
    published: '2026-09-05',
    modified: '2026-09-05',
  },
  {
    slug: 'endless-swiping',
    legacyId: 'endless-swiping',
    title: 'The problem with endless swiping',
    description:
      'What choice-overload research tells us about online dating, and practical ways to give each conversation more attention.',
    topic: 'Dating culture',
    published: '2026-09-05',
    modified: '2026-09-05',
  },
  {
    slug: 'dating-app-fatigue',
    legacyId: 'dating-app-fatigue',
    title: 'Dating app fatigue: finding a pace that works for you',
    description:
      'A practical guide to reducing dating app overload: set boundaries, simplify conversations and decide when to take a break.',
    topic: 'Dating habits',
    published: '2026-09-05',
    modified: '2026-09-05',
  },
  {
    slug: 'attraction-over-time',
    legacyId: 'attraction-over-time',
    title: 'Can attraction grow over time?',
    description:
      'How getting to know someone can change a first impression, what research can tell us, and why curiosity should never become an obligation.',
    topic: 'Connection',
    published: '2026-09-05',
    modified: '2026-09-05',
  },
];
