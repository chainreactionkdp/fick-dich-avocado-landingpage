// RADAR REEL PUBLISHER — Cloudflare Worker
// Separate from the existing radar-affiliate-publisher text-post worker.
// Bind the SAME D1 database as DB so the 90-day history stays network-wide.

const GRAPH_VERSION_DEFAULT = "v26.0";
const RESERVATION_TTL = 45 * 60;
const JOB_TTL = 60 * 60;

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
        return json({
          success: true,
          service: "Radar Reel Publisher",
          version: "1.0.0",
          endpoints: ["/queue-reel", "/reel-upload", "/reel-status"],
        });
      }

      if (url.pathname === "/reel-upload" && request.method === "POST") {
        return await handleRendererUpload(request, env, url);
      }

      if (!authorized(request, env.PUBLISHER_API_KEY)) {
        return json({ success: false, error: "unauthorized" }, 401);
      }

      if (url.pathname === "/queue-reel" && request.method === "POST") {
        return await queueReel(request, env, url);
      }
      if (url.pathname === "/reel-status" && request.method === "GET") {
        return await reelStatus(env, url.searchParams.get("job_id"));
      }
      return json({ success: false, error: "not_found" }, 404);
    } catch (e) {
      return json({ success: false, error: "internal_error", detail: String(e?.message || e) }, 500);
    }
  }
};

function authorized(req, key) {
  if (!key) return false;
  return req.headers.get("Authorization") === `Bearer ${key}`;
}
function json(data, status=200) {
  return new Response(JSON.stringify(data), { status, headers: {"content-type":"application/json; charset=utf-8"} });
}
function now() { return Math.floor(Date.now()/1000); }
function norm(s="") {
  return String(s).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,180);
}
function validAsin(s) { return /^[A-Z0-9]{10}$/i.test(String(s||"")); }
function base64Utf8(s) {
  const bytes = new TextEncoder().encode(s); let bin="";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
async function sha256hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function randomToken() {
  const b = new Uint8Array(32); crypto.getRandomValues(b);
  return [...b].map(x=>x.toString(16).padStart(2,"0")).join("");
}

async function cleanupExpired(env) {
  const t=now();
  await env.DB.prepare("DELETE FROM product_reservations WHERE expires_at <= ?").bind(t).run();
  await env.DB.prepare("UPDATE reel_jobs SET status='expired', updated_at=? WHERE status IN ('queued','rendering') AND expires_at <= ?").bind(t,t).run();
}

async function checkBlocked(env, asin, family) {
  const t=now();
  const h = await env.DB.prepare(
    "SELECT id, blocked_until FROM product_history WHERE (asin=? OR family_key=?) AND blocked_until>? ORDER BY blocked_until DESC LIMIT 1"
  ).bind(asin,family,t).first();
  if (h) return {blocked:true, reason:"used_within_90_days", blocked_until:h.blocked_until};
  const r = await env.DB.prepare(
    "SELECT reservation_id, expires_at FROM product_reservations WHERE (asin=? OR family_key=?) AND expires_at>? LIMIT 1"
  ).bind(asin,family,t).first();
  if (r) return {blocked:true, reason:"reserved", blocked_until:r.expires_at};
  return {blocked:false};
}

async function queueReel(request, env, url) {
  await cleanupExpired(env);
  const b = await request.json();
  const asin = String(b.asin||"").toUpperCase();
  const title = String(b.product_title||"").trim();
  const author = String(b.brand_or_author||"").trim();
  const family = String(b.family_key || norm(`${author}-${title}`));
  const description = String(b.description||"").trim();
  const scenes = Array.isArray(b.scenes) ? b.scenes : [];
  const palette = b.palette || {};

  if (!validAsin(asin) || !title || !author || !family || !description || scenes.length < 4 || scenes.length > 8) {
    return json({success:false,error:"invalid_payload"},400);
  }
  for (const s of scenes) {
    if (!s || !Array.isArray(s.lines) || s.lines.length<1 || s.lines.length>4) {
      return json({success:false,error:"invalid_scene"},400);
    }
  }

  const blocked = await checkBlocked(env, asin, family);
  if (blocked.blocked) return json({success:false,error:"product_cooldown",...blocked},409);

  const jobId = crypto.randomUUID();
  const uploadToken = randomToken();
  const uploadHash = await sha256hex(uploadToken);
  const t=now();

  try {
    await env.DB.prepare(
      "INSERT INTO product_reservations(reservation_id,asin,family_key,product_title,target_page,reserved_at,expires_at) VALUES(?,?,?,?,?,?,?)"
    ).bind(jobId,asin,family,title,"thriller_radar",t,t+RESERVATION_TTL).run();
  } catch (e) {
    return json({success:false,error:"reservation_conflict"},409);
  }

  await env.DB.prepare(
    `INSERT INTO reel_jobs(job_id,asin,family_key,product_title,brand_or_author,description,palette_json,scenes_json,status,upload_token_hash,created_at,updated_at,expires_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(jobId,asin,family,title,author,description,JSON.stringify(palette),JSON.stringify(scenes),"queued",uploadHash,t,t,t+JOB_TTL).run();

  const job = {
    job_id: jobId,
    upload_token: uploadToken,
    worker_origin: url.origin,
    book_title: title,
    palette,
    scenes,
    duration_per_scene: Number(b.duration_per_scene || 2.7),
  };

  try {
    await dispatchGithub(env, base64Utf8(JSON.stringify(job)));
    await env.DB.prepare("UPDATE reel_jobs SET status='rendering',updated_at=? WHERE job_id=?").bind(now(),jobId).run();
  } catch (e) {
    await env.DB.prepare("DELETE FROM product_reservations WHERE reservation_id=?").bind(jobId).run();
    await env.DB.prepare("UPDATE reel_jobs SET status='dispatch_failed',error=?,updated_at=? WHERE job_id=?")
      .bind(String(e?.message||e),now(),jobId).run();
    return json({success:false,error:"github_dispatch_failed",detail:String(e?.message||e)},502);
  }

  return json({success:true,status:"rendering",job_id:jobId});
}

async function dispatchGithub(env, jobB64) {
  const owner=env.GITHUB_OWNER, repo=env.GITHUB_REPO;
  const workflow=env.GITHUB_WORKFLOW || "render-reel.yml";
  if (!owner || !repo || !env.GITHUB_TOKEN) throw new Error("github_not_configured");
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`, {
    method:"POST",
    headers:{
      "Authorization":`Bearer ${env.GITHUB_TOKEN}`,
      "Accept":"application/vnd.github+json",
      "X-GitHub-Api-Version":"2022-11-28",
      "User-Agent":"radar-reel-publisher"
    },
    body: JSON.stringify({ref: env.GITHUB_REF || "main", inputs:{job_b64:jobB64}})
  });
  if (!r.ok) throw new Error(`github_${r.status}_${await r.text()}`);
}

async function handleRendererUpload(request, env, url) {
  const jobId = url.searchParams.get("job_id");
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jobId || !token) return json({success:false,error:"unauthorized"},401);

  const job = await env.DB.prepare("SELECT * FROM reel_jobs WHERE job_id=?").bind(jobId).first();
  if (!job) return json({success:false,error:"job_not_found"},404);
  if (job.expires_at <= now()) return json({success:false,error:"job_expired"},410);
  if (["published","uploading"].includes(job.status)) return json({success:false,error:"job_already_used"},409);
  const got = await sha256hex(token);
  if (got !== job.upload_token_hash) return json({success:false,error:"unauthorized"},401);

  const ctype=request.headers.get("content-type")||"";
  if (!ctype.includes("video/mp4") && !ctype.includes("application/octet-stream")) {
    return json({success:false,error:"invalid_content_type"},415);
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength < 10000 || bytes.byteLength > 80*1024*1024) return json({success:false,error:"invalid_video_size"},400);

  await env.DB.prepare("UPDATE reel_jobs SET status='uploading',updated_at=? WHERE job_id=?").bind(now(),jobId).run();
  try {
    const result = await publishFacebookReel(env, bytes, job.description, job.product_title);
    const publishedAt=now();
    const blockedUntil=publishedAt + 90*24*60*60;
    await env.DB.prepare(
      "INSERT INTO product_history(asin,family_key,product_title,brand_or_author,target_page,facebook_post_id,published_at,blocked_until,created_at) VALUES(?,?,?,?,?,?,?,?,?)"
    ).bind(job.asin,job.family_key,job.product_title,job.brand_or_author,"thriller_radar",result.video_id,publishedAt,blockedUntil,publishedAt).run();
    await env.DB.prepare("DELETE FROM product_reservations WHERE reservation_id=?").bind(jobId).run();
    await env.DB.prepare("UPDATE reel_jobs SET status='published',facebook_video_id=?,updated_at=?,upload_token_hash='' WHERE job_id=?")
      .bind(result.video_id,now(),jobId).run();
    return json({success:true,status:"published",job_id:jobId,video_id:result.video_id,cooldown_protected:true});
  } catch (e) {
    await env.DB.prepare("DELETE FROM product_reservations WHERE reservation_id=?").bind(jobId).run();
    await env.DB.prepare("UPDATE reel_jobs SET status='failed',error=?,updated_at=?,upload_token_hash='' WHERE job_id=?")
      .bind(String(e?.message||e),now(),jobId).run();
    return json({success:false,error:"facebook_publish_failed",detail:String(e?.message||e)},502);
  }
}

