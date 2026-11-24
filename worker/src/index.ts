import type { Env, AccountRow, DriveFileRow } from "./types";
import { db } from "./d1";
import { encryptSecret, hmac, safeEqual } from "./crypto";
import { exchangeCode, googleAuthUrl, googleIdentity, googleApi, refreshAccessToken } from "./google";
import { createInsight } from "./ai";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const cors = (request: Request, env: Env) => {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin === env.APP_BASE_URL;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
    "Vary": "Origin"
  };
};
function withCors(response: Response, headers: Record<string,string>) {
  const out = new Response(response.body, response); Object.entries(headers).forEach(([k,v])=>out.headers.set(k,v)); return out;
}
function cookie(request: Request, name: string) {
  return (request.headers.get("Cookie") || "").split(";").map(v=>v.trim()).find(v=>v.startsWith(`${name}=`))?.slice(name.length+1);
}
async function owner(request: Request, env: Env): Promise<{id:string;email:string;sessionId?:string}|null> {
  const token = cookie(request, "dcc_session"); if (!token) return null;
  const [payload, sig] = decodeURIComponent(token).split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload, env.SESSION_SECRET);
  if (!await safeEqual(sig, expected)) return null;
  try {
    const session = JSON.parse(atob(payload)) as {sub:string;email:string;exp:number;sid?:string};
    if (session.exp < Date.now() || session.email.toLowerCase() !== env.OWNER_EMAIL?.toLowerCase()) return null;
    if(session.sid) {
      const rows=await db<any[]>(env,`owner_sessions?id=eq.${encodeURIComponent(session.sid)}&owner_id=eq.${encodeURIComponent(session.sub)}&revoked_at=is.null&select=id&limit=1`);
      if(!rows[0]) return null;
    }
    return {id:session.sub,email:session.email,sessionId:session.sid};
  } catch { return null; }
}
async function requireOwner(request: Request, env: Env) {
  const user = await owner(request, env); if (!user) throw new Error("UNAUTHORIZED"); return user;
}
async function getAccount(env: Env, accountId: string, ownerId: string) {
  const rows = await db<AccountRow[]>(env, `connected_google_accounts?id=eq.${encodeURIComponent(accountId)}&owner_id=eq.${encodeURIComponent(ownerId)}&select=*`);
  if (!rows[0]) throw new Error("Account not found or not authorized.");
  return rows[0];
}
async function tokenFor(env: Env, account: AccountRow) {
  const refreshed = await refreshAccessToken(env, account.encrypted_refresh_token);
  return refreshed.access_token;
}
async function fetchTextForInsight(accessToken: string, file: DriveFileRow) {
  const exportable = file.mime_type === "application/vnd.google-apps.document";
  const textLike = ["text/plain", "text/markdown", "text/csv", "application/json"].includes(file.mime_type);
  if (!exportable && !textLike) return "";
  const endpoint = exportable
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.google_file_id)}/export?mimeType=text/plain`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.google_file_id)}?alt=media&supportsAllDrives=true`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Document text extraction failed (${response.status}).`);
  return (await response.text()).slice(0, 120_000);
}
async function saveInsight(env: Env, ownerId: string, file: DriveFileRow, insight: Awaited<ReturnType<typeof createInsight>>, contentHash: string | null = null) {
  const payload = {
    owner_id: ownerId, account_id: file.account_id, google_file_id: file.google_file_id,
    model: insight.model, content_hash: contentHash, ...insight.insight,
    status: "complete", error_message: null, source_modified_time: file.modified_time, updated_at: new Date().toISOString()
  };
  await db(env, "ai_document_insights?on_conflict=owner_id,account_id,google_file_id", {
    method: "POST", headers: { "Prefer": "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload)
  });
  return payload;
}
async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, {status:204});
  if (url.pathname === "/health") return json({ok:true,service:"drive-command-center-api"});
  try {
    if(url.pathname==="/api/auth/status" && request.method==="GET") {
      const current=await owner(request,env);
      return json({authenticated:Boolean(current),owner_email:current?.email||null});
    }
    if (url.pathname === "/api/auth/google/start" && request.method === "POST") {
      const state = crypto.randomUUID();
      const signed = await hmac(state, env.SESSION_SECRET);
      const response = json({url: googleAuthUrl(env, `${state}.${signed}`)});
      response.headers.append("Set-Cookie", `dcc_oauth_state=${state}.${signed}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
      return response;
    }
    if (url.pathname === "/api/auth/google/callback" && request.method === "GET") {
      const state = url.searchParams.get("state") || "";
      const expectedState = cookie(request,"dcc_oauth_state") || "";
      if (!state || state !== expectedState) return json({error:"Invalid OAuth state."},400);
      const [stateValue, signature] = state.split(".");
      if (!stateValue || !signature || !await safeEqual(signature, await hmac(stateValue,env.SESSION_SECRET))) return json({error:"Invalid OAuth signature."},400);
      const code = url.searchParams.get("code"); if (!code) return json({error:"Missing authorization code."},400);
      const tokens = await exchangeCode(env,code);
      if (!tokens.refresh_token) return json({error:"Google did not return a refresh token. Revoke app access and reconnect with consent."},400);
      const identity = await googleIdentity(tokens.access_token);
      // First OAuth consent establishes the owner session and must match OWNER_EMAIL.
      // Once signed in, subsequent OAuth flows may connect any additional Google identity.
      const currentOwner = await owner(request, env);
      if (!currentOwner && identity.email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) {
        const knownOwner=await db<any[]>(env,`owner_sessions?email=eq.${encodeURIComponent(env.OWNER_EMAIL)}&select=owner_id&order=created_at.desc&limit=1`);
        if(knownOwner[0]) await db(env,"owner_access_events",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({owner_id:knownOwner[0].owner_id,session_id:null,event_type:"login_denied",email:identity.email,user_agent:(request.headers.get("User-Agent")||"").slice(0,240),risk_level:"review",risk_reason:"Google identity did not match the configured owner allowlist"})});
        return json({error:"This Google account is not the configured owner. Access is restricted to Dhirendra's allowlisted Google identity."},403);
      }
      const ownerId = currentOwner?.id || identity.sub;
      const encrypted = await encryptSecret(tokens.refresh_token,env.TOKEN_ENCRYPTION_KEY);
      await db(env, "connected_google_accounts?on_conflict=google_sub", {
        method:"POST", headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},
        body:JSON.stringify({owner_id:ownerId,google_sub:identity.sub,google_email:identity.email,display_name:identity.name||null,avatar_url:identity.picture||null,status:"connected",encrypted_refresh_token:encrypted,token_key_version:1})
      });
      const headers = new Headers({Location:`${env.APP_BASE_URL}/?connected=1`,"Cache-Control":"no-store"});
      if (!currentOwner) {
        const sid=crypto.randomUUID();
        const ip=request.headers.get("CF-Connecting-IP")||"unknown";
        const ua=request.headers.get("User-Agent")||"unknown";
        const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,"0")).join("");
        const prior=await db<any[]>(env,`owner_sessions?owner_id=eq.${encodeURIComponent(ownerId)}&select=user_agent_hash,ip_hash&order=created_at.desc&limit=20`);
        const uaHash=await digest(ua), ipHash=await digest(ip);
        const newDevice=!prior.some(x=>x.user_agent_hash===uaHash);
        const newNetwork=!prior.some(x=>x.ip_hash===ipHash);
        await db(env,"owner_sessions",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({id:sid,owner_id:ownerId,email:identity.email,user_agent:ua.slice(0,240),user_agent_hash:uaHash,ip_hash:ipHash,ip_label:ip==="unknown"?"Unknown":"Hashed network identifier",created_at:new Date().toISOString(),last_seen_at:new Date().toISOString()})});
        await db(env,"owner_access_events",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({owner_id:ownerId,session_id:sid,event_type:"login_success",email:identity.email,user_agent:ua.slice(0,240),risk_level:newDevice||newNetwork?"review":"normal",risk_reason:[newDevice?"New device/browser":null,newNetwork?"New network":null].filter(Boolean).join("; ")||"Previously seen device and network"})});
        const payload = btoa(JSON.stringify({sub:ownerId,email:identity.email,exp:Date.now()+8*60*60*1000,sid}));
        const sig = await hmac(payload,env.SESSION_SECRET);
        headers.set("Set-Cookie",`dcc_session=${encodeURIComponent(payload+"."+sig)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`);
      }
      return new Response(null,{status:302,headers});
    }
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      const current=await owner(request,env);
      if(current?.sessionId) await db(env,`owner_sessions?id=eq.${encodeURIComponent(current.sessionId)}&owner_id=eq.${encodeURIComponent(current.id)}`,{method:"PATCH",body:JSON.stringify({revoked_at:new Date().toISOString()})});
      if(current) await db(env,"owner_access_events",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({owner_id:current.id,session_id:current.sessionId||null,event_type:"logout",email:current.email,risk_level:"normal",risk_reason:"Owner signed out"})});
      return new Response(null,{status:204,headers:{"Set-Cookie":"dcc_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"}});
    }
    const user = await requireOwner(request,env);
    if(user.sessionId && request.method!=="OPTIONS") {
      await db(env,`owner_sessions?id=eq.${encodeURIComponent(user.sessionId)}&owner_id=eq.${encodeURIComponent(user.id)}&revoked_at=is.null`,{method:"PATCH",body:JSON.stringify({last_seen_at:new Date().toISOString()})});
    }
    if(url.pathname==="/api/auth/heartbeat" && request.method==="POST") return json({ok:true});
    if(url.pathname==="/api/security/overview" && request.method==="GET") {
      const cutoff=new Date(Date.now()-5*60_000).toISOString();
      const sessions=await db<any[]>(env,`owner_sessions?owner_id=eq.${encodeURIComponent(user.id)}&revoked_at=is.null&last_seen_at=gte.${encodeURIComponent(cutoff)}&select=id,email,user_agent,ip_label,created_at,last_seen_at&order=last_seen_at.desc`);
      const events=await db<any[]>(env,`owner_access_events?owner_id=eq.${encodeURIComponent(user.id)}&select=id,event_type,email,user_agent,risk_level,risk_reason,created_at&order=created_at.desc&limit=50`);
      return json({active_sessions:sessions.length,current_session_id:user.sessionId||null,sessions,events});
    }
    if(url.pathname==="/api/security/sessions" && request.method==="GET") {
      const sessions=await db<any[]>(env,`owner_sessions?owner_id=eq.${encodeURIComponent(user.id)}&select=id,email,user_agent,ip_label,created_at,last_seen_at,revoked_at&order=last_seen_at.desc&limit=100`);
      return json({sessions});
    }
    const revokeSession=url.pathname.match(/^\/api\/security\/sessions\/([^/]+)\/revoke$/);
    if(revokeSession&&request.method==="POST") {
      if(revokeSession[1]===user.sessionId) return json({error:"Use Sign out on this device to end your current session."},400);
      await db(env,`owner_sessions?id=eq.${encodeURIComponent(revokeSession[1])}&owner_id=eq.${encodeURIComponent(user.id)}&revoked_at=is.null`,{method:"PATCH",body:JSON.stringify({revoked_at:new Date().toISOString()})});
      await db(env,"owner_access_events",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({owner_id:user.id,session_id:revokeSession[1],event_type:"session_revoked",email:user.email,risk_level:"normal",risk_reason:"Session revoked by owner"})});
      return json({ok:true});
    }

    if (url.pathname === "/api/accounts" && request.method === "GET") {
      const accounts = await db<unknown[]>(env,`connected_google_accounts?owner_id=eq.${encodeURIComponent(user.id)}&select=id,google_email,display_name,avatar_url,status,last_synced_at,created_at&order=created_at.desc`);
      return json({accounts:accounts.map((a:any)=>({id:a.id,email:a.google_email,display_name:a.display_name,avatar_url:a.avatar_url,status:a.status,last_synced_at:a.last_synced_at,created_at:a.created_at}))});
    }
    if (url.pathname === "/api/drive/files" && request.method === "GET") {
      const limit = Math.min(Number(url.searchParams.get("limit")||100),200);
      const rows = await db<any[]>(env,`drive_files?owner_id=eq.${encodeURIComponent(user.id)}&select=id,account_id,google_file_id,name,mime_type,size_bytes,modified_time,web_view_link,is_folder&order=modified_time.desc&limit=${limit}`);
      const accounts = await db<any[]>(env,`connected_google_accounts?owner_id=eq.${encodeURIComponent(user.id)}&select=id,google_email`);
      const byId = new Map(accounts.map(a=>[a.id,a.google_email]));
      return json({files:rows.map(f=>({id:f.google_file_id,account_id:f.account_id,name:f.name,mime_type:f.mime_type,size_bytes:f.size_bytes,modified_time:f.modified_time,web_view_link:f.web_view_link,is_folder:f.is_folder,account_email:byId.get(f.account_id)}))});
    }
    if (url.pathname === "/api/drive/sync" && request.method === "POST") {
      const body = await request.json() as {account_id:string;page_token?:string;reset?:boolean};
      const account = await getAccount(env,body.account_id,user.id);
      const access = await tokenFor(env,account);
      const existingState=await db<any[]>(env,`drive_sync_states?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&select=*&limit=1`);
      const state=existingState[0];
      const effectiveToken=body.reset?undefined:(body.page_token||state?.page_token||undefined);
      await db(env,"drive_sync_states?on_conflict=owner_id,account_id",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({owner_id:user.id,account_id:account.id,status:"running",page_token:effectiveToken||null,last_error:null,started_at:state?.started_at||new Date().toISOString(),updated_at:new Date().toISOString()})});
      const pageToken=effectiveToken?`&pageToken=${encodeURIComponent(effectiveToken)}`:"";
      const result = await googleApi<{files:Array<any>;nextPageToken?:string}>(access,`/drive/v3/files?supportsAllDrives=true&pageSize=100&orderBy=modifiedTime%20desc${pageToken}&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,parents,md5Checksum,owners(emailAddress),trashed)`);
      const rows = (result.files||[]).filter(f=>!f.trashed).map(f=>({owner_id:user.id,account_id:account.id,google_file_id:f.id,name:f.name,mime_type:f.mimeType,size_bytes:f.size?Number(f.size):null,modified_time:f.modifiedTime||null,web_view_link:f.webViewLink||null,parent_ids:f.parents||[],md5_checksum:f.md5Checksum||null,is_folder:f.mimeType==="application/vnd.google-apps.folder"}));
      if(rows.length) await db(env,"drive_files?on_conflict=account_id,google_file_id",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)});
      await db(env,`connected_google_accounts?id=eq.${account.id}&owner_id=eq.${encodeURIComponent(user.id)}`,{method:"PATCH",body:JSON.stringify({last_synced_at:new Date().toISOString(),status:"connected"})});
      await db(env,`drive_sync_states?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}`,{method:"PATCH",body:JSON.stringify({status:result.nextPageToken?"paused":"idle",page_token:result.nextPageToken||null,pages_processed:Number(state?.pages_processed||0)+1,files_processed:Number(state?.files_processed||0)+rows.length,completed_at:result.nextPageToken?null:new Date().toISOString(),updated_at:new Date().toISOString()})});
      return json({queued:false,synced:rows.length,has_more:Boolean(result.nextPageToken),next_page_token:result.nextPageToken||null});
    }
    if (url.pathname === "/api/drive/sync/status" && request.method === "GET") {
      const states=await db<any[]>(env,`drive_sync_states?owner_id=eq.${encodeURIComponent(user.id)}&select=account_id,status,page_token,pages_processed,files_processed,last_error,started_at,completed_at,updated_at&order=updated_at.desc&limit=200`);
      return json({states});
    }
    if (url.pathname === "/api/ai/insights" && request.method === "GET") {
      const limit=Math.min(Math.max(Number(url.searchParams.get("limit")||50),1),200);
      const accountFilter=url.searchParams.get("account_id");
      const query=`ai_document_insights?owner_id=eq.${encodeURIComponent(user.id)}${accountFilter?`&account_id=eq.${encodeURIComponent(accountFilter)}`:""}&select=id,account_id,google_file_id,model,language,document_type,title,summary,key_points,topics,entities,action_items,confidence,status,error_message,source_modified_time,updated_at&order=updated_at.desc&limit=${limit}`;
      const insights=await db<any[]>(env,query);
      return json({insights});
    }
    if (url.pathname === "/api/ai/summarize" && request.method === "POST") {
      const body=await request.json() as {account_id:string;file_id:string;force?:boolean};
      if(!body.account_id||!body.file_id) return json({error:"Choose a source account and indexed file."},400);
      const account=await getAccount(env,body.account_id,user.id);
      const files=await db<DriveFileRow[]>(env,`drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(body.file_id)}&select=id,owner_id,account_id,google_file_id,name,mime_type,size_bytes,modified_time,web_view_link,is_folder&limit=1`);
      const file=files[0]; if(!file||file.is_folder) return json({error:"Indexed document not found in the selected account."},404);
      const previous=await db<any[]>(env,`ai_document_insights?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(file.google_file_id)}&select=id,status,source_modified_time&limit=1`);
      if(!body.force&&previous[0]?.status==="complete"&&previous[0].source_modified_time===file.modified_time) return json({insight:previous[0],cached:true});
      const access=await tokenFor(env,account);
      const text=await fetchTextForInsight(access,file);
      const result=await createInsight(env,{name:file.name,mimeType:file.mime_type,modifiedTime:file.modified_time,text});
      const insight=await saveInsight(env,user.id,file,result);
      await audit(env,user.id,"ai_document_summarized",{account_id:account.id,file_id:file.google_file_id,configured:result.configured,model:result.model});
      return json({insight,cached:false,configured:result.configured});
    }
    if (url.pathname === "/api/ai/batch" && request.method === "POST") {
      const body=await request.json() as {account_id?:string;limit?:number;force?:boolean};
      const limit=Math.min(Math.max(Number(body.limit||10),1),25);
      const accountClause=body.account_id?`&account_id=eq.${encodeURIComponent(body.account_id)}`:"";
      const files=await db<DriveFileRow[]>(env,`drive_files?owner_id=eq.${encodeURIComponent(user.id)}${accountClause}&is_folder=eq.false&select=id,owner_id,account_id,google_file_id,name,mime_type,size_bytes,modified_time,web_view_link,is_folder&order=modified_time.desc&limit=${limit}`);
      const jobId=crypto.randomUUID();
      await db(env,"ai_jobs",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({id:jobId,owner_id:user.id,job_type:"batch_enrich",account_id:body.account_id||null,status:"running",requested_count:files.length,started_at:new Date().toISOString()})});
      let completed=0; let lastError="";
      for(const file of files){
        try{
          const account=await getAccount(env,file.account_id,user.id);
          const access=await tokenFor(env,account);
          const text=await fetchTextForInsight(access,file);
          const result=await createInsight(env,{name:file.name,mimeType:file.mime_type,modifiedTime:file.modified_time,text});
          await saveInsight(env,user.id,file,result); completed++;
        }catch(error){lastError=error instanceof Error?error.message:"AI enrichment failed.";}
        await db(env,`ai_jobs?id=eq.${encodeURIComponent(jobId)}&owner_id=eq.${encodeURIComponent(user.id)}`,{method:"PATCH",body:JSON.stringify({completed_count:completed,last_error:lastError||null})});
      }
      await db(env,`ai_jobs?id=eq.${encodeURIComponent(jobId)}&owner_id=eq.${encodeURIComponent(user.id)}`,{method:"PATCH",body:JSON.stringify({status:lastError&&completed===0?"failed":"succeeded",completed_count:completed,last_error:lastError||null,completed_at:new Date().toISOString()})});
      await audit(env,user.id,"ai_batch_enrichment_completed",{job_id:jobId,requested:files.length,completed});
      return json({job_id:jobId,requested:files.length,completed,last_error:lastError||null});
    }
    if (url.pathname === "/api/ai/jobs" && request.method === "GET") {
      const jobs=await db<any[]>(env,`ai_jobs?owner_id=eq.${encodeURIComponent(user.id)}&select=id,job_type,account_id,google_file_id,status,requested_count,completed_count,last_error,created_at,started_at,completed_at&order=created_at.desc&limit=50`);
      return json({jobs});
    }
    if (url.pathname === "/api/requests" && request.method === "GET") {
      const status=url.searchParams.get("status")||"pending";
      const statusFilter=status==="all"?"status=in.(pending,needs_review)":`status=eq.${encodeURIComponent(status)}`;
      const rows=await db<any[]>(env,`sharing_requests?owner_id=eq.${encodeURIComponent(user.id)}&${statusFilter}&select=*&order=received_at.desc&limit=100`);
      return json({requests:rows.map(r=>({id:r.id,requester_email:r.requester_email,requester_name:r.requester_name,item_name:r.item_name,source_account_email:r.source_account_email,received_at:r.received_at,status:r.status}))});
    }
    const resolveRequestMatch=url.pathname.match(/^\/api\/requests\/([^/]+)\/resolve$/);
    if(resolveRequestMatch && request.method==="POST") {
      const id=resolveRequestMatch[1], body=await request.json() as {account_id:string;file_id:string;requester_email:string;confirmed:boolean};
      if(!body.confirmed||!body.account_id||!body.file_id||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.requester_email||"")) return json({error:"Choose the exact source account, Drive file, requester email, and confirm."},400);
      const existing=await db<any[]>(env,`sharing_requests?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&status=eq.needs_review&select=id&limit=1`);
      if(!existing[0]) return json({error:"Needs-review request not found."},404);
      const account=await getAccount(env,body.account_id,user.id);
      const file=await db<any[]>(env,`drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(body.file_id)}&select=name&limit=1`);
      if(!file[0]) return json({error:"The selected file does not belong to the selected account."},404);
      await db(env,`sharing_requests?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}`,{method:"PATCH",body:JSON.stringify({account_id:account.id,google_file_id:body.file_id,requester_email:body.requester_email.toLowerCase(),item_name:file[0].name,status:"pending",classification_reason:"Owner manually verified the exact source account, Drive file, and recipient.",})});
      await audit(env,user.id,"gmail_request_manually_resolved",{request_id:id,account_id:account.id,file_id:body.file_id,recipient_email:body.requester_email.toLowerCase()});
      return json({ok:true,status:"pending",file_name:file[0].name});
    }
    const reqMatch=url.pathname.match(/^\/api\/requests\/([^/]+)\/(approve|reject)$/);
    if(reqMatch && request.method==="POST") {
      const id=reqMatch[1], action=reqMatch[2], body=await request.json() as {confirmed?:boolean};
      if(!body.confirmed) return json({error:"Explicit confirmation required."},400);
      const rows=await db<any[]>(env,`sharing_requests?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*`);
      const r=rows[0]; if(!r) return json({error:"Request not found."},404);
      if(action==="reject") {
        await db(env,`sharing_requests?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}`,{method:"PATCH",body:JSON.stringify({status:"rejected",reviewed_at:new Date().toISOString()})});
        await audit(env,user.id,"request_rejected",{request_id:id});
        return json({ok:true,status:"rejected"});
      }
      // Imported Gmail candidates are never auto-approved. Only a separately verified
      // pending row with exact account, file, and requester identifiers may be approved.
      if(r.status!=="pending" || !r.google_file_id || !r.account_id || !r.requester_email) return json({error:"This request is not fully verified. Resolve the exact Drive file, source account, and requester before granting access."},409);
      const account=await getAccount(env,r.account_id,user.id);
      const file=await db<any[]>(env,`drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(r.google_file_id)}&select=name&limit=1`);
      if(!file[0]) return json({error:"The requested file is not present in the selected account's indexed Drive."},404);
      const access=await tokenFor(env,account);
      const list=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(r.google_file_id)}/permissions?supportsAllDrives=true&pageSize=100&fields=permissions(id,type,emailAddress,role)`,{headers:{Authorization:`Bearer ${access}`}});
      if(!list.ok) return json({error:`Could not verify existing Drive permissions (${list.status}).`},502);
      const listed=await list.json() as {permissions?:Array<{id:string;type:string;emailAddress?:string;role:string}>};
      const existing=(listed.permissions||[]).find(p=>p.type==="user"&&p.emailAddress?.toLowerCase()===r.requester_email.toLowerCase());
      let permissionId=existing?.id||null;
      if(!existing) {
        const grant=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(r.google_file_id)}/permissions?supportsAllDrives=true&sendNotificationEmail=true&fields=id,type,emailAddress,role`,{method:"POST",headers:{Authorization:`Bearer ${access}`,"Content-Type":"application/json"},body:JSON.stringify({type:"user",role:"reader",emailAddress:r.requester_email})});
        const permission=await grant.json() as any;
        if(!grant.ok) return json({error:`Google Drive permission grant failed (${grant.status}).`},502);
        permissionId=permission.id||null;
      }
      const prior=await db<any[]>(env,`permission_records?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(r.google_file_id)}&recipient_email=eq.${encodeURIComponent(r.requester_email)}&select=id&limit=1`);
      const record={permission_id:permissionId,role:existing?.role||"reader",permission_type:"user",source:"gmail_request_review",status:"active",updated_at:new Date().toISOString()};
      if(prior[0]) await db(env,`permission_records?id=eq.${encodeURIComponent(prior[0].id)}`,{method:"PATCH",body:JSON.stringify(record)});
      else await db(env,"permission_records",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({owner_id:user.id,account_id:account.id,google_file_id:r.google_file_id,recipient_email:r.requester_email,...record})});
      await db(env,`sharing_requests?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}`,{method:"PATCH",body:JSON.stringify({status:"approved",reviewed_at:new Date().toISOString()})});
      await audit(env,user.id,"gmail_share_request_approved",{request_id:id,account_id:account.id,file_id:r.google_file_id,recipient_email:r.requester_email,role:"reader"});
      return json({ok:true,status:"approved",role:"reader"});
    }
    if(url.pathname==="/api/permissions" && request.method==="GET") {
      const rows=await db<any[]>(env,`permission_records?owner_id=eq.${encodeURIComponent(user.id)}&select=id,account_id,google_file_id,permission_id,recipient_email,role,permission_type,expiration_time,source,status,created_at,updated_at&order=updated_at.desc&limit=200`);
      return json({permissions:rows});
    }
    const revokeMatch=url.pathname.match(/^\/api\/permissions\/([^/]+)\/revoke$/);
    if(revokeMatch && request.method==="POST") {
      const recordId=revokeMatch[1], body=await request.json() as {confirmed?:boolean};
      if(!body.confirmed) return json({error:"Explicit confirmation is required."},400);
      const records=await db<any[]>(env,`permission_records?id=eq.${encodeURIComponent(recordId)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*`);
      const record=records[0];
      if(!record) return json({error:"Permission record not found."},404);
      if(!record.permission_id) return json({error:"This record has no Google permission ID and cannot be revoked from this view."},409);
      const account=await getAccount(env,record.account_id,user.id), access=await tokenFor(env,account);
      const response=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(record.google_file_id)}/permissions/${encodeURIComponent(record.permission_id)}?supportsAllDrives=true`,{method:"DELETE",headers:{Authorization:`Bearer ${access}`}});
      if(!response.ok && response.status!==404) return json({error:`Google Drive revoke failed (${response.status}).`},502);
      await db(env,`permission_records?id=eq.${encodeURIComponent(recordId)}&owner_id=eq.${encodeURIComponent(user.id)}`,{method:"PATCH",body:JSON.stringify({status:"revoked",updated_at:new Date().toISOString()})});
      await audit(env,user.id,"drive_permission_revoked",{permission_record_id:recordId,file_id:record.google_file_id,recipient_email:record.recipient_email});
      return json({ok:true,status:"revoked"});
    }
    if(url.pathname==="/api/permissions/bulk-grant" && request.method==="POST") {
      const body=await request.json() as {file_ids?:string[];file_refs?:Array<{account_id:string;file_id:string}>;recipient_email:string;role:string;confirmed:boolean};
      const refs=Array.isArray(body.file_refs)?body.file_refs:(body.file_ids||[]).map(file_id=>({account_id:"",file_id}));
      if(!body.confirmed || !refs.length || refs.length>50 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.recipient_email)) return json({error:"Choose 1–50 files, a valid recipient, and explicitly confirm."},400);
      if(!["reader","commenter","writer"].includes(body.role)) return json({error:"Invalid permission role."},400);
      const results=[];
      for(const ref of refs) {
        const fileId=ref.file_id;
        const matches=await db<any[]>(env,`drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(ref.account_id)}&google_file_id=eq.${encodeURIComponent(fileId)}&select=account_id,google_file_id,name&limit=1`);
        if(matches.length!==1) { results.push({file_id:fileId,ok:false,error:"File not found in the selected source account."}); continue; }
        const account=await getAccount(env,matches[0].account_id,user.id);
        try {
          const access=await tokenFor(env,account);
          const list=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&pageSize=100&fields=permissions(id,type,emailAddress,role)`,{headers:{Authorization:`Bearer ${access}`}});
          if(!list.ok) throw new Error(`Could not verify existing permissions (${list.status}).`);
          const listed=await list.json() as {permissions?:Array<{id:string;type:string;emailAddress?:string;role:string}>};
          const existing=(listed.permissions||[]).find(p=>p.type==="user"&&p.emailAddress?.toLowerCase()===body.recipient_email.toLowerCase());
          let permissionId=existing?.id||null;
          if(existing&&existing.role!==body.role) {
            const update=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(existing.id)}?supportsAllDrives=true&fields=id`,{method:"PATCH",headers:{Authorization:`Bearer ${access}`,"Content-Type":"application/json"},body:JSON.stringify({role:body.role})});
            if(!update.ok) throw new Error(`Google permission update failed (${update.status}).`);
          } else if(!existing) {
            const response=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&sendNotificationEmail=true&fields=id,type,emailAddress,role`,{method:"POST",headers:{Authorization:`Bearer ${access}`,"Content-Type":"application/json"},body:JSON.stringify({type:"user",role:body.role,emailAddress:body.recipient_email})});
            const data=await response.json() as any;
            if(!response.ok) throw new Error(`Google permission API ${response.status}`);
            permissionId=data.id||null;
          }
          const prior=await db<any[]>(env,`permission_records?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(fileId)}&recipient_email=eq.${encodeURIComponent(body.recipient_email)}&select=id&limit=1`);
          const record={permission_id:permissionId,role:body.role,permission_type:"user",source:"command_center",status:"active",updated_at:new Date().toISOString()};
          if(prior[0]) await db(env,`permission_records?id=eq.${encodeURIComponent(prior[0].id)}`,{method:"PATCH",body:JSON.stringify(record)});
          else await db(env,"permission_records",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({owner_id:user.id,account_id:account.id,google_file_id:fileId,recipient_email:body.recipient_email,created_at:new Date().toISOString(),...record})});
          await audit(env,user.id,"drive_permission_granted",{account_id:account.id,file_id:fileId,file_name:matches[0].name,recipient_email:body.recipient_email,role:body.role,updated_existing:Boolean(existing)});
          results.push({file_id:fileId,ok:true,account_email:account.google_email,updated_existing:Boolean(existing)});
        } catch(e) {
          const msg=e instanceof Error?e.message:"Permission grant failed";
          await audit(env,user.id,"drive_permission_grant_failed",{account_id:account.id,file_id:fileId,error:msg});
          results.push({file_id:fileId,ok:false,error:msg});
        }
      }
      return json({ok:results.every(r=>r.ok),results,public_links_created:0});
    }

    // Authenticated, private PDF stream. Never returns a public Drive URL.
    const previewMatch=url.pathname.match(/^\/api\/drive\/files\/([^/]+)\/([^/]+)\/preview$/);
    if(previewMatch && request.method==="GET") {
      const account=await getAccount(env,previewMatch[1],user.id);
      const fileId=decodeURIComponent(previewMatch[2]);
      const owned=await db<any[]>(env,`drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(fileId)}&select=mime_type,name&limit=1`);
      if(!owned[0]) return json({error:"File not found in your indexed Drive."},404);
      if(owned[0].mime_type!=="application/pdf" && !owned[0].mime_type.startsWith("application/vnd.google-apps.")) return json({error:"Preview is available for PDFs and exportable Google documents only."},415);
      const access=await tokenFor(env,account);
      const native=owned[0].mime_type.startsWith("application/vnd.google-apps.");
      const endpoint=native?`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=application/pdf`:`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
      const upstream=await fetch(endpoint,{headers:{Authorization:`Bearer ${access}`}});
      if(!upstream.ok) return json({error:`Google Drive preview failed (${upstream.status}).`},upstream.status===404?404:502);
      const headers=new Headers({"Content-Type":"application/pdf","Content-Disposition":`inline; filename="${String(owned[0].name||"document.pdf").replace(/["\r\n]/g,"_")}"`,"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"});
      return new Response(upstream.body,{status:200,headers});
    }
    if(url.pathname==="/api/audit" && request.method==="GET") {
      const rows=await db<any[]>(env,`audit_logs?owner_id=eq.${encodeURIComponent(user.id)}&select=id,action,details,created_at&order=created_at.desc&limit=100`);
      return json({logs:rows});
    }
    if(url.pathname==="/api/collections" && request.method==="GET") {
      const rows=await db<any[]>(env,`sharing_collections?owner_id=eq.${encodeURIComponent(user.id)}&select=id,name,description,status,expires_at,created_at&order=created_at.desc`);
      return json({collections:rows});
    }
    if(url.pathname==="/api/collections" && request.method==="POST") {
      const body=await request.json() as {name:string;description?:string};
      const name=String(body.name||"").trim();
      if(!name || name.length>80) return json({error:"Collection name is required (maximum 80 characters)."},400);
      const rows=await db<any[]>(env,"sharing_collections",{method:"POST",headers:{"Prefer":"return=representation"},body:JSON.stringify({owner_id:user.id,name,description:String(body.description||"").slice(0,500)})});
      await audit(env,user.id,"collection_created",{collection_id:rows[0]?.id,name});
      return json({collection:rows[0]},201);
    }
    const collectionFileMatch=url.pathname.match(/^\/api\/collections\/([^/]+)\/files$/);
    if(collectionFileMatch && request.method==="POST") {
      const collectionId=collectionFileMatch[1], body=await request.json() as {files:Array<{account_id:string;file_id:string}>};
      const collection=await db<any[]>(env,`sharing_collections?id=eq.${encodeURIComponent(collectionId)}&owner_id=eq.${encodeURIComponent(user.id)}&select=id`);
      if(!collection[0]) return json({error:"Collection not found."},404);
      if(!Array.isArray(body.files)||!body.files.length||body.files.length>100) return json({error:"Choose between 1 and 100 files."},400);
      const inserts=[];
      for(const f of body.files) {
        const owned=await db<any[]>(env,`drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(f.account_id)}&google_file_id=eq.${encodeURIComponent(f.file_id)}&select=google_file_id&limit=1`);
        if(!owned[0]) return json({error:"One or more selected files are not owned by this workspace."},403);
        inserts.push({collection_id:collectionId,account_id:f.account_id,google_file_id:f.file_id});
      }
      await db(env,"collection_files?on_conflict=collection_id,account_id,google_file_id",{method:"POST",headers:{"Prefer":"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify(inserts)});
      await audit(env,user.id,"collection_files_added",{collection_id:collectionId,count:inserts.length});
      return json({ok:true,added:inserts.length});
    }
    if(url.pathname==="/api/automation/rules" && request.method==="GET") {
      const rows=await db<any[]>(env,`automation_rules?owner_id=eq.${encodeURIComponent(user.id)}&select=id,name,enabled,preview_only,conditions,action,created_at,updated_at&order=created_at.desc`);
      return json({rules:rows});
    }
    if(url.pathname==="/api/automation/rules" && request.method==="POST") {
      const body=await request.json() as {name:string;conditions?:Record<string,unknown>;action?:Record<string,unknown>};
      const name=String(body.name||"").trim();
      if(!name||name.length>80) return json({error:"Rule name is required (maximum 80 characters)."},400);
      const rows=await db<any[]>(env,"automation_rules",{method:"POST",headers:{"Prefer":"return=representation"},body:JSON.stringify({owner_id:user.id,name,enabled:false,preview_only:true,conditions:body.conditions||{},action:body.action||{}})});
      await audit(env,user.id,"automation_rule_created_preview_only",{rule_id:rows[0]?.id});
      return json({rule:rows[0]},201);
    }
    if(url.pathname==="/api/schedules" && request.method==="GET") {
      const rows=await db<any[]>(env,`scheduled_access_actions?owner_id=eq.${encodeURIComponent(user.id)}&select=id,account_id,google_file_id,recipient_email,role,action,run_at,status,attempts,last_error,created_at&order=run_at.asc&limit=200`);
      return json({schedules:rows});
    }
    if(url.pathname==="/api/schedules" && request.method==="POST") {
      const body=await request.json() as {account_id:string;file_id:string;recipient_email:string;role:string;action:string;run_at:string};
      if(!["reader","commenter","writer"].includes(body.role)||!["grant","revoke"].includes(body.action)||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.recipient_email||"")) return json({error:"Valid recipient, role and action are required."},400);
      const runAt=new Date(body.run_at);
      if(!Number.isFinite(runAt.getTime())||runAt.getTime()<Date.now()+60_000) return json({error:"Choose a time at least one minute in the future."},400);
      const account=await getAccount(env,body.account_id,user.id);
      const file=await db<any[]>(env,`drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(body.file_id)}&select=google_file_id&limit=1`);
      if(!file[0]) return json({error:"File not found in this account."},404);
      const key=crypto.randomUUID();
      const rows=await db<any[]>(env,"scheduled_access_actions",{method:"POST",headers:{"Prefer":"return=representation"},body:JSON.stringify({owner_id:user.id,account_id:account.id,google_file_id:body.file_id,recipient_email:body.recipient_email,role:body.role,action:body.action,run_at:runAt.toISOString(),idempotency_key:key})});
      await audit(env,user.id,"scheduled_access_created",{schedule_id:rows[0]?.id,action:body.action,run_at:runAt.toISOString()});
      return json({schedule:rows[0],execution_enabled:true,note:"Schedule saved. Cloudflare Cron checks due actions every five minutes. Confirm the Cron trigger is deployed and tested before relying on exact execution time."},201);
    }
    const cancelSchedule=url.pathname.match(/^\/api\/schedules\/([^/]+)\/cancel$/);
    if(cancelSchedule&&request.method==="POST") {
      const rows=await db<any[]>(env,`scheduled_access_actions?id=eq.${encodeURIComponent(cancelSchedule[1])}&owner_id=eq.${encodeURIComponent(user.id)}&status=eq.pending&select=id`);
      if(!rows[0]) return json({error:"Pending schedule not found."},404);
      await db(env,`scheduled_access_actions?id=eq.${encodeURIComponent(cancelSchedule[1])}&owner_id=eq.${encodeURIComponent(user.id)}`,{method:"PATCH",body:JSON.stringify({status:"cancelled"})});
      await audit(env,user.id,"scheduled_access_cancelled",{schedule_id:cancelSchedule[1]});
      return json({ok:true});
    }
    if(url.pathname==="/api/gmail/sync" && request.method==="POST") {
      const body=await request.json() as {account_id:string};
      const account=await getAccount(env,body.account_id,user.id), access=await tokenFor(env,account);
      const response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q="+encodeURIComponent('newer_than:30d (subject:shared OR "requested access" OR "share request")')+"&maxResults=50",{headers:{Authorization:`Bearer ${access}`}});
      if(!response.ok) return json({error:`Gmail sync failed (${response.status}).`},502);
      const data=await response.json() as {messages?:Array<{id:string}>};
      let imported=0;
      for(const m of data.messages||[]) {
        const detailRes=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,{headers:{Authorization:`Bearer ${access}`}});
        if(!detailRes.ok) continue;
        const detail=await detailRes.json() as any;
        const headers=detail.payload?.headers||[];
        const from=headers.find((h:any)=>h.name?.toLowerCase()==="from")?.value||"";
        const subject=headers.find((h:any)=>h.name?.toLowerCase()==="subject")?.value||"Google Drive sharing notification";
        const email=(from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||null;
        await db(env,"sharing_requests?on_conflict=account_id,gmail_message_id",{method:"POST",headers:{"Prefer":"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({owner_id:user.id,account_id:account.id,gmail_message_id:m.id,requester_email:email,requester_name:from.split("<")[0].replace(/["']/g,"").trim()||null,item_name:subject,source_account_email:account.google_email,status:"needs_review",classification_reason:"Imported from Gmail metadata; file identity and intent require owner verification."})});
        imported++;
      }
      await audit(env,user.id,"gmail_requests_synced",{account_id:account.id,imported});
      return json({ok:true,imported,requires_manual_review:true});
    }

    return json({error:"Not found."},404);
  } catch(e) {
    const message=e instanceof Error?e.message:"Unexpected error";
    return json({error:message==="UNAUTHORIZED"?"Authentication required.":message},message==="UNAUTHORIZED"?401:500);
  }
}
async function audit(env:Env,ownerId:string,action:string,details:Record<string,unknown>) {
  await db(env,"audit_logs",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({owner_id:ownerId,action,details})});
}
export default {
  async fetch(request:Request,env:Env):Promise<Response> {
    const headers=cors(request,env);
    const response=await handle(request,env);
    return withCors(response,headers);
  },
  async scheduled(_event:ScheduledController,env:Env,ctx:ExecutionContext) {
    ctx.waitUntil(runDueSchedules(env));
  }
};

async function runDueSchedules(env:Env) {
  const now=new Date().toISOString();
  const staleBefore=new Date(Date.now()-15*60_000).toISOString();
  const stale=await db<any[]>(env,`scheduled_access_actions?status=eq.running&run_at=lt.${encodeURIComponent(staleBefore)}&select=id,attempts&limit=20`);
  for(const item of stale||[]) await db(env,`scheduled_access_actions?id=eq.${encodeURIComponent(item.id)}&status=eq.running`,{method:"PATCH",body:JSON.stringify({status:Number(item.attempts||0)<3?"pending":"failed",run_at:now,last_error:"Recovered stale running job after worker interruption."})});
  const due=await db<any[]>(env,`scheduled_access_actions?status=eq.pending&run_at=lte.${encodeURIComponent(now)}&select=*&order=run_at.asc&limit=20`);
  await Promise.all((due||[]).map(async job=>{
    // Atomic compare-and-set claim: only one cron invocation can move a pending row to running.
    const claimed=await db<any[]>(env,`scheduled_access_actions?id=eq.${encodeURIComponent(job.id)}&status=eq.pending&run_at=lte.${encodeURIComponent(now)}&select=*`,{method:"PATCH",headers:{"Prefer":"return=representation"},body:JSON.stringify({status:"running",attempts:Number(job.attempts||0)+1,last_error:null})});
    if(!claimed?.length) return;
    const current=claimed[0];
    try {
      const account=await getAccount(env,current.account_id,current.owner_id);
      const access=await tokenFor(env,account);
      const listResponse=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(current.google_file_id)}/permissions?supportsAllDrives=true&pageSize=100&fields=permissions(id,type,emailAddress,role)`,{headers:{Authorization:`Bearer ${access}`}});
      if(!listResponse.ok) throw new Error(`Permission lookup failed (${listResponse.status}).`);
      const listed=await listResponse.json() as {permissions?:Array<{id:string;type:string;emailAddress?:string;role:string}>};
      const existing=(listed.permissions||[]).find(p=>p.type==="user"&&p.emailAddress?.toLowerCase()===String(current.recipient_email).toLowerCase());
      let permissionId=existing?.id||null;
      if(current.action==="grant") {
        if(existing && existing.role!==current.role) {
          const update=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(current.google_file_id)}/permissions/${encodeURIComponent(existing.id)}?supportsAllDrives=true&fields=id`,{method:"PATCH",headers:{Authorization:`Bearer ${access}`,"Content-Type":"application/json"},body:JSON.stringify({role:current.role})});
          if(!update.ok) throw new Error(`Permission update failed (${update.status}).`);
        } else if(!existing) {
          const grant=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(current.google_file_id)}/permissions?supportsAllDrives=true&sendNotificationEmail=true&fields=id`,{method:"POST",headers:{Authorization:`Bearer ${access}`,"Content-Type":"application/json"},body:JSON.stringify({type:"user",role:current.role,emailAddress:current.recipient_email})});
          const result=await grant.json() as any;
          if(!grant.ok) throw new Error(`Permission grant failed (${grant.status}).`);
          permissionId=result.id||null;
        }
        const prior=await db<any[]>(env,`permission_records?owner_id=eq.${encodeURIComponent(current.owner_id)}&account_id=eq.${encodeURIComponent(current.account_id)}&google_file_id=eq.${encodeURIComponent(current.google_file_id)}&recipient_email=eq.${encodeURIComponent(current.recipient_email)}&select=id&limit=1`);
        if(prior[0]) await db(env,`permission_records?id=eq.${encodeURIComponent(prior[0].id)}`,{method:"PATCH",body:JSON.stringify({permission_id:permissionId,role:current.role,status:"active",updated_at:new Date().toISOString(),source:"scheduled_access"})});
        else await db(env,"permission_records",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({owner_id:current.owner_id,account_id:current.account_id,google_file_id:current.google_file_id,permission_id:permissionId,recipient_email:current.recipient_email,role:current.role,permission_type:"user",source:"scheduled_access",status:"active"})});
      } else {
        if(existing) {
          const revoke=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(current.google_file_id)}/permissions/${encodeURIComponent(existing.id)}?supportsAllDrives=true`,{method:"DELETE",headers:{Authorization:`Bearer ${access}`}});
          if(!revoke.ok&&revoke.status!==404) throw new Error(`Permission revoke failed (${revoke.status}).`);
        }
        await db(env,`permission_records?owner_id=eq.${encodeURIComponent(current.owner_id)}&account_id=eq.${encodeURIComponent(current.account_id)}&google_file_id=eq.${encodeURIComponent(current.google_file_id)}&recipient_email=eq.${encodeURIComponent(current.recipient_email)}`,{method:"PATCH",body:JSON.stringify({status:"revoked",updated_at:new Date().toISOString()})});
      }
      await db(env,`scheduled_access_actions?id=eq.${encodeURIComponent(current.id)}&status=eq.running`,{method:"PATCH",body:JSON.stringify({status:"succeeded",last_error:null})});
      await audit(env,current.owner_id,`scheduled_permission_${current.action}`,{schedule_id:current.id,account_id:current.account_id,file_id:current.google_file_id,recipient_email:current.recipient_email,role:current.role});
    } catch(error) {
      const message=error instanceof Error?error.message:"Scheduled permission action failed.";
      const attempts=Number(current.attempts||1);
      const retry=attempts<3;
      const retryAt=new Date(Date.now()+Math.min(60,5*attempts)*60_000).toISOString();
      await db(env,`scheduled_access_actions?id=eq.${encodeURIComponent(current.id)}&status=eq.running`,{method:"PATCH",body:JSON.stringify({status:retry?"pending":"failed",run_at:retry?retryAt:current.run_at,last_error:message})});
      await audit(env,current.owner_id,"scheduled_permission_failed",{schedule_id:current.id,attempts,retry,error:message});
    }
  }));
}
