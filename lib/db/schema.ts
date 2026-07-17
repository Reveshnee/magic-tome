import {
  pgTable,
  text,
  timestamp,
  boolean,
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
  savedAt: timestamp('savedAt').notNull().defaultNow(),
})

// Brain dump — quick-capture notes for stray thoughts
export const cur8Note = pgTable('cur8_note', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  body: text('body').notNull(),
  pinned: boolean('pinned').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Per-user settings (e.g. Zapier webhook)
export const cur8Setting = pgTable('cur8_setting', {
  userId: text('userId').primaryKey(),
  zapierWebhookUrl: text('zapierWebhookUrl'),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})