async function publishFacebookReel(env, bytes, description, title) {
  const pageId=env.THRILLER_RADAR_PAGE_ID, token=env.THRILLER_RADAR_TOKEN;
  if (!pageId || !token) throw new Error("facebook_not_configured");
  const gv=env.META_GRAPH_VERSION || GRAPH_VERSION_DEFAULT;
  const base=`https://graph.facebook.com/${gv}/${pageId}/video_reels`;

  const startBody=new URLSearchParams({upload_phase:"START",access_token:token});
  const s=await fetch(base,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:startBody});
  const sj=await s.json();
  if (!s.ok || !sj.video_id || !sj.upload_url) throw new Error(`fb_start_${s.status}_${JSON.stringify(sj)}`);

  const up=await fetch(sj.upload_url,{
    method:"POST",
    headers:{
      "Authorization":`OAuth ${token}`,
      "offset":"0",
      "file_size":String(bytes.byteLength),
      "Content-Type":"application/octet-stream"
    },
    body:bytes
  });
  const ut=await up.text();
  if (!up.ok) throw new Error(`fb_upload_${up.status}_${ut}`);

  const finBody=new URLSearchParams({
    upload_phase:"FINISH",
    video_id:String(sj.video_id),
    video_state:"PUBLISHED",
    description:String(description||""),
    title:String(title||""),
    access_token:token
  });
  const f=await fetch(base,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:finBody});
  const fj=await f.json();
  if (!f.ok || fj.success===false) throw new Error(`fb_finish_${f.status}_${JSON.stringify(fj)}`);
  return {video_id:String(sj.video_id),finish:fj};
}

async function reelStatus(env, jobId) {
  if (!jobId) return json({success:false,error:"missing_job_id"},400);
  const j=await env.DB.prepare("SELECT job_id,product_title,status,facebook_video_id,error,created_at,updated_at FROM reel_jobs WHERE job_id=?").bind(jobId).first();
  return j ? json({success:true,...j}) : json({success:false,error:"job_not_found"},404);
}
