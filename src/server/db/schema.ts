import { relations, sql } from "drizzle-orm";
import { index, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Links (short code -> destination)
 */
export const redirects = sqliteTable(
  "link_redirects",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    name: d.text({ length: 256 }),
    redirectedLink: d.text({ length: 2048 }).notNull(), // destination URL
    code: d.text({ length: 64 }).notNull().unique(), // the short slug
    createdById: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Link state
    isActive: d.integer({ mode: "boolean" }).notNull().default(true),
    maxUses: d.integer(), // null = infinate
    expiresAt: d.integer({ mode: "timestamp" }),
    password: d.text({ length: 256 }),
    monetisationEnabled: d.integer({ mode: "boolean" }).notNull().default(true),

    // Denormalised counters so dashboards don't have to COUNT(*) every load
    viewCount: d.integer({ mode: "number" }).notNull().default(0),
    uniqueViewCount: d.integer({ mode: "number" }).notNull().default(0),
    billableViewCount: d.integer({ mode: "number" }).notNull().default(0),
    lastViewedAt: d.integer({ mode: "timestamp" }),

    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("link_redirects_created_by_idx").on(t.createdById),
    index("link_redirects_name_idx").on(t.name),
    uniqueIndex("link_redirects_code_idx").on(t.code),
  ],
);

export const redirectsRelations = relations(redirects, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [redirects.createdById],
    references: [user.id],
  }),
  views: many(view),
}));

/**
 * One row per hit on a link. Rows are immutable, so there's no updatedAt.
 */
export const view = sqliteTable(
  "link_view",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    linkId: d
      .integer({ mode: "number" })
      .notNull()
      .references(() => redirects.id, { onDelete: "cascade" }),

    // Who (null = anonymous visitor)
    viewerId: d
      .text({ length: 255 })
      .references(() => user.id, { onDelete: "set null" }),
    // Salted hash of ip + user agent. Used for uniqueness without storing raw IPs.
    visitorHash: d.text({ length: 64 }).notNull(),
    ipHash: d.text({ length: 64 }),
    impressionAt: d.integer({ mode: "timestamp" }),

    // Where from
    referrer: d.text({ length: 2048 }),
    referrerDomain: d.text({ length: 255 }),
    utmSource: d.text({ length: 255 }),
    utmMedium: d.text({ length: 255 }),
    utmCampaign: d.text({ length: 255 }),

    // Geo
    country: d.text({ length: 2 }), // ISO 3166-1 alpha-2
    region: d.text({ length: 255 }),
    city: d.text({ length: 255 }),

    // Device
    userAgent: d.text({ length: 512 }),
    browser: d.text({ length: 64 }),
    os: d.text({ length: 64 }),
    deviceType: d
      .text({ enum: ["desktop", "mobile", "tablet", "bot", "unknown"] })
      .notNull()
      .default("unknown"),

    // Quality / payout flags
    isUnique: d.integer({ mode: "boolean" }).notNull().default(false),
    isBot: d.integer({ mode: "boolean" }).notNull().default(false),
    isBillable: d.integer({ mode: "boolean" }).notNull().default(false),

    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [
    // Time-series queries per link (the main analytics query)
    index("link_view_link_created_idx").on(t.linkId, t.createdAt),
    // Unique-visitor check on insert
    index("link_view_link_visitor_idx").on(t.linkId, t.visitorHash),
    index("link_view_viewer_idx").on(t.viewerId),
    index("link_view_country_idx").on(t.linkId, t.country),
    index("link_view_referrer_idx").on(t.linkId, t.referrerDomain),
    index("link_view_ip_idx").on(t.ipHash, t.isBillable, t.createdAt),
    index("link_view_link_ip_idx").on(t.linkId, t.ipHash, t.createdAt),
  ],
);

export const viewRelations = relations(view, ({ one }) => ({
  link: one(redirects, {
    fields: [view.linkId],
    references: [redirects.id],
  }),
  viewer: one(user, {
    fields: [view.viewerId],
    references: [user.id],
  }),
}));

/**
 * Better Auth core tables
 */
export const user = sqliteTable("user", (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.text({ length: 255 }),
  email: d.text({ length: 255 }).notNull().unique(),
  emailVerified: d.integer({ mode: "boolean" }).default(false),
  image: d.text({ length: 255 }),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
  links: many(redirects),
  views: many(view),
}));

