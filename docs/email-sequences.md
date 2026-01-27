# Email Sequences

## Overview

This document defines three core email sequences for Daily Brain Bits (DBB):

1. **Welcome Sequence** - Signup (no integration after 1 hour) → Connect integration
2. **Onboarding Sequence** - Connected → First digest → Engaged user
3. **Upgrade to Pro Sequence** - Engaged free user → Paid conversion

All emails use React Email with the existing brand styling from `note-digest-email-template.tsx` and are sent via Resend.

### Self-hosted behavior

- When `DEPLOYMENT_MODE=self-hosted`, billing is disabled and **all users are treated as Pro**.
- The **upgrade sequence is not created** in self-hosted mode.

## Execution model

- Sequences are run by **Trigger.dev** as long-running tasks that can `wait` between steps.
- Each sequence uses a dedicated run per user (`email-sequence-runner`) and re-checks exit conditions before sending.
- Upgrade sequences are discovered on a scheduled task (`upgrade-sequence-discover`).
- Set `EMAIL_SEQUENCES_ENABLED=false` to disable all sequence sends (self-host safe).
- **No emails are sent at signup.** The welcome sequence starts only if the user has **no integration connected after 1 hour**.
- **Digest sends are scheduled by the user cron**, which starts immediately when the first integration connects. If the user connects right away, their **first email is the first digest**.

---

## Sequence 1: Welcome Sequence

**Trigger**: 1 hour after signup (only if no integration connected)
**Goal**: Get user to connect their first integration (Notion or Obsidian)
**Exit condition**: User connects an integration OR 14 days pass
**Length**: 4 emails over 7 days

### Overview

| Email | Timing | Purpose |
|-------|--------|---------|
| 1 | 1 hour after signup | Welcome + connect CTA |
| 2 | Day 2 | Value reminder + which source |
| 3 | Day 4 | Address hesitation |
| 4 | Day 7 | Final nudge |

---

### Email 1: Welcome to Daily Brain Bits

**Send**: 1 hour after signup (skip if already connected)
**Subject**: Welcome to Daily Brain Bits — let's connect your notes
**Preview**: Your first step: connect Notion or Obsidian

**Body**:

```
Hello {{firstName}},

Thanks for joining Daily Brain Bits. You're one step away from rediscovering your best notes.

Daily Brain Bits sends you a curated selection of your own notes — surfaced at the right time to help you remember what matters.

**Your first step: Connect your notes**

Choose where your notes live:

[Connect Notion]  [Connect Obsidian]

This takes about 2 minutes. Once connected, we'll start preparing your first digest.

If you ran into any issues connecting, email me at {{founderEmail}} and I'll help.

Talk soon,
The DBB Team
```

**CTA**: Two buttons → `/onboarding/choose-source`
**Variables**: `{{founderEmail}}` (personal contact email)

---

### Email 2: Which notes should we surface?

**Send**: Day 2 (skip if already connected)
**Subject**: Quick question — Notion or Obsidian?
**Preview**: Connect in under 2 minutes

**Body**:

```
Hello {{firstName}},

A quick follow-up: where do you keep your notes?

**Notion** — Connect via OAuth. We sync your databases and pages automatically.

**Obsidian** — Install our plugin. Your notes stay local, synced on your terms.

[Connect Notion]  [Connect Obsidian]

Once connected, you'll receive your first digest within 24 hours. No more forgotten notes.

— The DBB Team
```

**CTA**: Two buttons → `/onboarding/choose-source`

---

### Email 3: Worried about connecting?

**Send**: Day 4 (skip if already connected)
**Subject**: Your notes stay yours
**Preview**: How we handle your data

**Body**:

```
Hello {{firstName}},

We noticed you haven't connected your notes yet. Totally understandable — here's how we handle your data:

**For Notion**:
- We only access databases/pages you explicitly select
- OAuth connection can be revoked anytime
- We never modify your Notion content

**For Obsidian**:
- Notes never leave your device unless you sync them
- The plugin is open source — inspect it yourself
- You control exactly what gets included

We built DBB because we wanted this for ourselves. Privacy isn't a feature; it's the foundation.

Ready to give it a try?

[Connect your notes]

— The DBB Team
```

