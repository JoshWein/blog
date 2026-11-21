---
layout: post
title: "How I Work with a Team of Coding Agents"
description: 'Most of my code is written by agents now, and the job has turned into running a small team of them. Here is the workflow I use at work and on side projects: getting grilled before any code, fanning work out to parallel agents, reviewing across different models, and a throwaway command center to keep track of it all.'
---

<div id="top"></div>

A year ago I'd have described my job as writing code. Now it's closer to running a small team. On a normal day I have a few agents working at once, each on a different part of the plan, and most of my time goes into deciding what they should work on, unblocking them, and reviewing what comes back.

I do this at work, where I'm a tech lead, and on my own projects. Earlier this month I used it to clean up this site and its blog, plus a pile of old side projects that live on the site. In about three days that came to around 40 merged pull requests across the site and blog repos, each one opened by an agent and reviewed before I merged it.

This post covers how that workflow fits together. It's for people who already use agents, and also for people who've only tried a chat window and wonder what the fuss is about. I'll keep work examples generic.

* [The tools](#the-tools)
* [Get grilled before anything gets built](#get-grilled-before-anything-gets-built)
* [Fan out to parallel agents](#fan-out-to-parallel-agents)
* [Review across models, not within one](#review-across-models-not-within-one)
* [A throwaway command center](#a-throwaway-command-center)
* [Automate the friction away](#automate-the-friction-away)
* [Guardrails](#guardrails)
* [Deterministic validation](#deterministic-validation)
* [Packaging what works](#packaging-what-works)
* [What I want to try next](#what-i-want-to-try-next)
* [This is a leadership problem too](#this-is-a-leadership-problem-too)
* [If you're just starting](#if-youre-just-starting)
* [Sources](#sources)

## The tools

I'm not loyal to one tool. My main one is [Claude Code](https://code.claude.com/docs/en/overview), and I use OpenAI's [Codex](https://developers.openai.com/codex) a lot alongside it. When I run out of tokens on both, I drop to GitHub Copilot. For some kinds of web research I still just use ChatGPT in the browser, because it's good at that and doesn't need access to my code.

The fact that I mix them matters more than which ones I pick. Different models make different mistakes, and that turns out to be the most useful thing about having more than one. More on that in the review section.

## Get grilled before anything gets built

The most common way agent work goes wrong for me isn't bad code. It's good code for the wrong thing. If I give an agent a one-line ask, it fills in all the gaps with guesses, and it guesses with confidence.

So I start most real pieces of work by having the agent interview me. Matt Pocock has a set of open source [skills](https://github.com/mattpocock/skills) for this. His `grilling` skill tells the agent to "interview the user relentlessly about a plan, decision, or idea until every branch of the design tree is resolved". His `wayfinder` skill goes further for work that's too big for one session. It plans the work as "a shared map of decision tickets on the issue tracker" and resolves them one at a time.

You don't need the skills for this, though. It's just as easy to tell the agent to "grill me" about the work until we have a plan, and then have it write everything down in a clean doc that the other agents can read later. Anthropic's own [Claude Code best practices](https://code.claude.com/docs/en/best-practices) suggest the same thing: ask Claude to interview you until it could write the spec, write it to a file, and then start a fresh session to build from it.

It feels slow for the first ten minutes. Then it saves hours, because every agent that picks up a piece of the plan later gets the answers instead of guesses.

##### [back to top](#top)

## Fan out to parallel agents

Once there's a plan, I usually have one session act as a coordinator. It splits the plan into areas that don't step on each other and starts a subagent for each one, all at the same time. Claude Code supports this directly: [subagents](https://code.claude.com/docs/en/sub-agents) each run in their own context window with their own instructions, so one can be deep in a migration while another writes tests and neither fills up the other's context with noise. Anthropic calls this the [orchestrator-workers](https://www.anthropic.com/research/building-effective-agents) pattern, where "a central LLM dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results."

It isn't free. When Anthropic wrote up [their multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), a lead agent with parallel subagents beat a single Claude Opus 4 agent by 90.2% on their internal research eval, but multi-agent systems used about 15 times more tokens than a normal chat. Fan-out buys you speed and coverage, and you pay for it in tokens.

<figure class="diagram">
<svg viewBox="0 0 720 300" role="img" aria-labelledby="fan-t fan-d">
  <title id="fan-t">Fan-out diagram</title>
  <desc id="fan-d">I hand a plan to a coordinator agent. The coordinator starts four agents in parallel, each on its own area. Each agent opens a pull request, and finished agents loop back to the coordinator to pick up more unblocked work.</desc>
  <path class="wire" d="M130 150 H180"/>
  <path class="flow" d="M130 150 H180"/>
  <g>
    <path class="wire" d="M320 150 C355 150 355 45 390 45"/>
    <path class="wire" d="M320 150 C355 150 355 115 390 115"/>
    <path class="wire" d="M320 150 C355 150 355 185 390 185"/>
    <path class="wire" d="M320 150 C355 150 355 255 390 255"/>
    <path class="flow" d="M320 150 C355 150 355 45 390 45"/>
    <path class="flow" d="M320 150 C355 150 355 115 390 115" style="animation-delay:-.4s"/>
    <path class="flow" d="M320 150 C355 150 355 185 390 185" style="animation-delay:-.8s"/>
    <path class="flow" d="M320 150 C355 150 355 255 390 255" style="animation-delay:-1.2s"/>
  </g>
  <g>
    <path class="wire" d="M540 45 C570 45 570 150 600 150"/>
    <path class="wire" d="M540 115 C570 115 570 150 600 150"/>
    <path class="wire" d="M540 185 C570 185 570 150 600 150"/>
    <path class="wire" d="M540 255 C570 255 570 150 600 150"/>
  </g>
  <path class="wire" d="M465 280 C465 298 250 298 250 180" stroke-dasharray="4 4"/>
  <text class="sub" x="300" y="292">done? pick up more unblocked work</text>
  <rect class="box" x="20" y="120" width="110" height="60" rx="4"/>
  <text class="lbl" x="75" y="148" text-anchor="middle">me</text>
  <text class="sub" x="75" y="166" text-anchor="middle">the plan</text>
  <rect class="box hot" x="180" y="120" width="140" height="60" rx="4"/>
  <text class="lbl" x="250" y="148" text-anchor="middle">coordinator</text>
  <text class="sub" x="250" y="166" text-anchor="middle">splits + assigns</text>
  <rect class="box" x="390" y="20" width="150" height="50" rx="4"/>
  <text class="lbl" x="465" y="50" text-anchor="middle">agent: api</text>
  <rect class="box" x="390" y="90" width="150" height="50" rx="4"/>
  <text class="lbl" x="465" y="120" text-anchor="middle">agent: ui</text>
  <rect class="box" x="390" y="160" width="150" height="50" rx="4"/>
  <text class="lbl" x="465" y="190" text-anchor="middle">agent: tests</text>
  <rect class="box" x="390" y="230" width="150" height="50" rx="4"/>
  <text class="lbl" x="465" y="260" text-anchor="middle">agent: docs</text>
  <rect class="box" x="600" y="120" width="100" height="60" rx="4"/>
  <text class="lbl" x="650" y="148" text-anchor="middle">PRs</text>
  <circle class="dot pulse" cx="650" cy="166" r="4"/>
</svg>
<figcaption>one plan, one coordinator, several agents working at once</figcaption>
</figure>

The part that took me a while to figure out is the standing instruction. Without one, an agent finishes its task, reports back, and sits there until I notice. Now I almost always tell the coordinator something like "when a task is done, keep picking up the next unblocked piece of work". That one sentence turns a batch of tasks into a queue that drains itself. "Unblocked" is the important word. It keeps agents from grabbing work that depends on something another agent hasn't finished yet.

The other thing that makes fan-out work is splitting along boundaries that don't overlap. Two agents editing the same file at the same time will make a mess, the same way two people would. If the plan can't be split cleanly, I'd rather run fewer agents. When agents do need to work in the same repo at the same time, give each one its own checkout. [Git worktrees](https://code.claude.com/docs/en/worktrees) make that cheap: each session gets "a separate copy of the files to edit, so one session can build a feature while a second fixes a bug."

##### [back to top](#top)

## Review across models, not within one

This is the one habit I'd push on anyone using agents. I always have a standing instruction to bounce reviews between harnesses before a PR gets opened, and I've consistently gotten better results that way.

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

None of this means I stop reviewing. I still review every PR my agents generate, because every so often an obvious, confidently wrong mistake makes it through all of the automated reviews. What the loops buy me is that by the time a PR reaches me, most of the small stuff is gone and I can spend my attention on whether the change is the right one.

##### [back to top](#top)

## A throwaway command center

With five or six agents going, the hard part stops being the code and starts being keeping track. Which agent is waiting on me? Which PR failed CI? What's still blocked?

What's worked for me is having an agent build a small visual command center for the project: one page that shows the plan, what each agent is doing, and what's waiting on me. I've built a different one for each project so far, because each project had its own quirks. A migration wants to show progress per service. A side project cleanup wants to show which repos still need a deploy. Agents make this cheap enough that a one-off dashboard is fine. When the project ends, I throw it away.

Here's a made-up example of the kind of thing I mean:

<figure class="diagram">
<div class="cc" role="img" aria-label="Example command center with four columns: blocked, running, needs me, and done">
  <div class="col"><h6>blocked</h6>
    <div class="card wait">update docs<small>waits on api</small></div>
    <div class="card wait">deploy preview<small>waits on ci</small></div>
  </div>
  <div class="col"><h6>running</h6>
    <div class="card run">api: pagination<small>agent 1</small></div>
    <div class="card run">ui: empty states<small>agent 2</small></div>
    <div class="card run">tests: flaky suite<small>agent 3</small></div>
  </div>
  <div class="col"><h6>needs me</h6>
    <div class="card">pick a cache ttl<small>decision</small></div>
    <div class="card">PR #12<small>ready to merge</small></div>
  </div>
  <div class="col"><h6>done</h6>
    <div class="card done">schema change<small>merged</small></div>
    <div class="card done">lint cleanup<small>merged</small></div>
  </div>
</div>
<figcaption>an example command center</figcaption>
</figure>

The "needs me" column is the one that matters. Agents are fast, so I'm usually the bottleneck, and anything that shows me where I'm holding things up pays for itself.

##### [back to top](#top)

## Automate the friction away

If I had to pick one main point for this whole post, it's this: use the tools to take the friction out of the work, and then use the time you get back to run more things in parallel. My test is simple. If starting my day or picking a project back up takes more than typing "resume", there's friction left to remove. Once getting started is that cheap, the next step is adding more parallel work while the current work is running.

A few things that have helped the most:

* **Scheduled jobs.** The one I use every day is a morning brief. Before I sit down, an agent has already pulled together my setup for the day: my open tickets, what merged yesterday, and any announcements or news that matter to my work. I start the day reading one page instead of opening ten tabs.
* **PR watchers.** Small scripts that keep my open PRs synced with the main branch and merge them once they're approved and green. A PR that's done shouldn't need me to click a button. If your repo allows it, GitHub's built-in [auto-merge](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/automatically-merging-a-pull-request) handles the last step: it merges a PR "after all required reviews and status checks pass."
* **Cleanup scripts.** Agents create a lot of mess: disk space, old branches, workspaces nobody is using anymore. I have scripts that clean that up on a schedule. Where I can, I run agents in [remote execution environments](https://code.claude.com/docs/en/claude-code-on-the-web) instead, because a cloud container that gets thrown away when the session ends is the easiest cleanup there is. I still use local development where reuse matters more, like a big repo that's slow to set up or a build cache that takes a long time to warm.
* **Notifications.** This builds on the command center. An agent that's waiting on me is just sitting there, so I want to know right away. Some way of getting pinged, whether it's a phone notification or a browser notification, keeps things from sitting for hours. In Claude Code you can hook into its [`Notification` event](https://code.claude.com/docs/en/hooks) and send that wherever you'll actually see it.

None of these are big projects. Most of them are a short script or a scheduled prompt, and agents are good at writing those too.

##### [back to top](#top)

## Guardrails

Agents are confident, and they're confident about things that stopped being true. The guardrail I lean on most is redundant verification. I have the agents double- and triple-check their assumptions throughout the work, even when nothing seems to have changed. Is that branch still where you think it is? Did another agent already merge something that touches this file? Does the test actually fail without your fix? It's cheap to ask an agent to check, and it's expensive when one builds an hour of work on a stale assumption.

The second half of that is making agents loud about their assumptions. I put instructions about this into as many places as I can: the planning step, the task prompts, the review prompts. An assumption that's written down can be cross-checked by me, by a reviewer model, or by another agent. One that stays in the agent's head just quietly turns into a bug.

I think of it like an airport. It's good to know which runway a pilot plans to land on, and which way they'll taxi once they're down, before it happens rather than after. Nobody in the tower is assuming the pilot is bad. It's that saying the plan out loud is how two planes find out they were headed for the same spot.

The other guardrails are the ones I've already mentioned. Grill before building so the agents aren't guessing. Split work so agents don't collide. Review with a different model than the one that wrote the code. And I still read every PR myself before it merges. I even reviewed this entire blog post before posting it!

##### [back to top](#top)

## Deterministic validation

Everything in the guardrails section is still an instruction, and an instruction is a request. Agents follow them nearly every time, but nearly isn't always. Anthropic's [Claude Code best practices](https://code.claude.com/docs/en/best-practices) split instructions into two kinds. Non-deterministic ones (your prompt, a CLAUDE.md file, a skill) are read by the model, and "there's no guarantee that it'll follow your instructions." Deterministic ones (hooks, deny rules, tests, CI, branch protection) are enforced by the tooling, and they apply "every time, no matter what the model decided to do."

So when something has to always happen, or never happen, I try to move it out of the prompt and into something that runs:

* **Tests, type checks and linters** that the agent has to get green before it says it's done. "Done" means the checks pass, not that the agent says it's done.
* **[Hooks](https://code.claude.com/docs/en/hooks-guide)** that run at fixed points in the agent's loop, like formatting every file it edits or blocking edits to generated code. In the docs' words, "certain actions always happen rather than relying on the LLM to choose to run them."
* **CI and branch protection** as the last word. No matter what any agent or reviewer thinks, nothing merges without passing checks and a person approving it.
* **Scripts for checkable assumptions.** If an assumption can be checked with a script, like whether the branch is up to date or whether a config value exists, a script beats asking the agent to remember to check.

The habit I'm trying to build: when a reviewer, human or model, flags the same kind of problem twice, ask whether it could be a check instead of a comment. A lint rule or a test catches it every time, for free, and nobody has to remember it.

Most of the time you still want the agent to use its judgment. The deterministic layer is for the short list of things where judgment isn't the point.

##### [back to top](#top)

## Packaging what works

Once a workflow works more than once, I try to package it so I don't have to explain it again. Agents have three pieces that help here:

* [Skills](https://code.claude.com/docs/en/skills) are folders of instructions the agent loads when a task calls for them. They're a good fit for tasks that repeat but aren't deterministic enough to script, like "review this the way our team reviews" or "plan this migration".
* [MCP servers](https://modelcontextprotocol.io/introduction) connect the agent to your other systems, like your issue tracker or your docs, so it can look things up instead of asking you.
* [Plugins](https://code.claude.com/docs/en/plugins) bundle skills, agents, hooks and MCP servers together so a whole team can install them at once.

The idea I like most here is team plugins: one package with the team's domain knowledge, workflows, integrations, and planning, review and debugging conventions. A new teammate installs it and their agents start out knowing how the team works. Before writing your own skill or MCP server though, look around. There are a lot of good ones already, and Matt Pocock's repo above is a good place to start.

One rule I try to follow: only work on improving the harness while other work is actively running. Tweaking skills and prompts is fun, and it's easy to spend a whole afternoon on it while nothing ships. If agents are busy on real work, tuning the setup in the meantime is free. If they're not, it's usually procrastination.

##### [back to top](#top)

## What I want to try next

Two ideas I keep coming back to:

* **A disagreement detector.** Run the same task through several models and flag the places where they meaningfully disagree. The places where models agree are probably fine. The places where they disagree are exactly where a human should look. It's the cross-model review idea turned into something automatic. There's research pointing the same way: in [multiagent debate](https://arxiv.org/abs/2305.14325), several model instances propose answers and argue over them for a few rounds, which improved reasoning and factual accuracy and cut down on hallucinations.
* **Episodic memory.** Store past decisions and the reasons for them, and when a new task looks like an old one, pull up the similar cases so the agent starts from what we decided last time instead of from scratch. The [Reflexion](https://arxiv.org/abs/2303.11366) paper is a good starting point here. Its agents write reflections on what went wrong and "maintain their own reflective text in an episodic memory buffer" to make better decisions next time.

##### [back to top](#top)

## This is a leadership problem too

At work, the hardest part of this isn't the tooling. It's that everyone is figuring it out at the same time, and seniority doesn't mean you already know the answers. I think leading in this environment means modeling curiosity rather than expertise. For senior engineers, that looks like:

* Learning new tools in public, where people can see it.
* Saying "I don't understand this yet" out loud.
* Sharing your actual workflow, including the parts that failed.
* Making it safe for people to experiment and get it wrong.
* Giving people the time and resources to adapt, instead of expecting it to happen on top of their normal work.

There's research behind the safety part. Amy Edmondson defined [psychological safety](https://dash.harvard.edu/entities/publication/13a7b031-0fdd-45ec-a7e0-2b80e2bc679f) in 1999 as "a shared belief held by members of a team that the team is safe for interpersonal risk taking." When Google studied what made its teams effective in [Project Aristotle](https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness), psychological safety came out first on its list of what mattered, ahead of dependability, structure and clarity, meaning, and impact. If people are afraid to look slow while they learn agents, they'll just not learn them.

##### [back to top](#top)

## If you're just starting

You don't need any of the parallel stuff to get value. If you've only used a chat window, here's the order I'd try things:

1. Use a coding agent in a real repo, on a small task you could do yourself, so you can judge the result.
2. Before your next bigger task, ask it to interview you about the plan before it writes any code.
3. Have a different model review the change before you open the PR.
4. Once that feels normal, run two agents at once on two separate pieces of work.
5. When you catch yourself explaining the same thing twice, turn it into a skill, a standing instruction, or deterministic validation.

Anthropic's advice in [Building effective agents](https://www.anthropic.com/research/building-effective-agents) applies to people too: start with "the simplest solution possible" and only add complexity when you need it. The fan-out and the command centers came later for me. The grilling and the cross-model review were the two things that made the biggest difference, and you can start both this week.

##### [back to top](#top)

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
* [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices), Claude Code docs
* [Run parallel sessions with Git worktrees](https://code.claude.com/docs/en/worktrees), Claude Code docs
* Panickssery, Bowman and Feng, ["LLM Evaluators Recognize and Favor Their Own Generations"](https://arxiv.org/abs/2404.13076) (2024)
* Du et al., ["Improving Factuality and Reasoning in Language Models through Multiagent Debate"](https://arxiv.org/abs/2305.14325) (2023)
* Shinn et al., ["Reflexion: Language Agents with Verbal Reinforcement Learning"](https://arxiv.org/abs/2303.11366) (2023)
* [Automatically merging a pull request](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/automatically-merging-a-pull-request), GitHub Docs
