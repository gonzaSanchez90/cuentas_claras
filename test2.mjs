import { initDatabase, dbGet, dbAll } from './server/database.js';
await initDatabase();

const months = dbAll(`
      SELECT DISTINCT m.* 
      FROM months m
      LEFT JOIN participants p ON m.id = p.month_id
      WHERE m.creator_id = ? OR p.user_id = ?
      ORDER BY m.created_at DESC
    `, [2, 2]);

const result = months.map(m => {
      const participants = dbAll('SELECT * FROM participants WHERE month_id = ?', [m.id]);
      return {
        id: m.id,
        name: m.name,
        isClosed: !!m.is_closed,
        createdAt: m.created_at,
        creatorId: m.creator_id,
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          splitPercentage: p.split_percentage,
          userId: p.user_id
        }))
      };
    });

console.log(JSON.stringify(result.filter(m => m.id === 'p1ni7bm'), null, 2));
