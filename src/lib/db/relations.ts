import { relations } from "drizzle-orm";

import {
  auditLog,
  project,
  projectEnv,
  projectEnvVersion,
  user,
} from "./schema";

export const userRelations = relations(user, ({ many }) => ({
  auditLogs: many(auditLog),
  projectEnvVersions: many(projectEnvVersion),
}));

export const projectEnvVersionRelations = relations(
  projectEnvVersion,
  ({ one }) => ({
    changedByUser: one(user, {
      fields: [projectEnvVersion.changedByUserId],
      references: [user.id],
    }),
    projectEnv: one(projectEnv, {
      fields: [projectEnvVersion.projectEnvId],
      references: [projectEnv.id],
    }),
    project: one(project, {
      fields: [projectEnvVersion.projectId],
      references: [project.id],
    }),
  }),
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(user, {
    fields: [auditLog.userId],
    references: [user.id],
  }),
}));