**CTA**: Single button → `/onboarding/choose-source`

---

### Email 4: Still there?

**Send**: Day 7 (skip if already connected)
**Subject**: Your notes are waiting, {{firstName}}
**Preview**: One connection, then the magic starts

**Body**:

```
Hello {{firstName}},

This is my last nudge (promise). You signed up for Daily Brain Bits but haven't connected your notes yet.

Here's what you're missing:

- Rediscover notes you forgot you wrote
- Surface ideas at the perfect time to remember them
- Build a sustainable review habit without the effort

All it takes is one connection — about 2 minutes.

[Connect Notion]  [Connect Obsidian]

If DBB isn't right for you, no hard feelings. You can unsubscribe below.

— The DBB Team
```

**CTA**: Two buttons → `/onboarding/choose-source`

---

## Sequence 2: Onboarding Sequence

**Trigger**: First digest sent (after the first integration connects)
**Goal**: Reinforce the first digest and establish a habit
**Exit condition**: User upgrades to Pro OR sequence completes
**Length**: 4 emails over 14 days

### Overview

| Email | Timing | Purpose |
|-------|--------|---------|
| 1 | Post-first-digest | Aha moment reinforcement |
| 2 | Day 5 | Configure preferences |
| 3 | Day 9 | Social proof |
| 4 | Day 14 | Check-in |

---

### Email 1: How was your first digest?

**Send**: 2-4 hours after first digest is sent
**Subject**: Did you spot a forgotten gem?
**Preview**: Your first digest just landed

**Body**:

```
Hello {{firstName}},

Your first Daily Brain Bits digest just landed. Did you rediscover anything interesting?

That "oh, I forgot about this!" moment — that's why we built DBB. Your notes deserve to be remembered, not buried.

**Here's how to get more value:**

- **Star notes** you want to see more often
- **Skip notes** that aren't worth revisiting
- These signals help us surface better content over time

[View your digest]

We'd love to hear what you think. Just reply to this email.

— The DBB Team
```

**CTA**: Button → `/dash`

---

### Email 2: Make it yours

**Send**: Day 5
**Subject**: Quick settings to improve your digests
**Preview**: 2 minutes to better Brain Bits

**Body**:

```
Hello {{firstName}},

You've received a few digests now. Here are some ways to make DBB work better for you:

**1. Adjust your timing**
Receive digests when you actually have time to read them. Morning commute? Lunch break? Evening wind-down?

**2. Set your frequency**
{{#if isPro}}
Daily, weekly, or monthly — whatever fits your rhythm.
{{else}}
Free plan includes weekly or monthly digests. Upgrade to Pro for daily.
{{/if}}

**3. Add another source** {{#unless isPro}}(Pro){{/unless}}
{{#if isPro}}
Connect both Notion and Obsidian to get the full picture.
{{else}}
Pro users can connect multiple sources. Worth it if you use both.
{{/if}}

[Open settings]

— The DBB Team
```

**CTA**: Button → `/settings`

---

### Email 3: You're not alone

**Send**: Day 9
**Subject**: 847 notes rediscovered this week
**Preview**: Join the DBB community

**Body**:

```
Hello {{firstName}},

Here's a quick stat: DBB users rediscovered over 847 notes last week. That's 847 ideas that would have stayed buried.

**What people are saying:**

> "I found a note from 2 years ago that perfectly solved a problem I'm facing now."
> — Sarah, product designer

> "It's like having a personal assistant that knows exactly what I need to remember."
> — James, researcher

You're part of a community of people who value their ideas enough to revisit them.

Keep reading those digests.

— The DBB Team
```

---

### Email 4: How's it going?

**Send**: Day 14
**Subject**: Two weeks in — how's DBB working for you?
**Preview**: Quick check-in

**Body**:

```
Hello {{firstName}},

You've been using Daily Brain Bits for two weeks now. How's it going?

**Quick survey** (pick one):

- It's great — I'm rediscovering useful notes
- It's okay — could be better
- Not working for me

[Take 10-second survey]

Your feedback helps us improve. And if something's not working, we want to fix it.

— The DBB Team

P.S. If you have specific feedback, just reply to this email. We read everything.
```

