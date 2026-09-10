# Rosemarry search visibility runbook

Last updated: 5 September 2026 (Australia/Adelaide)

## Canonical public facts

- Official name: **Rosemarry**
- Category description: **dating app**
- Canonical website: **https://www.rosemarry.app/**
- Product status: **In development and not yet available to download**
- Launch timing and locations: **Not announced**
- Founders: **Steve Tran, Felix Vu and Samuel Nicholas**
- Core plan: **Weekly Circles, discovery, matching and messaging are planned to remain free; optional paid extras are planned**
- Audience: **Adults aged 18 and over**

Update this list first whenever a product fact changes, then update the homepage facts, press kit, metadata, sitemap date and official profiles together.

## Baseline from 5 September 2026

| Check | Result | Notes |
| --- | --- | --- |
| General web discovery for `rosemarry dating app` | Found | The homepage was returned with an older title and older cached copy. |
| DuckDuckGo HTML results | Found | `www.rosemarry.app` appeared around organic result 4 with the title “Rosemarry - Dating Built Around Real Interaction.” Results vary by location and time. |
| Bing automated result check | Inconclusive | Bing returned an automation challenge during this audit. |
| Brave automated result check | Inconclusive | Brave returned an automation challenge during this audit. Use the interactive search and submission pages. |
| Live homepage, robots and sitemap from unsigned automation | Challenged | Vercel returned HTTP 429 with `X-Vercel-Mitigated: challenge` from the Sydney edge. This does not prove verified crawlers are blocked. |
| Local production build | Passed | Eight routes prerendered, including `/press`. |
| Unit tests | Passed | 12 tests across 7 test files. |

## Deployment sequence

1. Review and merge the website changes.
2. Deploy them to the production domain.
3. Confirm these URLs return HTTP 200 without a login prompt:
   - `https://www.rosemarry.app/robots.txt`
   - `https://www.rosemarry.app/sitemap.xml`
   - `https://www.rosemarry.app/96fa61b6fb1a18c297f9a8093a43b02a.txt`
   - `https://www.rosemarry.app/press`
4. In Vercel, open **Project → Firewall → Observability** and filter genuine traffic for Googlebot, Bingbot, OAI-SearchBot, PerplexityBot and Perplexity-User.
5. In **Firewall → Rules**, keep the AI Bots managed ruleset in **Log** mode, not **Deny**, when search visibility is the goal. Verified search bots are normally exempt from Bot Protection. If a wanted bot is genuinely blocked, create a higher-priority bypass rule that combines its official IP ranges with its User-Agent. Do not trust a User-Agent alone.
6. Run `npm run indexnow -- --check` from `frontend/datingapp` to verify that the production key URL returns HTTP 200 and the expected key text without submitting URLs. The script stops on redirects, HTTP errors and incorrect content. After the updated pages are deployed and this check passes, run `npm run indexnow`. To submit only selected changed paths, append them, for example `npm run indexnow -- / /press`. HTTP 202 means key validation is pending; receipt does not guarantee indexing.
7. Submit `https://www.rosemarry.app/` through Brave Search's interactive URL submission page.
8. Request recrawls in Google Search Console and Bing Webmaster Tools after deployment.

## Resolving interactive access and crawler settings

- **Brave:** Open https://search.brave.com/submit-url in a JavaScript-enabled browser and follow the submission form. The public page confirms JavaScript is required; an account-login requirement has not been verified. Complete any interactive challenge in the browser.
- **Instagram:** The account owner can update the profile in Instagram's authenticated Edit profile flow. Suggested name: `Rosemarry | Dating App`. Suggested bio: `Dating through weekly Circles, shared activities and real conversation. In development. Join our early-access list.` Website: `https://www.rosemarry.app/`. Signing into an ordinary browser does not automatically give an agent access to that session.
- **Google:** An owner or full user of the Search Console property can inspect an updated URL and choose Request indexing. With authorized API credentials, sitemap submissions and index-status reporting can be automated. The URL Inspection API cannot request recrawls or run live tests. Google's separate Indexing API is limited to eligible job-posting and livestream pages, so it is not a substitute for Rosemarry's marketing pages.
- **Vercel:** On 5 September 2026, the production IndexNow key URL returned HTTP 429 with `X-Vercel-Mitigated: challenge` to a direct unauthenticated request. Inspect the matched firewall rule and arrange public access to the exact key URL and access for intended verified crawlers. A challenge to this request does not establish that verified search crawlers are blocked. Recheck after deployment or firewall changes.
- **Training versus search:** The local robots.txt explicitly allows OAI-SearchBot and PerplexityBot. It has no GPTBot-specific rule; GPTBot falls under `User-agent: *` with `Allow: /` at the robots.txt level. Leaving that unchanged preserves the existing training-crawler setting. Search visibility does not require changing it; choosing to block GPTBot is a separate owner decision.

