import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, date, datetime, decimal, unique } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const notes = mysqlTable('notes', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const journals = mysqlTable('journals', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  entryDate: date('entry_date').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  uniqueUserDate: unique().on(table.userId, table.entryDate),
}));

export const tasks = mysqlTable('tasks', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priority: mysqlEnum('priority', ['low', 'medium', 'high']).default('medium'),
  status: mysqlEnum('status', ['todo', 'completed']).default('todo'),
  deadline: datetime('deadline'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const schedules = mysqlTable('schedules', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  startTime: datetime('start_time').notNull(),
  endTime: datetime('end_time'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const financeTransactions = mysqlTable('finance_transactions', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  type: mysqlEnum('type', ['income', 'expense']).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  description: varchar('description', { length: 255 }),
  transactionDate: date('transaction_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const captures = mysqlTable('captures', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  rawText: text('raw_text').notNull(),
  status: mysqlEnum('status', ['pending', 'converted']).default('pending'),
  convertedType: mysqlEnum('converted_type', ['note', 'task', 'schedule', 'finance']),
  convertedId: int('converted_id'),
  createdAt: timestamp('created_at').defaultNow(),
  convertedAt: timestamp('converted_at'),
});