export const account = sqliteTable(
  "account",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: d.text({ length: 255 }).notNull(),
    providerId: d.text({ length: 255 }).notNull(),
    accessToken: d.text(),
    refreshToken: d.text(),
    accessTokenExpiresAt: d.integer({ mode: "timestamp" }),
    refreshTokenExpiresAt: d.integer({ mode: "timestamp" }),
    scope: d.text({ length: 255 }),
    idToken: d.text(),
    password: d.text(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const session = sqliteTable(
  "session",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: d.text({ length: 255 }).notNull().unique(),
    expiresAt: d.integer({ mode: "timestamp" }).notNull(),
    ipAddress: d.text({ length: 255 }),
    userAgent: d.text({ length: 255 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const verification = sqliteTable(
  "verification",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    identifier: d.text({ length: 255 }).notNull(),
    value: d.text({ length: 255 }).notNull(),
    expiresAt: d.integer({ mode: "timestamp" }).notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/**
 * Single-row settings table (id is always 1). This is where you change the fee.
 *   UPDATE platform_settings SET platform_fee_bps = 800 WHERE id = 1;   -- 8%
 */
export const platformSettings = sqliteTable("platform_settings", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey(),
  platformFeeBps: d.integer({ mode: "number" }).notNull().default(1000), // 1000 = 10.00%
  withdrawalFeeMinor: d.integer({ mode: "number" }).notNull().default(50), // flat fee per withdrawal (covers Stripe costs)
  minWithdrawalMinor: d.integer({ mode: "number" }).notNull().default(1000),
  holdDays: d.integer({ mode: "number" }).notNull().default(35), // earnings locked this long after a period is finalised
  currency: d.text({ length: 3 }).notNull().default("usd"),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

/**
 * One row per closed revenue period (e.g. a month). `grossRevenueMinor` is what
 * Google actually reported/paid you for that period. It is split between links
 * in proportion to their billable views, so you can never owe more than you earned.
 */
export const revenuePeriod = sqliteTable(
  "revenue_period",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    startsAt: d.integer({ mode: "timestamp" }).notNull(),
    endsAt: d.integer({ mode: "timestamp" }).notNull(),
    grossRevenueMinor: d.integer({ mode: "number" }).notNull(),
    totalBillableViews: d.integer({ mode: "number" }).notNull(),
    feeBps: d.integer({ mode: "number" }).notNull(), // snapshot of the fee used
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [uniqueIndex("revenue_period_starts_idx").on(t.startsAt)],
);

/** A withdrawal request. The user receives `amountMinor`; `feeMinor` is kept by you. */
export const payout = sqliteTable(
  "payout",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    amountMinor: d.integer({ mode: "number" }).notNull(),
    feeMinor: d.integer({ mode: "number" }).notNull(),
    currency: d.text({ length: 3 }).notNull(),
    status: d
      .text({ enum: ["processing", "sent", "failed"] })
      .notNull()
      .default("processing"),
    stripeTransferId: d.text({ length: 255 }),
    failureReason: d.text({ length: 512 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    completedAt: d.integer({ mode: "timestamp" }),
  }),
  (t) => [index("payout_user_idx").on(t.userId, t.createdAt)],
);

/**
 * Append-only ledger. Rows are never edited or deleted; corrections are new rows.
 * A user's balance is simply SUM(amountMinor).
 */
export const ledgerEntry = sqliteTable(
  "ledger_entry",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    // No cascade: financial records must outlive account deletion.
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    linkId: d
      .integer({ mode: "number" })
      .references(() => redirects.id, { onDelete: "set null" }),
    periodId: d.integer({ mode: "number" }).references(() => revenuePeriod.id),
    payoutId: d.integer({ mode: "number" }).references(() => payout.id),
    type: d
      .text({
        enum: [
          "earning",
          "withdrawal",
          "withdrawal_fee",
          "reversal",
          "adjustment",
        ],
      })
      .notNull(),
    // Signed effect on the user's balance (earnings are net of the platform fee).
    amountMinor: d.integer({ mode: "number" }).notNull(),
    // Earnings only: how the amount was derived, kept for tax/audit.
    grossMinor: d.integer({ mode: "number" }),
    feeMinor: d.integer({ mode: "number" }),
    feeBps: d.integer({ mode: "number" }),
    billableViews: d.integer({ mode: "number" }),
    // Counts toward the withdrawable balance only once this time has passed.
    availableAt: d.integer({ mode: "timestamp" }).notNull(),
    note: d.text({ length: 512 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [
    index("ledger_user_idx").on(t.userId, t.availableAt),
    index("ledger_link_idx").on(t.linkId),
    // One earning row per link per period: finalising twice can't double-pay.
    uniqueIndex("ledger_period_link_type_idx").on(t.periodId, t.linkId, t.type),
  ],
);

/** A user's Stripe Connect (Express) account. */
export const payoutAccount = sqliteTable("payout_account", (d) => ({
  userId: d
    .text({ length: 255 })
    .primaryKey()
    .references(() => user.id),
  stripeAccountId: d.text({ length: 255 }).notNull().unique(),
  detailsSubmitted: d.integer({ mode: "boolean" }).notNull().default(false),
  payoutsEnabled: d.integer({ mode: "boolean" }).notNull().default(false),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));