**CTA**: Button → survey link or mailto reply

---

## Sequence 3: Upgrade to Pro

**Trigger**: Free user meets engagement criteria (see below)
**Goal**: Convert engaged free users to Pro ($10/month)
**Exit condition**: User upgrades OR sequence completes
**Length**: 5 emails over 21 days

### Trigger Criteria (enter sequence when ANY):

- User has received 4+ digests
- User has opened 3+ digest emails
- User has visited the dashboard 3+ times
- User tried to enable a Pro feature (daily frequency, AI quizzes, second source)

### Overview

| Email | Timing | Purpose |
|-------|--------|---------|
| 1 | Trigger day | Value summary + soft intro |
| 2 | Day 3 | Feature comparison |
| 3 | Day 7 | Use case story |
| 4 | Day 14 | Objection handler |
| 5 | Day 21 | Direct ask |

---

### Email 1: You're getting value from DBB

**Send**: When trigger criteria met
**Subject**: You've rediscovered {{noteCount}} notes so far
**Preview**: Here's what Pro could add

**Body**:

```
Hello {{firstName}},

Quick stat: you've received {{digestCount}} digests containing {{noteCount}} notes since joining DBB. That's {{noteCount}} ideas that didn't stay buried.

You're clearly finding value here. I wanted to let you know about Pro — not to pressure you, but because you might want more.

**What Pro adds:**

- **Daily digests** — more frequent surfacing means better retention
- **AI quizzes** — test yourself on your notes to truly remember them
- **Multiple sources** — connect both Notion and Obsidian

If weekly digests are working for you, stick with Free. No pressure.

But if you want more, Pro is $10/month.

[See Pro features]

— The DBB Team
```

**CTA**: Button → `/settings#billing` or upgrade page

---

### Email 2: Free vs Pro — what's the difference?

**Send**: Day 3
**Subject**: What $10/month gets you
**Preview**: Honest comparison

**Body**:

```
Hello {{firstName}},

Here's an honest breakdown of Free vs Pro:

| | Free | Pro ($10/mo) |
|---|---|---|
| Digest frequency | Weekly or monthly | Daily, weekly, or monthly |
| Sources | 1 | Unlimited |
| AI quizzes | No | Yes |
| Note selection | Same algorithm | Same algorithm |
| Support | Community | Priority |

**The real question**: How often do you want to revisit your notes?

- If weekly is enough → Free works great
- If you want daily reinforcement → Pro is worth it
- If you use both Notion and Obsidian → Pro is the only way

[Upgrade to Pro]

— The DBB Team
```

**CTA**: Button → checkout

---

### Email 3: How Maya uses DBB Pro

**Send**: Day 7
**Subject**: "I finally remember what I read"
**Preview**: A Pro user's story

**Body**:

```
Hello {{firstName}},

I wanted to share how one Pro user, Maya, uses Daily Brain Bits:

Maya is a UX researcher. She takes hundreds of notes from user interviews, books, and articles. Her problem: she'd take a note, then never see it again.

**Her setup:**
- Obsidian vault with 2,000+ notes
- Daily digest at 8am (train commute)
- AI quizzes enabled for key concepts

**What changed:**
"I used to feel guilty about all the notes I'd forgotten. Now I trust that the important ones will resurface. Last week, a note from 18 months ago directly influenced a design decision."

**The insight:**
Daily repetition isn't about quantity. It's about trusting the system so you can stop worrying.

Maya pays $10/month. She says it's the best ROI of any subscription she has.

[Try Pro for yourself]

— The DBB Team
```

**CTA**: Button → checkout

---

### Email 4: "I don't have time for daily emails"

**Send**: Day 14
**Subject**: The #1 reason people don't upgrade (and why it's wrong)
**Preview**: You might be overthinking this

**Body**:

