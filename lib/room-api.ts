// lib/room-api.ts — thin re-export wrapper
// Implementations live in lib/repositories/room.repo.ts.
// This file preserves the backward-compat import path convention used by
// lib/expenses-api.ts / lib/categories-api.ts.

export type { RoomTask, RoomCheck, RoomLegacyKey } from './models/room.types'

export {
  getRoomTasks,
  getRoomChecks,
  saveRoomChecks,
  addRoomTask,
  updateRoomTask,
  setRoomTaskActive,
  reorderRoomTasks,
  deleteRoomTask,
} from './repositories/room.repo'
