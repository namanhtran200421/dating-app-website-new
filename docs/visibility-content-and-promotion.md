# Rosemarry content and promotion plan

Prepared 5 September 2026. Product remains in development; timing and launch locations are unannounced. The drafts below are prepared for use, not sent or posted.

## Search intent and page ownership

| Reader question | Page | Purpose |
| --- | --- | --- |
| What is Rosemarry? Is it available? | `/` | Brand identity, development status, early-access signup |
| How do weekly Circles work? | `/circle` | Explain the six-day format and planned features |
| How can I date without swiping? | `/blog/dating-without-swiping` | Explain formats and practical evaluation questions |
| Why does endless swiping feel unhelpful? | `/blog/endless-swiping` | Discuss choice-overload research with limits |
| How can I change a tiring app routine? | `/blog/dating-app-fatigue` | Practical habits and boundaries |
| Can attraction grow over time? | `/blog/attraction-over-time` | Explain uncertainty and research without promising an outcome |
| Who is building this? | `/about-us`, `/press` | Founders, brand assets, contact and current facts |

These are intent hypotheses, not verified search-volume estimates. Review impressions and queries before expanding coverage. Each article links to related reading, Circles and early access. Existing `/blog#...` links still land on the corresponding entry in the journal index. `/how-it-works` redirects to `/circle`.

## Research and editorial decisions

- [Pronk and Denissen, A Rejection Mind-Set](https://doi.org/10.1177/1948550619866189): the article discusses increased rejection across study tasks, not a universal effect or a claim that Rosemarry solves it.
- [Hunt, Eastwick and Finkel, Leveling the Playing Field](https://doi.org/10.1177/0956797615579273): the article describes an association among existing couples, not proof that a six-day format creates attraction.
- [Australian eSafety Commissioner](https://www.esafety.gov.au/key-topics/staying-safe/online-dating): links support practical safety advice. No safety guarantee is implied.
- Current first-party positioning at [Pace](https://www.pacedate.in/) and [Pigeon](https://pigeonsocial.app/blog/dating-apps-without-swiping) shows that conversation and alternatives to swiping are already being discussed. Differentiate Rosemarry with a clear explanation of the planned weekly Circle experience. These observations are not a market-share or ranking analysis.

Articles carry a brand editorial byline and an AI-assistance disclosure. No customer interviews, user counts, testimonials or product outcomes were invented. Add original findings only after actual research with permission to publish.

## First four weeks after release

| Week | Work | Evidence to record |
| --- | --- | --- |
| 1 | Verify all 11 sitemap URLs, redirects and public key; submit sitemap and changed URLs; inspect main pages in Search Console | HTTP results, submission receipts, indexed status, Google-selected canonical |
| 2 | Share the four journal articles through official profiles; use one clear question per post | Referral category totals, landing pages and early-access responses |
| 3 | Collect voluntary feedback on the Circle explanation and questions readers still have | Anonymized themes with permission; distinguish feedback from representative research |
| 4 | Review queries, impressions, clicks and measured signups; revise one page with a demonstrated gap | Changes tied to a reader question; avoid changing dates without substantive edits |

Future article candidates: a practical group-conversation prompt guide; a walkthrough of a proposed six-day Circle; and a founder explanation of a real product decision. Publish only when there is something specific to show. Do not create city pages until launch geography is confirmed.

## Ready-to-use official profile copy

Name: **Rosemarry | Dating App**

Bio: **Dating through weekly Circles, shared activities and real conversation. In development. Join our early-access list.**

Website: `https://www.rosemarry.app/?utm_source=instagram&utm_medium=social`

Use the same name, logo, development status and canonical website across official profiles. Add another `sameAs` URL to structured data only after that official profile exists.

## Social drafts

1. **What would make a dating conversation worth coming back to?** We put together five questions to ask when exploring dating without swiping, from shared activities to control over your own pace. Read: `https://www.rosemarry.app/blog/dating-without-swiping?utm_source=instagram&utm_medium=social`. Rosemarry is still in development.
2. **More profiles can mean more decisions.** Our latest journal article looks at choice-overload research and a few ways to give an existing conversation more attention. Read: `https://www.rosemarry.app/blog/endless-swiping?utm_source=instagram&utm_medium=social`.
3. **You get to choose how much attention dating takes this week.** Fewer conversations, fewer notifications, or a break are all options. A practical guide: `https://www.rosemarry.app/blog/dating-app-fatigue?utm_source=instagram&utm_medium=social`.
4. **Curiosity is a reason to keep talking. Obligation is not.** Can attraction change as you get to know someone? We look at what research can tell us, and why there is no deadline for a spark. Read: `https://www.rosemarry.app/blog/attraction-over-time?utm_source=instagram&utm_medium=social`.

Adapt `utm_source` to the actual platform. Measurement keeps a broad source bucket; campaign text and full query strings are not stored.

## Media outreach draft

Subject: Rosemarry: an early-stage dating app exploring weekly group conversations

Hello,

Rosemarry is a dating app in development, founded by Steve Tran, Felix Vu and Samuel Nicholas. Its planned weekly Circles bring compatible people together for six days of group conversation, prompts and shared activities, with matching available at any time.

The story we can offer is the product decision behind that format: giving people more opportunities to become familiar before choosing whether to connect. We can explain the planned experience and the questions we are still working through. We are not announcing a launch date or claiming relationship outcomes.

The current fact sheet and brand assets are at https://www.rosemarry.app/press. Would a conversation with the founders be relevant to your coverage?

Rosemarry team
support@rosemarry.app

Potential editorial targets to qualify before sending: Startup Daily and SmartCompany, if the founders can confirm an Australian startup connection and the outlet's current pitch requirements. Check the actual editorial contact and tailor the story. No outreach has been sent, paid placement purchased or coverage promised.

## Measurement interpretation

Run the frontend's `npm run search:report` for a 28-day Google page/query report, or `npm run search:inspect` for indexed-status information, after supplying an authorized short-lived `GOOGLE_ACCESS_TOKEN`. `SEARCH_CONSOLE_PROPERTY` defaults to `https://www.rosemarry.app/`; set it to the verified property if different. An API inspection is not a live test or a recrawl request.

Run `npm run analytics:report -- 30` from `backend` with `MONGO_URI` available locally. The output groups counts by original landing page, broad source and event. The public API has no report-reading endpoint.

Visits are document loads, not unique visitors. Reloads start a new visit; attribution persists only in memory through client-side navigation. `signup_success` means the browser received a successful registration response. Compare with registration totals for business reporting: blockers, bots and network failures can affect client measurement. Successful-signup responses divided by visits is a document-load conversion ratio, not a unique-user conversion rate. No baseline traffic or conversion figures are available without account/data access.
