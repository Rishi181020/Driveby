const FLUSH_MS      = parseInt(process.env.INSFORGE_FLUSH_MS      || '5000',  10);
const RETAIN_HOURS  = parseInt(process.env.INSFORGE_RETAIN_HOURS  || '24',    10);

let _client = null;

// Deduped buffer: one row per agent_id, overwritten each tick.
// On flush we write the latest state we saw for each agent — not every tick.
const _latest = new Map();

async function init() {
  const url = process.env.INSFORGE_URL;
  const key = process.env.INSFORGE_SERVICE_KEY;

  if (!url || !key) {
    console.log('[db] INSFORGE_URL / INSFORGE_SERVICE_KEY not set — persistence disabled');
    return;
  }

  try {
    const { createAdminClient } = await import('@insforge/sdk');
    _client = createAdminClient({ baseUrl: url.replace(/\/$/, ''), apiKey: key });
    setInterval(_flush, FLUSH_MS);
    console.log(`[db] InsForge ready — flushing every ${FLUSH_MS}ms`);
  } catch (e) {
    console.error('[db] InsForge init failed:', e.message);
  }
}

function buffer(tick, agents) {
  if (!_client) return;
  for (const a of agents) {
    _latest.set(a.id, {
      tick,
      agent_id:   a.id,
      speed:      a.state?.[0] ?? null,
      heading:    a.state?.[1] ?? null,
      dist_to_wp: a.state?.[2] ?? null,
      score:      a.score      ?? null,
      collided:   a.collided   ?? false,
    });
  }
}

async function _flush() {
  if (!_client || _latest.size === 0) return;
  const rows = [..._latest.values()];
  _latest.clear();
  const { error } = await _client.database.from('agent_snapshots').insert(rows);
  if (error) { console.error('[db] flush error:', error.message); return; }
  console.log(`[db] flushed ${rows.length} rows`);

  const cutoff = new Date(Date.now() - RETAIN_HOURS * 3600 * 1000).toISOString();
  const { error: delErr } = await _client.database
    .from('agent_snapshots')
    .delete()
    .lt('recorded_at', cutoff);
  if (delErr) console.error('[db] cleanup error:', delErr.message);
}

module.exports = { init, buffer };
