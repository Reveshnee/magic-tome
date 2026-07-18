import {
  pgTable,
  text,
  timestamp,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core'

// ─── Better Auth tables ───
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// ─── Cur8 app tables ───
export const cur8Folder = pgTable('cur8_folder', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const cur8Item = pgTable('cur8_item', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  category: text('category').notNull(),
  folderId: text('folderId'),
  url: text('url').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  thumbnail: text('thumbnail'),
  favicon: text('favicon'),
  summary: text('summary'), // AI-generated warm summary, cached after first request
  savedAt: timestamp('savedAt').notNull().defaultNow(),
  openedAt: timestamp('openedAt'),
})

// Category-tied reflection notes (distinct from the global brain dump)
export const cur8Reflection = pgTable('cur8_reflection', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  category: text('category').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Brain dump — quick-capture notes for stray thoughts
export const cur8Note = pgTable('cur8_note', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  body: text('body').notNull(),
  pinned: boolean('pinned').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Per-user settings (webhook + email-out to mem.ai)
export const cur8Setting = pgTable('cur8_setting', {
  userId: text('userId').primaryKey(),
  zapierWebhookUrl: text('zapierWebhookUrl'),
  emailTo: text('emailTo'),
  memEmail: text('memEmail').default('save@mem.ai'),
  autoEmail: boolean('autoEmail').notNull().default(false),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// Per-user custom names for the 8 gardens (overrides the default displayName)
export const cur8GardenName = pgTable('cur8_garden_name', {
  userId: text('userId').notNull(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.category] }),
}))
