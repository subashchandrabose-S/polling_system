import type { Poll } from '../api/client';

const now = Date.now();

export const MOCK_POLLS: Poll[] = [
  {
    id: 'demo-poll-product',
    creator_id: 'demo-creator',
    share_code: 'DEMO0001',
    title: 'Which product improvement should we prioritize next?',
    description: 'Help the team focus the next release on the change with the most impact.',
    options: [
      { id: 'demo-product-mobile', text: 'Faster mobile experience', vote_count: 184 },
      { id: 'demo-product-analytics', text: 'Richer analytics', vote_count: 146 },
      { id: 'demo-product-integrations', text: 'More integrations', vote_count: 92 },
      { id: 'demo-product-design', text: 'Refresh the interface', vote_count: 61 },
    ],
    settings: { allow_multiple: false, is_anonymous: true, require_auth: false },
    is_active: true,
    total_votes: 483,
    created_at: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
    updated_at: new Date(now - 1000 * 35).toISOString(),
  },
  {
    id: 'demo-poll-event',
    creator_id: 'demo-creator',
    share_code: 'DEMO0002',
    title: 'What time works best for the community demo?',
    description: 'Pick a slot so we can make the live walkthrough easy to attend.',
    options: [
      { id: 'demo-event-morning', text: '9:00 AM', vote_count: 72 },
      { id: 'demo-event-noon', text: '12:00 PM', vote_count: 118 },
      { id: 'demo-event-evening', text: '6:00 PM', vote_count: 95 },
    ],
    settings: { allow_multiple: false, is_anonymous: true, require_auth: false },
    is_active: true,
    total_votes: 285,
    created_at: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    updated_at: new Date(now - 1000 * 12).toISOString(),
  },
  {
    id: 'demo-poll-retro',
    creator_id: 'demo-creator',
    share_code: 'DEMO0003',
    title: 'What should we carry forward from this sprint?',
    description: 'A closed retrospective poll used to demonstrate archived analytics.',
    options: [
      { id: 'demo-retro-focus', text: 'Smaller work items', vote_count: 37 },
      { id: 'demo-retro-review', text: 'Earlier design reviews', vote_count: 29 },
      { id: 'demo-retro-docs', text: 'Better documentation', vote_count: 18 },
    ],
    settings: { allow_multiple: false, is_anonymous: true, require_auth: false },
    is_active: false,
    total_votes: 84,
    expires_at: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    created_at: new Date(now - 1000 * 60 * 60 * 72).toISOString(),
    updated_at: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
  },
];
