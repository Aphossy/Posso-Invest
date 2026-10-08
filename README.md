# 10/10 Ventures

10/10 Ventures Ltd is a Rwanda-based savings and investment group. Its purpose
is to turn disciplined collective savings into sustainable, income-generating
Rwandan businesses and long-term shared prosperity for its founding members.
The proposal identifies ventures such as a bakery, avocado farm, mushroom
farm, winery, and export business; these are plans and projections, not
guaranteed outcomes.

## Group and contribution plan

- Members: 12 founding members
- Monthly contribution: RWF 100,000 per member
- Saving commitment: 30 months
- Each member's planned contribution: RWF 3,000,000
- Planned group capital: RWF 36,000,000
- Contribution period: the 25th of the contribution month through the 5th of
  the following month (for example, October 25 to November 5, 2026)
- Borrowing and loans to members: not permitted by the group's selected policy

The application uses the contribution month as the contribution period. For
example, payments from October 25 through November 5 are recorded for October.
Automated email and in-app notifications are scheduled for 08:00 Africa/Kigali:

| Date                       | Notification                                          |
| -------------------------- | ----------------------------------------------------- |
| 25th                       | Contribution window opens                             |
| 1st of the following month | Reminder to members with an unpaid contribution       |
| 4th                        | Final reminder before the deadline                    |
| 6th                        | Overdue notice and configured late-penalty processing |

Inngest must be running and the email provider must be configured for scheduled
emails to be delivered. The application also records notification delivery
status for retry handling.

## Capital, ownership, and distributions

The plan calls for equal monthly contributions, totaling RWF 3,000,000 per
member and RWF 36,000,000 across 12 members. That pool is intended to be
invested through the company, not held as individually withdrawable balances.
The source proposal does not establish a legal share percentage, share class,
or ownership of each business asset. Equal contributions and equal projected
distributions should not be treated as a substitute for the company's
registered articles, share register, or other legal ownership records.

The proposal projects a one-time Year 5 group profit distribution of
RWF 15,870,000. Dividing that projection equally among 12 members gives
RWF 1,322,500 per member. This is a projected profit distribution, not a return
of each member's full RWF 3,000,000 contribution: it equals about 44.1% of that
amount. The proposal's payout table also says "10" members and claims 45.2%
recovery, both inconsistent with the 12-member group and the stated payout
amount. The application documentation uses the 12-member calculation and does
not present the projection as guaranteed.

The proposal describes a 60/40 profit distribution/retention policy from Year
6 and a 70/30 policy from Year 17. These are proposal assumptions that should
be confirmed and formally adopted by the members before distributions are
authorized. Actual distributions depend on audited results, cash available,
company obligations, and the adopted governance documents.

## No-loan policy

The group's selected policy is no borrowing and no loans to members. New loan
requests and approvals are disabled in the application. Existing loan records
are retained for historical reporting and any necessary record-keeping; they
are not permission to make new loans.

## Development

Use Bun to install dependencies and run project commands:

```sh
bun install
bun run dev
```

Useful checks:

```sh
bun run typecheck
bun run lint
bun run format:check
```
