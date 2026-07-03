# EaseBuild Portfolio Site — Design Spec

**Date:** 2026-06-27  
**Status:** Approved

## Goal

Marketing/portfolio site **EaseBuild** showcasing built web apps. First project: **CA Firm Ops** (`https://cafirmops.in`).

## Decisions

| Topic | Choice |
|-------|--------|
| Content | Static `projects.json` in repo |
| Hosting | New repo + **Vercel** (hobby tier) |
| Framework | Next.js App Router, SSG |
| Auth / DB | None in v1 |
| Theme | Light, professional (slate + blue accent) |
| Domain | `easebuild.in` (configure on Vercel after deploy) |

## Routes

- `/` — Hero, featured projects, CTA
- `/projects` — All projects grid
- `/projects/[slug]` — Project detail + live link
- `/about` — Studio / builder intro
- `/contact` — Email + optional mailto

## Data

`src/content/projects.json` — array of project objects (`slug`, `name`, `tagline`, `description`, `url`, `image`, `tags`, `featured`, `year`).

## Repos

- `easebuild` — this site (new)
- `charted_accountant_crm` — CA Firm Ops product (unchanged; linked only)

## Out of scope (v1)

Admin UI, CMS, blog, auth, shared monorepo with CRM.
