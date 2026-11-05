import pg from 'pg';

export class PgRateLimiter {
  constructor(private pool: pg.Pool) {}

  async consume(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
    const res = await this.pool.query(
      `INSERT INTO rate_limits (bucket, count, reset_at)
       VALUES ($1, 1, now() + make_interval(secs => $3))
       ON CONFLICT (bucket) DO UPDATE SET
         count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at <= now() THEN now() + make_interval(secs => $3) ELSE rate_limits.reset_at END
       RETURNING count`,
      [bucket, limit, windowSeconds]
    );
    const count = Number((res.rows[0] as { count: number }).count);
    return count <= limit;
  }
}
