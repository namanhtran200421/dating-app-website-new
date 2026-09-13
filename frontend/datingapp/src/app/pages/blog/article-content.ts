export interface ArticleSection {
  id: string;
  title: string;
  paragraphs: string[];
  points?: string[];
  source?: { label: string; url: string };
}
export interface ArticleContent {
  answer: string;
  sections: ArticleSection[];
}

export const articleContent: Record<string, ArticleContent> = {
  'dating-without-swiping': {
    answer:
      'Dating without swiping means creating opportunities to get to know someone beyond a quick profile decision. Shared activities, introductions and conversation-led formats offer different ways to start. The useful question is what happens after the introduction.',
    sections: [
      {
        id: 'different-ways',
        title: 'Start with the kind of interaction you enjoy',
        paragraphs: [
          'Think about a conversation you wanted to continue. Perhaps you were doing something together, a friend introduced you, or a small group gave you time to relax. Those details are useful clues when choosing how to meet people.',
          'An activity group can give you a shared topic. An introduction through friends gives you a little context. A conversation-led dating format can make room for questions before a decision. None of these guarantees chemistry, and an activity group is not automatically a dating space. Respect why other people are there.',
        ],
      },
      {
        id: 'compare-experiences',
        title: 'Five questions to ask before joining',
        paragraphs: [
          'A different interface is only one part of the experience. Before committing your time, look for clear answers to these questions:',
        ],
        points: [
          'What will we actually do together: exchange messages, answer prompts, join a group or attend an event?',
          'Will I see the same people again, or restart with strangers each time?',
          'Can I control my pace, decline an introduction and leave a conversation easily?',
          'Are reporting, blocking and privacy controls explained before I join?',
          'Is the service available in my area, and which features are free or paid?',
        ],
      },
      {
        id: 'try-a-conversation',
        title: 'Give the conversation something to work with',
        paragraphs: [
          'A small, specific question is often easier to respond to than a request to describe an entire personality. Try: “What is something you enjoyed doing this week?” Follow the answer instead of moving straight to another question.',
          'If someone mentions cooking, ask what they made, share your own kitchen success or disaster, and leave room for them to respond. The aim is a reciprocal exchange. A long list of questions from only one person can feel like an interview.',
          'Pay attention to whether both people contribute and respect boundaries. A slower format is useful only when you feel free to choose your own pace.',
        ],
      },
      {
        id: 'safety',
        title: 'Keep safety part of the decision',
        paragraphs: [
          'Take care with personal details, use reporting and blocking tools when needed, and choose a public place if you decide to meet. Tell someone you trust about your plans. A friendly conversation or an identity check is not a guarantee of safety.',
          'The Australian eSafety Commissioner has a detailed guide covering privacy, warning signs and meeting someone from a dating service.',
        ],
        source: {
          label: 'Read eSafety’s online dating guide',
          url: 'https://www.esafety.gov.au/key-topics/staying-safe/online-dating',
        },
      },
      {
        id: 'rosemarry',
        title: 'Where Rosemarry fits',
        paragraphs: [
          'Rosemarry is being built around small weekly Circles: six days with compatible people, group conversation, prompts and shared activities, with the freedom to match at any time. Our design intention is to give people more context before deciding whether to connect.',
          'The app is still in development. Launch locations and timing have not been announced, and planned features may change. The early-access list is a way to hear from the team as the product develops; it is not access to a working dating app today.',
        ],
      },
    ],
  },
  'endless-swiping': {
    answer:
      'An endless stream of profiles can make dating feel like a sequence of decisions rather than a chance to know someone. Research suggests that repeated choices can encourage rejection in some online-dating settings. It does not mean that every person has the same experience.',
    sections: [
      {
        id: 'what-profiles-miss',
        title: 'What a profile can show',
        paragraphs: [
          'Photos and prompts offer a starting point. They can reveal interests, intentions and an opening for conversation. They cannot reproduce the timing of someone’s humour or how it feels to do something together.',
          'Imagine two profiles that both say “I love cooking.” One person might tell a funny story about a failed birthday cake. Another might ask about your favourite family meal. Conversation gives you information that the shared interest alone does not.',
          'When every decision arrives quickly, it can be easy to keep moving before that information has a chance to appear. The practical challenge is making room for curiosity while keeping your own boundaries.',
        ],
      },
      {
        id: 'research',
        title: 'What choice-overload research found',
        paragraphs: [
          'In three studies, Tila Pronk and Jaap Denissen found that participants became more likely to reject potential partners as they progressed through online-dating choices. The authors described this as a rejection mind-set.',
          'Those studies examined particular tasks and samples. They do not establish that all dating apps cause the same behaviour, or that removing swipes guarantees a better relationship. They do offer a reason to notice how repeated browsing affects your own decisions.',
        ],
        source: {
          label: 'Pronk & Denissen: A Rejection Mind-Set (2020)',
          url: 'https://doi.org/10.1177/1948550619866189',
        },
      },
      {
        id: 'change-the-session',
        title: 'Try one change to your next session',
        paragraphs: [
          'Choose a small experiment rather than a rule you feel obliged to keep. For example, reply thoughtfully to an existing conversation before browsing new profiles. Notice whether that makes the experience more useful for you.',
          'If you decide to browse, give yourself a stopping point in advance. Stop when you reach it, even if you have not found a match. A session does not need to end in a connection to have a reasonable boundary.',
        ],
        points: [
          'Read for one detail you are honestly curious about, rather than a checklist of perfect qualities.',
          'Keep only as many active conversations as you want to give attention to.',
          'Pause if you notice yourself making automatic decisions or feeling frustrated.',
          'Decline respectfully when your intentions or boundaries do not fit.',
        ],
      },
      {
        id: 'more-context',
        title: 'Look for opportunities to build context',
        paragraphs: [
          'An ongoing group, a shared activity or another conversation can show a different side of someone. You might notice that they include a quiet person, remember a detail or make a discussion feel easy. You might also learn that the connection is not for you. Both are useful outcomes.',
          'Rosemarry’s planned weekly Circles explore this idea by keeping compatible people together for six days. This is a product approach we are developing, not a proven remedy for dating fatigue. You can read how Circles are intended to work and decide whether that pace sounds appealing.',
        ],
      },
    ],
  },
  'dating-app-fatigue': {
    answer:
      'If dating apps feel like another task to manage, it can help to reduce the number of conversations, set a stopping point and take a break when you want one. “Dating app fatigue” describes an experience people talk about; this guide is about everyday habits, not a diagnosis.',
    sections: [
      {
        id: 'notice-the-friction',
        title: 'Identify the part that takes your energy',
        paragraphs: [
          'Opening an app, deciding who to contact, writing an introduction and keeping several conversations going are different tasks. You may enjoy one and find another tiring. Naming the difficult part makes it easier to change something specific.',
          'For a few sessions, notice how you feel before and after. Are you browsing because you want to meet someone, or opening the app automatically? Does a particular conversation feel reciprocal? Is the pressure coming from notifications or from expectations you have set yourself?',
          'You do not need to turn these questions into a score or a productivity routine. They are simply a way to identify what you would like less of, and what you would like more of.',
        ],
      },
      {
        id: 'boundaries',
        title: 'Make a smaller commitment',
        paragraphs: [
          'Instead of trying to become better at managing every message, decide how much attention you actually want to give dating this week. That could mean fewer active conversations, checking messages at a time that suits you, or taking the week off.',
          'For example, you could turn off nonessential notifications and reply when you have a quiet moment after dinner. If that arrangement does not help, change it. There is no universal schedule that makes dating work.',
        ],
        points: [
          'Choose when you want to check messages, rather than treating each alert as an obligation.',
          'Give attention to conversations where both people contribute.',
          'Use a short, kind closing message when you do not want to continue, if it feels appropriate and safe.',
          'Let a break be a break; you do not have to replace one app with another.',
        ],
      },
      {
        id: 'other-connections',
        title: 'Keep space for the rest of your social life',
        paragraphs: [
          'Dating does not need to carry every hope you have for connection. Time with friends, a recurring hobby or a community activity can be worthwhile in its own right. Join activities because you enjoy them, and respect other participants’ reasons for being there.',
          'If you decide to meet someone you have been talking to online, keep control of the plan. Meet publicly, let a trusted person know where you are going and arrange a way to leave. You can change your mind.',
        ],
        source: {
          label: 'Practical online dating safety guidance from eSafety',
          url: 'https://www.esafety.gov.au/key-topics/staying-safe/online-dating',
        },
      },
      {
        id: 'different-pace',
        title: 'Choose a format that fits your attention',
        paragraphs: [
          'Before trying a new service, ask what it expects from you each day. Will you need to keep starting new conversations? Is participation optional? Can you pause or leave easily? The answers matter more than a promise of effortless connection.',
          'Rosemarry is in development around weekly Circles, group conversation and shared activities. We intend to create more opportunities to get familiar with people over several days. The format will not suit everyone, and we do not claim it treats exhaustion or improves mental health. Read the planned experience before joining the early-access list.',
        ],
      },
    ],
  },
  'attraction-over-time': {
    answer:
      'Attraction can change as you get to know someone, but it does not always grow. Another conversation may give you more information if you feel curious and comfortable. You never owe someone continued attention in the hope that a spark will appear.',
    sections: [
      {
        id: 'first-impressions',
        title: 'A first impression is a starting point',
        paragraphs: [
          'An instant spark can be exciting. A quieter first meeting can also leave you wanting to learn more. The distinction worth noticing is between curiosity and obligation: are you looking forward to another interaction, or trying to persuade yourself to want one?',
          'Someone’s humour may become clearer in a relaxed group. A shared activity might reveal patience or generosity. You might discover a compatible rhythm in conversation, or find that your values and intentions do not fit. Getting familiar provides context, not a guaranteed outcome.',
        ],
      },
      {
        id: 'research',
        title: 'What research can tell us',
        paragraphs: [
          'A 2015 study by Lucy Hunt, Paul Eastwick and Eli Finkel examined 167 couples. Partners who had known each other longer before dating were less closely matched on observers’ ratings of physical attractiveness.',
          'This finding concerns a pattern among existing couples. It does not prove that spending time with any particular person causes attraction, or tell you how many dates to have. It suggests that the circumstances in which people get acquainted can matter when understanding who becomes a couple.',
        ],
        source: {
          label: 'Hunt, Eastwick & Finkel: Leveling the Playing Field (2015)',
          url: 'https://doi.org/10.1177/0956797615579273',
        },
      },
      {
        id: 'notice',
        title: 'Look for curiosity, ease and reciprocity',
        paragraphs: [
          'If you are unsure after a first conversation, you might choose a simple second interaction: another chat, a walk in a public place or a group activity you both want to attend. Keep it something you can freely accept or decline.',
          'Afterwards, think about the experience itself rather than whether it meets a timeline. Did you enjoy being there? Did the other person make room for your thoughts? Were your boundaries respected?',
        ],
        points: [
          'Curiosity: you want to learn something more about this particular person.',
          'Ease: you feel able to be yourself, including when you disagree.',
          'Reciprocity: both people ask, listen and contribute.',
          'Choice: continuing feels voluntary, and either person can say no.',
        ],
      },
      {
        id: 'no-deadline',
        title: 'There is no deadline for a spark',
        paragraphs: [
          'You can appreciate someone and still not want to date them. You can also feel curious without knowing where it will lead. Honest uncertainty is different from making promises you cannot keep.',
          'A slower pace should create room to choose, not pressure to stay. If you are uncomfortable or simply do not want another interaction, that is enough reason to stop. If you are interested, communicate that at a pace that works for both of you.',
          'Rosemarry’s planned Circles give compatible people six days of conversation and shared activities, with matching available at any time. Six days is our proposed product format, not a scientific threshold for attraction. The app is still in development.',
        ],
      },
    ],
  },
};
