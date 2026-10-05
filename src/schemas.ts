/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { duelsSchema, entriesSchema, solutionsSchema, submissionsSchema, teamMembersSchema } from './schemas/duel-schemas'

export const schemas: CollectionSchema[] = [
  usersSchema,
  duelsSchema,
  entriesSchema,
  teamMembersSchema,
  submissionsSchema,
  solutionsSchema,
]
