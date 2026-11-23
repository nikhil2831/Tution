import "server-only";
import { createPool, type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

const shared = globalThis as typeof globalThis & { tuitionPool?: Pool };

function pool() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is required.");
  return shared.tuitionPool ??= createPool({
    uri,
    timezone: "Z",
    connectionLimit: 8,
    queueLimit: 40,
    connectTimeout: 5000,
  });
}

type SqlValue = string | number | Date | Buffer | null;
type Executor = Pick<PoolConnection, "execute">;

export async function rows<T>(sql: string, values: SqlValue[] = [], executor: Executor = pool()): Promise<T[]> {
  const [result] = await executor.execute<(T & RowDataPacket)[]>(sql, values);
  return result;
}

export async function write(sql: string, values: SqlValue[] = [], executor: Executor = pool()) {
  const [result] = await executor.execute<ResultSetHeader>(sql, values);
  return result;
}

export async function transaction<T>(run: (connection: PoolConnection) => Promise<T>) {
  const connection = await pool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await run(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export const isoUtc = (column: string) =>
  "DATE_FORMAT(" + column + ", '%Y-%m-%dT%H:%i:%sZ')";
