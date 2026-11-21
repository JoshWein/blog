---
layout: post
title: "How I Work with a Team of Coding Agents (Without Losing My Sanity)"
description: 'Most of my code is written by agents now, and the job has turned into running a small team of them. Here is the workflow I use at work and on side projects: getting grilled before any code, fanning work out to parallel agents, reviewing across different models, and a throwaway command center to keep track of it all.'
---

<div id="top"></div>

A year ago I'd have described my job as writing code (not really, but I'd like to think at least half my time was spent writing code). Now it's closer to running a small team. On a normal day I have a few agents working at once, each on a different part of a plan, and most of my time goes into deciding what they should work on, unblocking them, and reviewing what comes back.

I do this at work, where I'm a tech lead, and on my own projects. Earlier this month I used it to clean up this site and its blog, plus a pile of old side projects that live on the site. The amount of work I can get through has gone up a lot, both there and at work, and every change was still opened as a pull request by an agent and reviewed before I merged it.

This post covers how that workflow fits together. It's for people who already use agents, and also for people who've only tried a chat window and wonder what the fuss is about.

* [The tools](#the-tools)
* [Get grilled before anything gets built](#get-grilled-before-anything-gets-built)
* [Fan out to parallel agents](#fan-out-to-parallel-agents)
* [Review across models, not within one](#review-across-models-not-within-one)
* [A throwaway command center](#a-throwaway-command-center)
* [Automate the friction away](#automate-the-friction-away)
* [Guardrails](#guardrails)
* [Deterministic validation](#deterministic-validation)
* [Auto-merging](#auto-merging)
* [Packaging what works](#packaging-what-works)
* [What I want to try next](#what-i-want-to-try-next)
* [This is a leadership problem too](#this-is-a-leadership-problem-too)
* [If you're just starting](#if-youre-just-starting)
* [Sources](#sources)

## The tools

I'm not loyal to one tool. My main one is [Claude Code](https://code.claude.com/docs/en/overview), and I use OpenAI's [Codex](https://developers.openai.com/codex) a lot alongside it. When I run out of tokens on both, I drop to GitHub Copilot. For some kinds of web research I still just use ChatGPT in the browser, because it's good at that and doesn't need access to my code.

The fact that I mix them matters more than which ones I pick. Different models make different mistakes, and that turns out to be the most useful thing about having more than one. More on that in the review section.

This lineup will probably look different in a few months. Every harness and model keeps improving, and whichever is best at a given job changes often, so I try not to get too attached.

## Get grilled before anything gets built

The most common way agent work goes wrong for me isn't bad code. It's good code for the wrong thing. If I give an agent a one-line ask, it fills in all the gaps with guesses, and it guesses with confidence.

So I start most real pieces of work by having the agent interview me. Matt Pocock has a set of open source [skills](https://github.com/mattpocock/skills) for this. His `grilling` skill tells the agent to "interview the user relentlessly about a plan, decision, or idea until every branch of the design tree is resolved". His `wayfinder` skill goes further for work that's too big for one session. It plans the work as "a shared map of decision tickets on the issue tracker" and resolves them one at a time.

You don't need the skills for this, though. It's just as easy to tell the agent to "grill me" about the work until we have a plan, and then have it write everything down in a clean doc that the other agents can read later. Anthropic's own [Claude Code best practices](https://code.claude.com/docs/en/best-practices) suggest the same thing: ask Claude to interview you until it could write the spec, write it to a file, and then start a fresh session to build from it.

It feels slow for the first ten minutes. Then it saves hours, because every agent that picks up a piece of the plan later gets the answers instead of guesses.

[back to top](#top)
{: .back-top}

## Fan out to parallel agents

Once there's a plan, I usually have one session act as a coordinator. It breaks the plan into tickets that don't step on each other, then hands each ticket to a generic worker agent, several at the same time. As the coordinator sees a worker finish, it passes that worker the next unblocked ticket. Claude Code supports this directly: [subagents](https://code.claude.com/docs/en/sub-agents) each run in their own context window with their own instructions, so one can be deep in a migration while another writes tests and neither fills up the other's context with noise. Anthropic calls this the [orchestrator-workers](https://www.anthropic.com/research/building-effective-agents) pattern, where "a central LLM dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results."

It isn't free. When Anthropic wrote up [their multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), a lead agent with parallel subagents beat a single Claude Opus 4 agent by 90.2% on their internal research eval, but multi-agent systems used about 15 times more tokens than a normal chat. Fan-out buys you speed and coverage, and you pay for it in tokens.

<figure class="diagram">
<svg viewBox="0 0 720 320" role="img" aria-labelledby="fan-t fan-d">
  <title id="fan-t">Fan-out diagram</title>
  <desc id="fan-d">I turn the plan into a queue of tickets. The coordinator pulls tickets off the queue one at a time and hands each to one of four generic worker agents working in parallel. Each worker opens a pull request, and when a worker is done the coordinator passes it the next unblocked ticket.</desc>
  <path class="wire" d="M90 150 H110"/><path class="flow" d="M90 150 H110"/>
  <path class="wire" d="M230 150 H250"/><path class="flow" d="M230 150 H250" style="animation-delay:-.6s"/>
  <path class="wire" d="M370 150 C390 150 390 45 410 45"/><path class="flow" d="M370 150 C390 150 390 45 410 45" style="animation-delay:-0.0s"/>
  <path class="wire" d="M370 150 C390 150 390 115 410 115"/><path class="flow" d="M370 150 C390 150 390 115 410 115" style="animation-delay:-0.4s"/>
  <path class="wire" d="M370 150 C390 150 390 185 410 185"/><path class="flow" d="M370 150 C390 150 390 185 410 185" style="animation-delay:-0.8s"/>
  <path class="wire" d="M370 150 C390 150 390 255 410 255"/><path class="flow" d="M370 150 C390 150 390 255 410 255" style="animation-delay:-1.2s"/>
  <path class="wire" d="M550 45 C575 45 575 150 600 150"/>
  <path class="wire" d="M550 115 C575 115 575 150 600 150"/>
  <path class="wire" d="M550 185 C575 185 575 150 600 150"/>
  <path class="wire" d="M550 255 C575 255 575 150 600 150"/>
  <path class="wire" d="M650 180 C650 340 310 340 310 180" stroke-dasharray="4 4"/>
  <path class="wire" d="M304 190 L310 180 L316 190"/>
  <text class="sub" x="300" y="240" text-anchor="end">worker done? it gets</text>
  <text class="sub" x="300" y="256" text-anchor="end">the next ticket</text>
  <rect class="box" x="10" y="125" width="80" height="50" rx="4"/>
  <text class="lbl" x="50" y="148" text-anchor="middle">me</text>
  <text class="sub" x="50" y="164" text-anchor="middle">the plan</text>
  <rect class="box" x="110" y="85" width="120" height="130" rx="4"/>
  <text class="lbl" x="170" y="105" text-anchor="middle">ticket queue</text>
  <g class="ticket qtop"><rect x="125" y="115" width="90" height="20" rx="3"/></g>
  <g class="ticket"><rect x="125" y="140" width="90" height="20" rx="3"/></g>
  <g class="ticket"><rect x="125" y="165" width="90" height="20" rx="3"/></g>
  <g class="ticket"><rect x="125" y="190" width="90" height="20" rx="3"/></g>
  <rect class="box hot" x="250" y="120" width="120" height="60" rx="4"/>
  <text class="lbl" x="310" y="148" text-anchor="middle">coordinator</text>
  <text class="sub" x="310" y="166" text-anchor="middle">assigns tickets</text>
  <rect class="box" x="410" y="20" width="140" height="50" rx="4"/>
  <text class="lbl" x="480" y="50" text-anchor="middle">worker agent</text>
  <rect class="box" x="410" y="90" width="140" height="50" rx="4"/>
  <text class="lbl" x="480" y="120" text-anchor="middle">worker agent</text>
  <rect class="box" x="410" y="160" width="140" height="50" rx="4"/>
  <text class="lbl" x="480" y="190" text-anchor="middle">worker agent</text>
  <rect class="box" x="410" y="230" width="140" height="50" rx="4"/>
  <text class="lbl" x="480" y="260" text-anchor="middle">worker agent</text>
  <rect class="box" x="600" y="120" width="100" height="60" rx="4"/>
  <text class="lbl" x="650" y="148" text-anchor="middle">PRs</text>
  <circle class="dot pulse" cx="650" cy="166" r="4"/>
  <g class="ticket mover" style="offset-path: path('M170 125 C230 125 230 150 310 150 C390 150 390 45 396 45'); animation-delay: 0s"><rect x="-22" y="-10" width="44" height="20" rx="3"/><text x="0" y="4" text-anchor="middle">#1</text></g>
  <g class="ticket mover" style="offset-path: path('M170 125 C230 125 230 150 310 150 C390 150 390 115 396 115'); animation-delay: 2s"><rect x="-22" y="-10" width="44" height="20" rx="3"/><text x="0" y="4" text-anchor="middle">#2</text></g>
  <g class="ticket mover" style="offset-path: path('M170 125 C230 125 230 150 310 150 C390 150 390 185 396 185'); animation-delay: 4s"><rect x="-22" y="-10" width="44" height="20" rx="3"/><text x="0" y="4" text-anchor="middle">#3</text></g>
  <g class="ticket mover" style="offset-path: path('M170 125 C230 125 230 150 310 150 C390 150 390 255 396 255'); animation-delay: 6s"><rect x="-22" y="-10" width="44" height="20" rx="3"/><text x="0" y="4" text-anchor="middle">#4</text></g>
</svg>
<figcaption>tickets come off the queue, the coordinator hands them out, and several worker agents work at once</figcaption>
</figure>

The part that took me a while to figure out is the standing instruction that makes that handoff happen. Without one, an agent finishes its task, reports back, and sits there until I notice. Now I almost always tell the coordinator something like "when a task is done, keep picking up the next unblocked piece of work". That one sentence turns a batch of tasks into a queue that drains itself. "Unblocked" is the important word. It keeps agents from grabbing work that depends on something another agent hasn't finished yet.

The other thing that makes fan-out work is splitting along boundaries that don't overlap. Two agents editing the same file at the same time will make a mess, the same way two people would. If the plan can't be split cleanly, I'd rather run fewer agents. When agents do need to work in the same repo at the same time, give each one its own checkout. [Git worktrees](https://git-scm.com/docs/git-worktree) are the cheap way to do that: extra working folders attached to the same repo, each on its own branch, and Claude Code can [set them up for you](https://code.claude.com/docs/en/worktrees). Once you're running a lot of agents, it's probably worth keeping a pool of worktrees that are already set up and get reused between tickets, so each new agent doesn't wait on a fresh install and first build. [treehouse](https://github.com/kunchenguid/treehouse) is one tool that manages a pool like that.

[back to top](#top)
{: .back-top}

## Review across models, not within one

This is a habit I'd push on anyone using agents. I always have a standing instruction to bounce reviews between harnesses before a PR gets opened, and I've consistently gotten better results that way.

A model reviewing its own work tends to agree with itself. It made its choices for reasons that still seem good to it. There's research backing this up: a 2024 paper, ["LLM Evaluators Recognize and Favor Their Own Generations"](https://arxiv.org/abs/2404.13076), found that models rate their own outputs higher than other models' outputs, and the better a model is at spotting its own writing, the stronger the bias. A different model doesn't share those blind spots, so it catches different things. Even a fresh session of the same model helps. The Claude Code best practices call a second session "the easiest independent reviewer you can get", since it never saw the reasoning that produced the code.

OpenAI ships an official [Codex plugin for Claude Code](https://github.com/openai/codex-plugin-cc) that makes this easy. Claude can call `/codex:review` for a normal review or `/codex:adversarial-review` for "a steerable challenge review", and it can also hand whole tasks to Codex.

In practice it goes one of two ways:

* Claude writes the code and asks Codex to review it.
* Codex writes the code, and then a separate Claude session and a fresh Codex session both review it. That way there's always at least one reviewer that isn't the model that wrote it.

Either way, the review comments go back to whoever wrote the code, they fix it, and it goes around again until the reviewers stop finding real problems. Only then does a PR get opened, and then the automated PR reviews run on top and get addressed too. On my personal projects, every PR also gets a final review from a separate, cheaper model before I merge.

<figure class="diagram">
<svg viewBox="0 0 720 200" role="img" aria-labelledby="rev-t rev-d">
  <title id="rev-t">Cross-model review loop</title>
  <desc id="rev-d">One model writes the code. A different model reviews it, and the writer fixes the findings in a loop. Then a pull request is opened, automated PR reviews run and get addressed in a second loop, and finally a human merges it.</desc>
  <path class="wire" d="M130 130 H170"/><path class="flow" d="M130 130 H170"/>
  <path class="wire" d="M300 130 H340"/><path class="flow" d="M300 130 H340" style="animation-delay:-.5s"/>
  <path class="wire" d="M440 130 H470"/><path class="flow" d="M440 130 H470" style="animation-delay:-1s"/>
  <path class="wire" d="M600 130 H620"/><path class="flow" d="M600 130 H620" style="animation-delay:-1.5s"/>
  <path class="wire" d="M235 100 C235 40 75 40 75 100"/>
  <path class="flow" d="M235 100 C235 40 75 40 75 100"/>
  <text class="sub" x="155" y="36" text-anchor="middle">fix + re-review</text>
  <path class="wire" d="M535 100 C535 40 390 40 390 100"/>
  <path class="flow" d="M535 100 C535 40 390 40 390 100" style="animation-delay:-.8s"/>
  <text class="sub" x="462" y="36" text-anchor="middle">fix + re-run</text>
  <rect class="box" x="20" y="100" width="110" height="60" rx="4"/>
  <text class="lbl" x="75" y="128" text-anchor="middle">write</text>
  <text class="sub" x="75" y="146" text-anchor="middle">model A</text>
  <rect class="box hot" x="170" y="100" width="130" height="60" rx="4"/>
  <text class="lbl" x="235" y="128" text-anchor="middle">review</text>
  <text class="sub" x="235" y="146" text-anchor="middle">model B</text>
  <rect class="box" x="340" y="100" width="100" height="60" rx="4"/>
  <text class="lbl" x="390" y="135" text-anchor="middle">open PR</text>
  <rect class="box hot" x="470" y="100" width="130" height="60" rx="4"/>
  <text class="lbl" x="535" y="128" text-anchor="middle">PR review</text>
  <text class="sub" x="535" y="146" text-anchor="middle">automated</text>
  <rect class="box" x="620" y="100" width="80" height="60" rx="4"/>
  <text class="lbl" x="660" y="128" text-anchor="middle">merge</text>
  <text class="sub" x="660" y="146" text-anchor="middle">me</text>
</svg>
<figcaption>two review loops before the PR reaches me</figcaption>
</figure>

None of this means I stop reviewing. I still review most of the PRs my agents generate, because every so often an obvious, confidently wrong mistake makes it through all of the automated reviews. What the loops buy me is that by the time a PR reaches me, most of the small stuff is gone and I can spend my attention on whether the change is the right one. I even reviewed this entire blog post before posting it!

[back to top](#top)
{: .back-top}

## A throwaway command center

With five or six agents going, the hard part stops being the code and starts being keeping track. Which agent is waiting on me? Which PR failed CI? What's still blocked?

What's worked for me is having an agent build a small visual command center for the project: one page that shows the plan, what each agent is doing, and what's waiting on me. I've built a different one for each project so far, because each project had its own quirks. A migration wants to show progress per service. A side project cleanup wants to show which repos still need a deploy. Agents make this cheap enough that a one-off dashboard is fine. When the project ends, I throw it away.

Here's a made-up example of the kind of thing I mean:

<figure class="diagram">
<div class="cc" role="img" aria-label="Example command center with four columns: blocked, running, needs me, and done">
  <div class="col"><p class="cc-h">blocked</p>
    <div class="card wait">update docs<small>waits on api</small></div>
    <div class="card wait">deploy preview<small>waits on ci</small></div>
  </div>
  <div class="col"><p class="cc-h">running</p>
    <div class="card run">api: pagination<small>agent 1</small></div>
    <div class="card run">ui: empty states<small>agent 2</small></div>
    <div class="card run">tests: flaky suite<small>agent 3</small></div>
  </div>
  <div class="col"><p class="cc-h">needs me</p>
    <div class="card">pick a cache ttl<small>decision</small></div>
    <div class="card">PR #12<small>ready to merge</small></div>
  </div>
  <div class="col"><p class="cc-h">done</p>
    <div class="card done">schema change<small>merged</small></div>
    <div class="card done">lint cleanup<small>merged</small></div>
  </div>
</div>
<figcaption>an example command center</figcaption>
</figure>

The "needs me" column is the one that matters. Agents are fast, so I'm usually the bottleneck, and anything that shows me where I'm holding things up pays for itself.

The other half of keeping this manageable is protecting my own focus. Even with several projects going at once, I try to keep things smooth instead of overwhelming. I give each project a longer chunk of focus rather than bouncing between all of them every few minutes. The agents don't mind waiting a bit, but every switch costs me time to reload where things stand, and with enough of them, that overhead eats most of the time the agents saved.

[back to top](#top)
{: .back-top}

## Automate the friction away

If I had to pick one main point for this whole post, it's this: use the tools to take the friction out of the work, and then use the time you get back to run more things in parallel. My test is simple. If starting my day or picking a project back up takes more than typing "resume", there's friction left to remove. Once getting started is that cheap, the next step is adding more parallel work while the current work is running.

A few things that have helped the most:

* **Scheduled jobs.** The one I use every day is a morning brief. Before I sit down, an agent has already pulled together my setup for the day: my open tickets, what merged yesterday, and any announcements or news that matter to my work. I start the day reading one page instead of opening ten tabs. There's an example below.
* **PR watchers.** Small scripts that keep my open PRs synced with the main branch and merge them once they're approved and green. A PR that's done shouldn't need me to click a button (more on that in [auto-merging](#auto-merging)).
* **Cleanup scripts.** Agents create a lot of mess: disk space, old branches, workspaces nobody is using anymore. I have scripts that clean that up on a schedule. Where I can, I run agents in [remote execution environments](https://code.claude.com/docs/en/claude-code-on-the-web) instead, because a cloud container that gets thrown away when the session ends is the easiest cleanup there is. I still use local development where reuse matters more, like a big repo that's slow to set up or a build cache that takes a long time to warm.
* **Notifications.** This builds on the command center. An agent that's waiting on me is just sitting there, so I want to know right away. Some way of getting pinged, whether it's a phone notification or a browser notification, keeps things from sitting for hours. In Claude Code you can hook into its [`Notification` event](https://code.claude.com/docs/en/hooks) and send that wherever you'll actually see it.

<figure class="diagram">
<div class="cc three" role="img" aria-label="Example morning brief with three columns. My tickets: retry webhook failures, in progress with agent 2; pagination bug, new and needs a plan; bump Node to 24, PR open with checks green. Merged yesterday: rate limit config by agent 1, README update auto-merged, and flaky test fix by agent 3. Worth knowing: deploy freeze Friday, a team announcement; and auth library v5 is out, a breaking change for a library we use.">
  <div class="col"><p class="cc-h">my tickets</p>
    <div class="card run">retry webhook failures<small>in progress, agent 2</small></div>
    <div class="card wait">pagination bug<small>new, needs a plan</small></div>
    <div class="card">bump Node to 24<small>PR open, checks green</small></div>
  </div>
  <div class="col"><p class="cc-h">merged yesterday</p>
    <div class="card done">rate limit config<small>agent 1</small></div>
    <div class="card done">README update<small>auto-merged</small></div>
    <div class="card done">flaky test fix<small>agent 3</small></div>
  </div>
  <div class="col"><p class="cc-h">worth knowing</p>
    <div class="card">deploy freeze Friday<small>team announcement</small></div>
    <div class="card">auth library v5 is out<small>breaking change, we use it</small></div>
  </div>
</div>
<figcaption>an example morning brief, waiting for me before I sit down</figcaption>
</figure>

None of these are big projects. Most of them are a short script or a scheduled prompt, and agents are good at writing those too.

[back to top](#top)
{: .back-top}

## Guardrails

Agents are confident, and they're confident about things that stopped being true. The guardrail I lean on most is redundant verification. I have the agents double- and triple-check their assumptions throughout the work, even when nothing seems to have changed. Is that branch still where you think it is? Did another agent already merge something that touches this file? Does the test actually fail without your fix? It's cheap to ask an agent to check, and it's expensive when one builds an hour of work on a stale assumption.

The second half of that is making agents loud about their assumptions. I put instructions about this into as many places as I can: the planning step, the task prompts, the review prompts. An assumption that's written down can be cross-checked by me, by a reviewer model, or by another agent. One that stays in the agent's head just quietly turns into a bug.

I think of it like an airport. It's good to know which runway a pilot plans to land on, and which way they'll taxi once they're down, before it happens rather than after. Nobody in the tower is assuming the pilot is bad. It's that saying the plan out loud is how two planes find out they were headed for the same spot.

<figure class="diagram">
<svg viewBox="0 0 720 245" role="img" aria-labelledby="rw-t rw-d">
  <title id="rw-t">Two planes radioing their plans before landing</title>
  <desc id="rw-d">Two planes approach the same runway from opposite ends. Plane 1 radios that it is landing on runway 2 from the west. Plane 2 radios that it is also landing on runway 2, from the other direction. Both calls go to the tower, which stands for me, a reviewer, or another agent. The tower hears that they picked the same runway and tells plane 2 to hold while plane 1 lands.</desc>
  <rect class="box" x="10" y="15" width="230" height="78" rx="4"/>
  <text class="lbl" x="125" y="40" text-anchor="middle">plane 1 radios in</text>
  <text class="sub" x="125" y="60" text-anchor="middle">"landing on runway 2,</text>
  <text class="sub" x="125" y="78" text-anchor="middle">coming in from the west"</text>
  <rect class="box" x="480" y="15" width="230" height="78" rx="4"/>
  <text class="lbl" x="595" y="40" text-anchor="middle">plane 2 radios in</text>
  <text class="sub" x="595" y="60" text-anchor="middle">"also landing on runway 2,</text>
  <text class="sub" x="595" y="78" text-anchor="middle">from the other direction"</text>
  <path class="wire" d="M240 54 H280"/><path class="flow" d="M240 54 H280"/>
  <path class="wire" d="M480 54 H440"/><path class="flow" d="M480 54 H440" style="animation-delay:-.8s"/>
  <rect class="box hot" x="280" y="15" width="160" height="78" rx="4"/>
  <text class="lbl" x="360" y="40" text-anchor="middle">the tower</text>
  <text class="sub" x="360" y="60" text-anchor="middle">me, a reviewer,</text>
  <text class="sub" x="360" y="78" text-anchor="middle">or another agent</text>
  <path class="wire" d="M360 93 V115"/><path class="flow" d="M360 93 V115" style="animation-delay:-.4s"/>
  <g class="pulse"><rect class="alert" x="230" y="115" width="260" height="50" rx="4"/></g>
  <text class="lbl" x="360" y="137" text-anchor="middle">same runway: plane 2, hold</text>
  <text class="sub" x="360" y="155" text-anchor="middle">caught before anyone lands</text>
  <path class="wire" d="M60 93 V190" stroke-dasharray="3 4"/>
  <path class="wire" d="M660 93 V190" stroke-dasharray="3 4"/>
  <rect class="runway" x="10" y="190" width="700" height="44" rx="3"/>
  <line class="rwline" x1="20" y1="212" x2="700" y2="212"/>
  <rect class="spot" x="315" y="192" width="90" height="40" rx="3"/>
  <text class="rwlbl" x="360" y="227" text-anchor="middle">runway 2</text>
  <g transform="translate(60 212)"><g class="taxi"><path class="plane" d="M-18 -2 L12 -2 Q20 0 12 2 L-18 2 Z M-2 -2 L-10 -15 L-4 -15 L8 -2 Z M-2 2 L-10 15 L-4 15 L8 2 Z M-16 -2 L-21 -9 L-17 -9 L-11 -2 Z M-16 2 L-21 9 L-17 9 L-11 2 Z"/></g></g>
  <g transform="translate(660 212) scale(-1 1)"><g><path class="plane" d="M-18 -2 L12 -2 Q20 0 12 2 L-18 2 Z M-2 -2 L-10 -15 L-4 -15 L8 -2 Z M-2 2 L-10 15 L-4 15 L8 2 Z M-16 -2 L-21 -9 L-17 -9 L-11 -2 Z M-16 2 L-21 9 L-17 9 L-11 2 Z"/></g></g>
</svg>
<figcaption>the tower catches the overlap before anything lands</figcaption>
</figure>

[back to top](#top)
{: .back-top}

## Deterministic validation

Everything in the guardrails section is still an instruction, and an instruction is a request. Agents follow them nearly every time, but nearly isn't always. Anthropic's [Claude Code best practices](https://code.claude.com/docs/en/best-practices) split instructions into two kinds. Non-deterministic ones (your prompt, an AGENTS.md file, a skill) are read by the model, and "there's no guarantee that it'll follow your instructions." Deterministic ones (hooks, deny rules, tests, CI, branch protection) are enforced by the tooling, and they apply "every time, no matter what the model decided to do."

<figure class="diagram">
<div class="cc two" role="img" aria-label="Two columns. Instructions the model decides whether to follow: your prompt, AGENTS.md and skills, asking it to prove it's done, and its own summary of what it did. Rules the tooling enforces: tests and type checks, hooks, deny rules and the sandbox, and CI with branch protection.">
  <div class="col"><p class="cc-h">the model decides</p>
    <div class="card wait">your prompt<small>usually followed</small></div>
    <div class="card wait">AGENTS.md and skills<small>usually followed</small></div>
    <div class="card wait">"show me it's done"<small>usually followed</small></div>
    <div class="card wait">its own summary<small>usually right</small></div>
  </div>
  <div class="col"><p class="cc-h">the tooling enforces</p>
    <div class="card run">tests and type checks<small>every time</small></div>
    <div class="card run">hooks<small>every time</small></div>
    <div class="card run">deny rules and sandbox<small>every time</small></div>
    <div class="card run">CI and branch protection<small>every time</small></div>
  </div>
</div>
<figcaption>the same rule can live on either side; move the ones that can't have exceptions to the right</figcaption>
</figure>

So when something has to always happen, or never happen, I try to move it out of the prompt and into something that runs:

* **Tests, type checks and linters** that the agent has to get green before it says it's done. "Done" means the checks pass, not that the agent says it's done.
* **[Hooks](https://code.claude.com/docs/en/hooks-guide)** that run at fixed points in the agent's loop, like formatting every file it edits or blocking edits to generated code. In the docs' words, "certain actions always happen rather than relying on the LLM to choose to run them."
* **CI and branch protection** as the last word. No matter what any agent or reviewer thinks, nothing merges without passing checks, and anything that isn't set up to auto-merge needs a person to approve it.
* **Scripts for checkable assumptions.** If an assumption can be checked with a script, like whether the branch is up to date or whether a config value exists, a script beats asking the agent to remember to check.

Tests aren't one thing, though. They come in a lot of strengths, and the more of them a PR can point to, the less I need to read the diff to trust it. Roughly from cheapest to strongest:

<figure class="diagram">
<div class="cc ladder" role="img" aria-label="Ten kinds of checks, from cheapest to strongest: 1, lint and static analysis: seconds, catches patterns; 2, type checks: whole classes of mistakes; 3, unit tests: one function at a time; 4, integration tests: pieces working together; 5, end-to-end tests: an agent drives the real app; 6, screenshot and visual tests: what the user actually sees; 7, property-based tests: thousands of generated inputs; 8, fuzzing: random abuse until it breaks; 9, mutation testing: tests for your tests; 10, formal verification: proofs and model checking.">
    <div class="card"><b>1</b> lint and static analysis<small>seconds, catches patterns</small></div>
    <div class="card"><b>2</b> type checks<small>whole classes of mistakes</small></div>
    <div class="card"><b>3</b> unit tests<small>one function at a time</small></div>
    <div class="card"><b>4</b> integration tests<small>pieces working together</small></div>
    <div class="card"><b>5</b> end-to-end tests<small>an agent drives the real app</small></div>
    <div class="card"><b>6</b> screenshot and visual tests<small>what the user actually sees</small></div>
    <div class="card"><b>7</b> property-based tests<small>thousands of generated inputs</small></div>
    <div class="card"><b>8</b> fuzzing<small>random abuse until it breaks</small></div>
    <div class="card"><b>9</b> mutation testing<small>tests for your tests</small></div>
    <div class="card"><b>10</b> formal verification<small>proofs and model checking</small></div>
</div>
<figcaption>roughly cheapest first; the later rungs used to be hard to justify, and agents make them a lot cheaper to set up</figcaption>
</figure>

Lauren Tan's talk ["All Code Is Slop (Except Mine)"](https://ai.engineer/code/2026/talks/lauren-tan) is a good tour of the strong end. Her team has agents drive the real app to verify their changes, uses property-based testing on the UI, and has used [TLA+](https://lamport.azurewebsites.net/tla/tla.html) model checking and [Lean](https://lean-lang.org/) proofs on the parts that really can't break. She's also clear that formal verification is "not a silver bullet". You don't need every rung on every project. The point is to know the ladder exists and to climb it where the risk is.

The habit I'm trying to build: when a reviewer, human or model, flags the same kind of problem twice, ask whether it could be a check instead of a comment. A lint rule or a test catches it every time, for free, and nobody has to remember it.

Most of the time you still want the agent to use its judgment. The deterministic layer is for the short list of things where judgment isn't the point.

[back to top](#top)
{: .back-top}

## Auto-merging

Right now I'm the last step on most PRs, but not all of them. For certain projects, and for docs, we already auto-merge.

<figure class="diagram">
<svg viewBox="0 0 720 210" role="img" aria-labelledby="am-t am-d">
  <title id="am-t">Auto-merge decision flow</title>
  <desc id="am-d">An agent's pull request goes through the checks. If they fail, the agent fixes it and tries again. If they pass and the change is docs only or in a project that allows it, it auto-merges. Otherwise it goes to a person for review before merging.</desc>
  <path class="wire" d="M110 95 H150"/><path class="flow" d="M110 95 H150"/>
  <path class="wire" d="M290 95 H330"/><path class="flow" d="M290 95 H330" style="animation-delay:-.5s"/>
  <path class="wire" d="M490 95 C510 95 510 45 530 45"/><path class="flow" d="M490 95 C510 95 510 45 530 45" style="animation-delay:-1s"/>
  <path class="wire" d="M490 95 C510 95 510 150 530 150"/>
  <text class="sub" x="498" y="62" text-anchor="end">yes</text>
  <text class="sub" x="498" y="138" text-anchor="end">no</text>
  <text class="sub" x="310" y="88" text-anchor="middle">yes</text>
  <path class="wire" d="M220 125 C220 190 60 190 60 125" stroke-dasharray="4 4"/>
  <path class="wire" d="M54 135 L60 125 L66 135"/>
  <text class="sub" x="140" y="200" text-anchor="middle">no: the agent fixes it</text>
  <rect class="box" x="10" y="65" width="100" height="60" rx="4"/>
  <text class="lbl" x="60" y="93" text-anchor="middle">PR</text>
  <text class="sub" x="60" y="111" text-anchor="middle">from an agent</text>
  <rect class="box" x="150" y="65" width="140" height="60" rx="4"/>
  <text class="lbl" x="220" y="93" text-anchor="middle">checks green?</text>
  <text class="sub" x="220" y="111" text-anchor="middle">tests, reviews, CI</text>
  <rect class="box" x="330" y="65" width="160" height="60" rx="4"/>
  <text class="lbl" x="410" y="93" text-anchor="middle">safe to skip me?</text>
  <text class="sub" x="410" y="111" text-anchor="middle">docs, low-risk projects</text>
  <rect class="box hot" x="530" y="20" width="180" height="50" rx="4"/>
  <text class="lbl" x="620" y="50" text-anchor="middle">auto-merge</text>
  <rect class="box" x="530" y="125" width="180" height="50" rx="4"/>
  <text class="lbl" x="620" y="148" text-anchor="middle">I review + merge</text>
  <text class="sub" x="620" y="165" text-anchor="middle">most PRs, for now</text>
</svg>
<figcaption>the "safe to skip me" box should keep growing</figcaption>
</figure>

Docs are the easy place to start. A change to a README or a doc comment is low risk, easy to revert, and the reviewer loops and checks above already catch most problems in it. Once those pass, there's not much left for me to add by clicking merge. GitHub's [auto-merge](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/automatically-merging-a-pull-request) and [protected branch rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) get you most of the way there: require the checks to pass, and have a small workflow turn on auto-merge for PRs whose changes are all docs.

Docs are also becoming less important in the first place. A lot of documentation exists so the next person can understand the code without reading all of it. Agents are getting better and better at reading the code and its context directly, so they need less of that written down, and a stale doc matters less when nobody is relying on it.

I think the future moves further in this direction. As agents understand code and context better, and as more of the "is this safe?" question gets answered by deterministic checks, more kinds of changes can merge on their own, and human review can focus on the changes where judgment actually matters.

[back to top](#top)
{: .back-top}

## Packaging what works

Once a workflow works more than once, I try to package it so I don't have to explain it again. Agents have three pieces that help here:

* [Skills](https://code.claude.com/docs/en/skills) are folders of instructions the agent loads when a task calls for them. They're a good fit for tasks that repeat but aren't deterministic enough to script, like "review this the way our team reviews" or "plan this migration".
* [MCP servers](https://modelcontextprotocol.io/introduction) connect the agent to your other systems, like your issue tracker or your docs, so it can look things up instead of asking you.
* [Plugins](https://code.claude.com/docs/en/plugins) bundle skills, agents, hooks and MCP servers together so a whole team can install them at once.

The idea I like most here is team plugins: one package with the team's domain knowledge, workflows, integrations, and planning, review and debugging conventions. A new teammate installs it and their agents start out knowing how the team works. Before writing your own skill or MCP server though, look around. There are a lot of good ones already, and Matt Pocock's repo above is a good place to start.

One rule I try to follow: only work on improving the harness while other work is actively running. Tweaking skills and prompts is fun, and it's easy to spend a whole afternoon on it while nothing ships. If agents are busy on real work, tuning the setup in the meantime is free. If they're not, it's usually procrastination.

[back to top](#top)
{: .back-top}

## What I want to try next

A few ideas I keep coming back to:

* **A disagreement detector.** Run the same task through several models and flag the places where they meaningfully disagree. The places where models agree are probably fine. The places where they disagree are exactly where a human should look. It's the cross-model review idea turned into something automatic. There's research pointing the same way: in [multiagent debate](https://arxiv.org/abs/2305.14325), several model instances propose answers and argue over them for a few rounds, which improved reasoning and factual accuracy and cut down on hallucinations.
* **Episodic memory.** Store past decisions and the reasons for them, and when a new task looks like an old one, pull up the similar cases so the agent starts from what we decided last time instead of from scratch. The [Reflexion](https://arxiv.org/abs/2303.11366) paper is a good starting point here. Its agents write reflections on what went wrong and "maintain their own reflective text in an episodic memory buffer" to make better decisions next time.
* **PRs you can review without reading the code.** I keep tuning what goes into my agents' PR summaries, adding some things and cutting others, with the goal of reaching a point where I don't need to read the diff to trust a change. Most of that comes from the PR spelling out what "done" meant: the acceptance criteria, the tests that prove each one, and that they all passed. The rest is visuals. I built a Chrome extension that builds on GitHub's new [pull request overview page](https://github.blog/changelog/2026-11-05-new-pull-request-overview-page-in-public-preview/) and lays out what changed and how it was checked, so I can judge a PR at a glance instead of scrolling through files.

[back to top](#top)
{: .back-top}

## This is a leadership problem too

Sometimes, the hardest part of this isn't the tooling. It's that everyone is figuring it out at the same time, and seniority doesn't mean you already know the answers. I think leading in this environment means modeling curiosity rather than expertise. For senior engineers, that looks like:

* Learning new tools in public, where people can see it.
* Saying "I don't understand this yet" out loud.
* Sharing your actual workflow, including the parts that failed.
* Making it safe for people to experiment and get it wrong.
* Giving people the time and resources to adapt, instead of expecting it to happen on top of their normal work.

There's research behind the safety part. Amy Edmondson defined [psychological safety](https://dash.harvard.edu/entities/publication/13a7b031-0fdd-45ec-a7e0-2b80e2bc679f) in 1999 as "a shared belief held by members of a team that the team is safe for interpersonal risk taking." When Google studied what made its teams effective in [Project Aristotle](https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness), psychological safety came out first on its list of what mattered, ahead of dependability, structure and clarity, meaning, and impact. If people are afraid to look slow while they learn agents, they'll just not learn them.

[back to top](#top)
{: .back-top}

## If you're just starting

You don't need any of the parallel stuff to get value. If you've only used a chat window, here's the order I'd try things:

1. Use a coding agent in a real repo, on a small task you could do yourself, so you can judge the result.
2. Before your next bigger task, ask it to interview you about the plan before it writes any code.
3. Have a different model review the change before you open the PR.
4. Once that feels normal, run two agents at once on two separate pieces of work.
5. When you catch yourself explaining the same thing twice, turn it into a skill, a standing instruction, or deterministic validation.

Anthropic's advice in [Building effective agents](https://www.anthropic.com/research/building-effective-agents) applies to people too: start with "the simplest solution possible" and only add complexity when you need it. The fan-out and the command centers came later for me. The grilling and the cross-model review were the two things that made the biggest difference, and you can start both this week.

[back to top](#top)
{: .back-top}

## Sources

* [Claude Code overview](https://code.claude.com/docs/en/overview), Anthropic
* [Create custom subagents](https://code.claude.com/docs/en/sub-agents), Claude Code docs
* [Agent skills](https://code.claude.com/docs/en/skills), Claude Code docs
* [Hooks reference](https://code.claude.com/docs/en/hooks) and [hooks guide](https://code.claude.com/docs/en/hooks-guide), Claude Code docs
* [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web), Claude Code docs
* [Plugins](https://code.claude.com/docs/en/plugins), Claude Code docs
* [Introduction to the Model Context Protocol](https://modelcontextprotocol.io/introduction)
* [Codex](https://developers.openai.com/codex), OpenAI
* [Codex plugin for Claude Code](https://github.com/openai/codex-plugin-cc), OpenAI on GitHub
* Lauren Tan, ["All Code Is Slop (Except Mine)"](https://ai.engineer/code/2026/talks/lauren-tan), AI Engineer CODE 2026 ([video](https://www.youtube.com/watch?v=ZZ19zhYnDKY))
* Matt Pocock, [skills](https://github.com/mattpocock/skills) (including `grilling` and `wayfinder`), GitHub
* [Guide: Understand team effectiveness](https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness), Google re:Work
* Amy Edmondson, ["Psychological Safety and Learning Behavior in Work Teams"](https://dash.harvard.edu/entities/publication/13a7b031-0fdd-45ec-a7e0-2b80e2bc679f), Administrative Science Quarterly (1999)
* [Building effective agents](https://www.anthropic.com/research/building-effective-agents), Anthropic (2024)
* [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), Anthropic (2025)
* [The TLA+ home page](https://lamport.azurewebsites.net/tla/tla.html), Leslie Lamport
* [Lean](https://lean-lang.org/), the Lean theorem prover
* [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices), Claude Code docs
* [Run parallel sessions with worktrees](https://code.claude.com/docs/en/worktrees), Claude Code docs
* [git-worktree documentation](https://git-scm.com/docs/git-worktree), Git
* [treehouse](https://github.com/kunchenguid/treehouse), a pool of reusable git worktrees for agents
* Panickssery, Bowman and Feng, ["LLM Evaluators Recognize and Favor Their Own Generations"](https://arxiv.org/abs/2404.13076) (2024)
* Du et al., ["Improving Factuality and Reasoning in Language Models through Multiagent Debate"](https://arxiv.org/abs/2305.14325) (2023)
* Shinn et al., ["Reflexion: Language Agents with Verbal Reinforcement Learning"](https://arxiv.org/abs/2303.11366) (2023)
* [Automatically merging a pull request](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/automatically-merging-a-pull-request), GitHub Docs
* [New pull request overview page in public preview](https://github.blog/changelog/2026-11-05-new-pull-request-overview-page-in-public-preview/), GitHub Changelog
* [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), GitHub Docs