```
Hello {{firstName}},

The most common reason people don't upgrade to Pro: "I don't have time to read daily emails."

I get it. More emails = more overwhelm. But here's the thing:

**Daily digests take 2-3 minutes.** Same as weekly ones — just more frequent.

The question isn't "do I have time?" It's "do I have 2 minutes at a consistent time?"

- Morning coffee? That works.
- Lunch break? Perfect.
- Evening wind-down? Great.

**Pro tip**: Set your preferred send time in settings. Get the digest when you actually have a moment.

And if daily feels like too much? You can always switch back to weekly. Pro gives you the choice.

[Upgrade to Pro]

— The DBB Team
```

**CTA**: Button → checkout

---

### Email 5: Last note on Pro

**Send**: Day 21
**Subject**: This is my last email about Pro
**Preview**: No more upgrade emails after this

**Body**:

```
Hello {{firstName}},

This is my last email about upgrading to Pro. After this, I'll stop asking.

Here's the summary:

**Pro ($10/month) gets you:**
- Daily digests (vs weekly/monthly)
- AI quizzes to test retention
- Connect multiple sources

**If that's not for you**, totally fine. Free is designed to be useful on its own. You'll keep getting your weekly digests.

**If you want to try Pro**, now's the time:

[Upgrade to Pro — $10/month]

Either way, thanks for using Daily Brain Bits. Your notes deserve to be remembered.

— The DBB Team
```

**CTA**: Button → checkout

---

## Implementation Notes

### Technical Requirements

1. **Email service**: Use existing Resend integration
2. **Templates**: Create React Email components matching existing brand styling
3. **Tracking**:
   - Track email opens/clicks via Resend webhooks
   - Store sequence state per user (current step, completed, exited)
4. **Triggers**:
   - Welcome: `user.created` event **+ 1 hour delay**, only if no integration is connected
   - Onboarding: `digest.sent` (first digest) event
   - Upgrade: Engagement threshold met (check daily/weekly job)
5. **Webhook endpoint**:
   - `POST /webhooks/resend` (requires `RESEND_WEBHOOK_SECRET`)

### Database Schema

Add tables/fields for sequence tracking:

```sql
-- Email sequence state per user
CREATE TABLE email_sequence_states (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  sequence_name VARCHAR(50) NOT NULL, -- 'welcome', 'onboarding', 'upgrade'
  current_step INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'exited'
  entered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_email_sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  exit_reason VARCHAR(100), -- 'connected', 'upgraded', 'completed'
  UNIQUE(user_id, sequence_name)
);

-- Email send log
CREATE TABLE email_sends (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  sequence_name VARCHAR(50),
  email_name VARCHAR(100) NOT NULL,
  idempotency_key VARCHAR(256) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'resend',
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resend_id VARCHAR(100),
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  payload_json JSONB
);
```

### Exit Conditions Logic

```typescript
// Welcome sequence: exit when user connects first integration
// Check before each send: if user has any integrations, mark sequence exited

// Onboarding sequence: exit when user upgrades to Pro
// Check before each send: if user has active subscription, mark sequence exited

// Upgrade sequence: exit when user upgrades OR completes sequence
// After checkout.completed webhook, mark sequence exited with reason 'upgraded'
```

### Testing

1. Use `send-due-sequence-emails.ts --dry-run` for a safe run
2. Unit-test schedule timing logic (`apps/back/utils/email-sequence-schedule.test.ts`)
3. Test exit conditions with mock user states

### Config

- `RESEND_WEBHOOK_SECRET` is required to verify Resend webhook signatures.
- `SEQUENCE_EMAIL_DRY_RUN=true` skips live sends while exercising the sequence runner.

---

## Metrics to Track

### Welcome Sequence
- Signup → Connected conversion rate (target: 60%+)
- Time to connect (target: <48 hours)
- Drop-off by email step

### Onboarding Sequence
- Connected → First digest open rate (target: 70%+)
- Day 14 retention (still opening digests)
- Settings engagement (changed any setting)

### Upgrade Sequence
- Sequence entry → Upgrade conversion rate (target: 5-10%)
- Conversion by email step (which email converts best)
- Time from entry to upgrade

---

## Future Improvements

- A/B test subject lines
- Personalize based on source type (Notion vs Obsidian specific content)
- Add re-engagement sequence for inactive users
- Add failed payment recovery sequence
- Add cancellation win-back sequence
