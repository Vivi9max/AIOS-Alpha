# AIOS Alpha Specification

> Canonical engineering specification for AIOS Alpha.
>
> This document is the single source of truth for architecture, module status,
> engineering conventions and roadmap.

---

# Project

Name

AIOS Alpha

Mission

An AI Operating System that converts long-term goals into executable outcomes,
continuously learns from execution, and evolves through accumulated knowledge.

Current Stage

Private Alpha

Current Commit

c117

---

# Core Architecture

AIOS Alpha

├── Dashboard
├── Planner
├── Outcomes
├── Tasks
├── Memory
├── Knowledge
├── Runtime
├── Founder Console
├── User Profile
├── Storage
└── APIs

---

# Core Engines

Planner Engine

Status

Active

Responsibilities

- Planning
- Prioritization
- Next Action
- Execution Queue

Execution Engine

Status

Active

Responsibilities

- Execute Tasks
- Update Progress
- Sync Milestones
- Complete Outcomes

Execution Memory

Status

Active

Responsibilities

- Store execution history
- Runtime metrics
- Planner history
- Learning context

Knowledge Engine

Status

Planned

Responsibilities

- Long-term knowledge
- Retrieval
- Experience synthesis
- Planner optimization

---

# Modules

Dashboard

Status

Implemented

Planner

Status

Implemented

Outcomes

Status

Implemented

Tasks

Status

Implemented

Memory

Status

Implemented

Founder Console

Status

Implemented

Execution Timeline

Status

Planned

Knowledge

Status

Planned

---

# Runtime

Execution Flow

Outcome

↓

Milestones

↓

Tasks

↓

Planner

↓

Execution Engine

↓

Execution Memory

↓

Knowledge

↓

Planner

---

# Storage

Persistent Storage

Enabled

User Isolation

Enabled

Execution Memory

Enabled

Outcome Store

Enabled

Task Store

Enabled

---

# APIs

/api/chat

/api/tasks

/api/outcomes

/api/planner

/api/planner/execute

/api/runtime/status

/api/profile

/api/memory

Future

/api/memory/execution

/api/knowledge

---

# Engineering Rules

1.

Never replace newer implementations.

2.

Always preserve backward compatibility.

3.

Prefer complete-file delivery.

4.

Every commit must improve standalone capability.

5.

Planner always drives execution.

6.

Execution always produces memory.

7.

Memory always improves planning.

---

# Completed

c111

Planner Snapshot

c112

Founder Console

c113

Outcome Engine

c114

Materialize Tasks

c115

Execution Engine

c116

Execution Memory

---

# Current Target

C117

Knowledge Engine

Execution Timeline

Planner Learning

Knowledge Retrieval

---

# Long-term Vision

Outcome OS

↓

Autonomous Planning

↓

Autonomous Execution

↓

Autonomous Learning

↓

Continuous Evolution