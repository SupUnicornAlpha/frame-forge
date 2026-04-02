import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status', {
    enum: ['pending', 'running', 'paused', 'completed', 'failed'],
  })
    .notNull()
    .default('pending'),
  config: text('config').notNull(),
  result: text('result'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const taskSteps = sqliteTable('task_steps', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id),
  stepId: text('step_id').notNull(),
  agentRole: text('agent_role').notNull(),
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed'],
  }).notNull(),
  input: text('input'),
  output: text('output'),
  iterations: integer('iterations').default(0),
  usage: text('usage'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const taskArtifacts = sqliteTable('task_artifacts', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id),
  type: text('type', {
    enum: [
      'trend_report',
      'script',
      'script_evaluation',
      'storyboard_image',
      'video_clip',
      'final_evaluation',
    ],
  }).notNull(),
  url: text('url'),
  content: text('content'),
  metadata: text('metadata'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskStep = typeof taskSteps.$inferSelect;
export type TaskArtifact = typeof taskArtifacts.$inferSelect;