References: [Google recrawl requests](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), [Search Console API](https://developers.google.com/webmaster-tools/v1/api_reference_index), [Google Indexing API scope](https://developers.google.com/search/apis/indexing-api/v3/using-api), [OpenAI crawler controls](https://developers.openai.com/api/docs/bots), [IndexNow verification](https://www.indexnow.org/documentation).

## Official profiles checklist

Use the canonical facts above on every profile. At minimum, verify:

- display name says **Rosemarry**;
- handle and spelling use **rosemarry**, never **rosemary**;
- bio says the product is still in development;
- website points to `https://www.rosemarry.app/`;
- logo matches the website logo;
- no profile claims the app is available or names an unannounced launch date or location.

Current website structured data lists only the official Instagram profile: `https://www.instagram.com/rosemarry_app/`. Add other profile URLs to `sameAs` only after confirming they are official and complete.

## Weekly measurement

Run checks from the same location and signed-out browser profile when possible. Use ordinary, unquoted searches.

| Date | Service | Location | Query | Autocorrection | Rosemarry result position | Cited Rosemarry URL | Description accurate? | Visits/referrals | Notes |
| --- | --- | --- | --- | --- | ---: | --- | --- | ---: | --- |
| YYYY-MM-DD | Google / Bing / DuckDuckGo / Brave / ChatGPT / Perplexity / Copilot | City, country | `rosemarry dating app` | None / changed to … | — | — | Yes / No | — | — |

Test at least these queries:

- `rosemarry dating app`
- `rosemarry weekly circles`
- `what is rosemarry dating app`
- `is rosemarry dating app available`
- `who founded rosemarry dating app`
- `how does rosemarry handle privacy and safety`

Track four outcomes separately: discovery, organic position, factual accuracy and referral visits. A mention without a link is not a citation, and a citation is not a recommendation.

## Official references

- Google site names: https://developers.google.com/search/docs/appearance/site-names
- OpenAI publisher guidance: https://help.openai.com/en/articles/12627856-publishers-and-developers-faq
- OpenAI search crawler IP ranges: https://openai.com/searchbot.json
- Perplexity crawler guidance: https://docs.perplexity.ai/docs/resources/perplexity-crawlers
- Perplexity crawler IP ranges: https://www.perplexity.com/perplexitybot.json
- IndexNow protocol: https://www.indexnow.org/documentation
- Brave URL submission: https://search.brave.com/submit-url
- Vercel bot management: https://vercel.com/docs/bot-management

## Expanded implementation verification (5 September 2026)

The expanded build contains 11 indexable pages, including four individual journal articles. All pass canonical, title, description, heading, structured-data, internal-link and asset checks. Frontend unit tests (15), browser tests (5) and backend validation tests (2) pass locally. Browser tests cover direct article navigation, metadata changes, readable mobile HTML without JavaScript, registration success/failure measurement and HTTP 404 responses. Test signups use mocks.

The initial raw bundle decreased from 546.29 kB to 484.53 kB. A same-machine mobile Lighthouse comparison against the uncompressed local preview changed performance from 43 to 58, accessibility from 96 to 100, LCP from 10.4 to 7.7 seconds, total blocking time from 600 to 170 ms and total network transfer from 1,724 to 1,083 KiB. CLS remained zero; SEO and best practices scored 100. These are lab results, not production Core Web Vitals or ranking evidence. Further performance work should use the deployed, compressed site and real-user data. Both Lighthouse reports were written successfully; its Windows temporary-browser cleanup then returned EPERM.

The new conversion collector needs the backend release on Render and its existing MongoDB configuration. No production database/report access was available during local verification. Live publication and indexing receipts must be recorded separately from these local checks.
