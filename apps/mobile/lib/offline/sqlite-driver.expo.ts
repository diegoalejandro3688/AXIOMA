import type { SQLiteBindParams, SQLiteDatabase } from 'expo-sqlite';
import type { SqliteDriver } from './sqlite-driver';

/** Adaptador real para React Native -- ver sqlite-driver.ts. */
export function createExpoSqliteDriver(db: SQLiteDatabase): SqliteDriver {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params) => {
      const result = await db.runAsync(sql, params as SQLiteBindParams);
      return { changes: result.changes };
    },
    getAllAsync: (sql, params) => db.getAllAsync(sql, params as SQLiteBindParams),
    getFirstAsync: (sql, params) => db.getFirstAsync(sql, params as SQLiteBindParams),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}
