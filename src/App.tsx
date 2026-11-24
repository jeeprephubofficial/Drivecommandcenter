import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertCircle, ArrowUpRight, Bell, Check, Clock3, Cloud,
  File, FileText, Folder, HardDrive, LayoutDashboard, Link2, ListChecks, LockKeyhole,
  LogOut, Menu, Moon, Plus, RefreshCw, Search, Settings, ShieldCheck, Sun, Users, X, Home,
  Eye, CalendarClock, Smartphone, PackageOpen, Database, Mail, ShieldAlert, MonitorSmartphone, Sparkles
} from "lucide-react";
import { api, apiBaseConfigured, apiBlob } from "./lib/api";
import type { DocumentInsight, DriveFile, GoogleAccount, ShareRequest } from "./types";

type Section = "Overview" | "Security & Access" | "Accounts" | "Unified Drive" | "PDF Library" | "AI Library" | "Sharing Requests" | "Sharing Manager" | "Private Collections" | "Automation" | "Scheduled Access" | "Audit Logs" | "Settings";

const nav: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard }, { label: "Security & Access", icon: ShieldAlert }, { label: "Accounts", icon: Users },
  { label: "Unified Drive", icon: HardDrive }, { label: "PDF Library", icon: FileText }, { label: "AI Library", icon: Sparkles },
  { label: "Sharing Requests", icon: ListChecks }, { label: "Sharing Manager", icon: ShieldCheck },
  { label: "Private Collections", icon: Folder }, { label: "Automation", icon: Activity },
  { label: "Scheduled Access", icon: Clock3 }, { label: "Audit Logs", icon: File },
  { label: "Settings", icon: Settings }
];

const demoAccounts: GoogleAccount[] = [];
const demoFiles: DriveFile[] = [];
const demoRequests: ShareRequest[] = [];

function initials(email: string) { return email.slice(0, 1).toUpperCase(); }
function prettyBytes(n: number | null) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export default function App() {
  const [section, setSection] = useState<Section>("Overview");
  const [accounts, setAccounts] = useState<GoogleAccount[]>(demoAccounts);
  const [files, setFiles] = useState<DriveFile[]>(demoFiles);
  const [requests, setRequests] = useState<ShareRequest[]>(demoRequests);
  const [insights, setInsights] = useState<DocumentInsight[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [syncCursors, setSyncCursors] = useState<Record<string,string>>({});
  const [notice, setNotice] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [recipient, setRecipient] = useState("");
  const [role, setRole] = useState("reader");
  const [authState,setAuthState]=useState<"checking"|"signed_out"|"signed_in">("checking");
  const [ownerEmail,setOwnerEmail]=useState("");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = window.localStorage.getItem("dcc-theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    const handler=(event:Event)=>{event.preventDefault();setInstallPrompt(event as any);};
    window.addEventListener("beforeinstallprompt",handler);
    return ()=>window.removeEventListener("beforeinstallprompt",handler);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("dcc-theme", theme);
  }, [theme]);

  const ready = Boolean(apiBaseConfigured && authState==="signed_in");
  const filteredFiles = useMemo(() => files.filter(f =>
    (selectedAccount === "all" || f.account_id === selectedAccount) &&
    f.name.toLowerCase().includes(search.toLowerCase()) &&
    (section !== "PDF Library" || f.mime_type === "application/pdf")
  ), [files, search, selectedAccount, section]);

  async function loadDashboard() {
    if (!ready) return;
    setLoading(true); setError("");
    try {
      const [a, f, r, i] = await Promise.all([
        api<{ accounts: GoogleAccount[] }>("/api/accounts"),
        api<{ files: DriveFile[] }>("/api/drive/files?limit=1000"),
        api<{ requests: ShareRequest[] }>("/api/requests?status=all"),
        api<{ insights: DocumentInsight[] }>("/api/ai/insights?limit=200")
      ]);
      setAccounts(a.accounts || []); setFiles(f.files || []); setRequests(r.requests || []); setInsights(i.insights || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load dashboard."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let alive=true;
    (async()=>{
      if(!apiBaseConfigured){if(alive)setAuthState("signed_out");return;}
      try {
        const status=await api<{authenticated:boolean;owner_email:string|null}>("/api/auth/status");
        if(!alive)return;
        setOwnerEmail(status.owner_email||"");
        setAuthState(status.authenticated?"signed_in":"signed_out");
      } catch { if(alive)setAuthState("signed_out"); }
    })();
    return ()=>{alive=false;};
  },[]);
  useEffect(() => { if(authState==="signed_in") void loadDashboard(); }, [ready]);
  useEffect(() => {
    if(authState!=="signed_in")return;
    const tick=()=>{void api("/api/auth/heartbeat",{method:"POST",body:"{}"}).catch(()=>setAuthState("signed_out"));};
    tick(); const timer=window.setInterval(tick,60_000);
    return ()=>window.clearInterval(timer);
  },[authState]);

  async function connectAccount() {
    try {
      const result = await api<{ url: string }>("/api/auth/google/start", { method: "POST", body: JSON.stringify({}) });
      window.location.assign(result.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start Google connection."); }
  }

  async function syncAccount(id: string) {
    try {
      let pageToken:string|undefined=syncCursors[id], total=0, pages=0;
      do {
        const result: {synced:number;next_page_token:string|null}=await api<{synced:number;next_page_token:string|null}>("/api/drive/sync",{method:"POST",body:JSON.stringify({account_id:id,page_token:pageToken})});
        total+=result.synced; pageToken=result.next_page_token||undefined; pages++;
      } while(pageToken&&pages<25);
      setSyncCursors(prev=>{const next={...prev};if(pageToken)next[id]=pageToken;else delete next[id];return next;});
      setNotice(`Synced ${total.toLocaleString()} file records${pageToken?" (more pages remain; select Sync Drive again to continue)":""}.`);
      await loadDashboard();
    } catch (e) { setError(e instanceof Error ? e.message : "Sync failed."); }
  }

  async function summarizeFile(file: DriveFile) {
    try {
      setNotice(`Analyzing ${file.name}…`);
      await api("/api/ai/summarize", { method: "POST", body: JSON.stringify({ account_id: file.account_id, file_id: file.id, force: true }) });
      await loadDashboard(); setSection("AI Library"); setNotice(`AI insight ready for ${file.name}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "AI analysis failed."); }
  }

  async function enrichLibrary() {
    try {
      const result = await api<{ requested: number; completed: number }>("/api/ai/batch", { method: "POST", body: JSON.stringify({ limit: 20 }) });
      await loadDashboard(); setNotice(`AI enriched ${result.completed} of ${result.requested} indexed documents.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Batch AI enrichment failed."); }
  }

  async function approveRequest(id: string) {
    if (!window.confirm("Grant the requested access after reviewing the recipient and source account?")) return;
    try { await api(`/api/requests/${id}/approve`, { method: "POST", body: JSON.stringify({ confirmed: true }) }); setNotice("Approval action completed."); await loadDashboard(); }
    catch (e) { setError(e instanceof Error ? e.message : "Approval failed."); }
  }

  async function rejectRequest(id: string) {
    if (!window.confirm("Reject this request?")) return;
    try { await api(`/api/requests/${id}/reject`, { method: "POST", body: JSON.stringify({ confirmed: true }) }); await loadDashboard(); }
    catch (e) { setError(e instanceof Error ? e.message : "Rejection failed."); }
  }

  async function shareSelected() {
    if (!recipient.includes("@") || !selectedFiles.length) { setError("Select files and enter a valid recipient email."); return; }
    if (!window.confirm(`Share ${selectedFiles.length} selected item(s) with ${recipient} as ${role}?`)) return;
    try {
      const result=await api<{results:Array<{ok:boolean}>}>("/api/permissions/bulk-grant", { method: "POST", body: JSON.stringify({ file_refs: selectedFiles.map(key=>{const [account_id,...rest]=key.split(":");return {account_id,file_id:rest.join(":")};}), recipient_email: recipient, role, confirmed: true }) });
      const succeeded=result.results.filter(x=>x.ok).length;
      setNotice(`Drive permissions applied to ${succeeded} of ${result.results.length} selected item(s). Review individual outcomes in Audit Logs.`); setShowShare(false); setSelectedFiles([]);
    } catch (e) { setError(e instanceof Error ? e.message : "Sharing failed."); }
  }

  async function openPreview(file: DriveFile) {
    setPreviewFile(file); setPreviewUrl(""); setPreviewError(""); setPreviewLoading(true);
    try {
      const blob=await apiBlob(`/api/drive/files/${encodeURIComponent(file.account_id)}/${encodeURIComponent(file.id)}/preview`);
      const url=URL.createObjectURL(blob); setPreviewUrl(url);
    } catch(e) { setPreviewError(e instanceof Error?e.message:"Preview could not be loaded."); }
    finally { setPreviewLoading(false); }
  }
  useEffect(()=>()=>{ if(previewUrl) URL.revokeObjectURL(previewUrl); },[previewUrl]);
  async function signOut() { try{await api("/api/auth/logout",{method:"POST",body:"{}"});}finally{setAuthState("signed_out");setAccounts([]);setFiles([]);setRequests([]);setInsights([]);} }

  if(authState==="checking") return <AuthLoading theme={theme}/>;
  if(authState==="signed_out") return <OwnerLogin theme={theme} onTheme={setTheme} configured={apiBaseConfigured} onLogin={async()=>{try{const result=await api<{url:string}>("/api/auth/google/start",{method:"POST",body:"{}"});window.location.assign(result.url);}catch(e){setError(e instanceof Error?e.message:"Unable to start owner sign-in.");}}} error={error}/>;

  const title = section;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Cloud size={21}/></div><div><b>Drive Command</b><small>PRIVATE WORKSPACE</small></div><button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X/></button></div>
      <div className="owner-chip"><div className="owner-avatar">D</div><div><b>Dhirendra</b><small>{ownerEmail||"Owner account only"}</small></div><LockKeyhole size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${section === item.label ? "active" : ""}`} onClick={() => { setSection(item.label); setMobileNav(false); }}><Icon size={18}/><span>{item.label}</span>{item.label === "Sharing Requests" && requests.length > 0 && <em>{requests.length}</em>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="secure-note"><ShieldCheck size={17}/><span><b>Private by design</b><small>No public Drive links</small></span></div><button className="nav-item" onClick={signOut}><LogOut size={18}/>Sign out</button></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close menu"/>}
    <main className="main">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu/></button><button className="mobile-search" onClick={() => setSection("Unified Drive")}><Search size={16}/><span>Search files</span></button><div className="crumb">Workspace <span>/</span> {title}</div><div className="top-actions"><div className="connection"><i/> {accounts.length} accounts connected</div><button className="icon-btn" title="Sharing requests" onClick={() => setSection("Sharing Requests")}><Bell size={19}/></button><button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}<span>{theme === "dark" ? "Light" : "Dark"}</span></button><div className="profile">D</div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">COMMAND CENTER</div><h1>{title}</h1><p>{section === "Overview" ? "One secure workspace for all your Google Drive accounts." : sectionDescription(section)}</p></div><div className="heading-actions"><button className="btn secondary" onClick={loadDashboard}><RefreshCw size={16}/>Refresh</button><button className="btn primary" onClick={connectAccount}><Plus size={17}/>Connect account</button></div></div>
        {!ready && <div className="setup-alert"><AlertCircle size={19}/><div><b>Configuration required</b><p>Add the public Supabase URL/key and Worker API URL to your local environment. Your AI agent can configure the backend secrets and infrastructure using README.md.</p></div></div>}
        {error && <div className="alert error"><AlertCircle size={17}/>{error}<button onClick={() => setError("")}><X size={15}/></button></div>}
        {notice && <div className="alert success"><Check size={17}/>{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
        {section === "Overview" && <Overview accounts={accounts} files={files} requests={requests} loading={loading} onConnect={connectAccount} onNavigate={setSection}/>}
        {section === "Security & Access" && <SecurityAccess/>}
        {section === "Accounts" && <Accounts accounts={accounts} onConnect={connectAccount} onSync={syncAccount}/>}
        {(section === "Unified Drive" || section === "PDF Library") && <DriveExplorer files={filteredFiles} accounts={accounts} search={search} setSearch={setSearch} selectedAccount={selectedAccount} setSelectedAccount={setSelectedAccount} selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} onShare={() => setShowShare(true)} onPreview={openPreview} onSummarize={summarizeFile} loading={loading}/>} 
        {section === "AI Library" && <AiLibrary insights={insights} files={files} accounts={accounts} onSummarize={summarizeFile} onBatch={enrichLibrary} loading={loading}/>} 
        {section === "Sharing Requests" && <Requests requests={requests} accounts={accounts} files={files} onApprove={approveRequest} onReject={rejectRequest} onResolved={async()=>{setNotice("Request details verified. Review and approve it when ready.");await loadDashboard();}}/>}
        {section === "Sharing Manager" && <SharingManager accounts={accounts} onShare={() => setShowShare(true)}/>}
        {section === "Private Collections" && <CollectionsPanel files={files} accounts={accounts}/>}
        {section === "Automation" && <AutomationPanel/>}
        {section === "Scheduled Access" && <SchedulesPanel files={files} accounts={accounts}/>}
        {section === "Audit Logs" && <AuditPanel/>}
        {section === "Settings" && <SettingsPanel theme={theme} onTheme={setTheme} onInstall={async()=>{if(installPrompt){await installPrompt.prompt();const choice=await installPrompt.userChoice;setNotice(choice?.outcome==="accepted"?"Installation started.":"Installation was dismissed.");setInstallPrompt(null);}else{setNotice("Open your browser menu and choose Install app or Add to Home screen. Installation requires HTTPS and a supported browser.");}}}/>}
      </div>
      <nav className="mobile-bottom-nav" aria-label="Primary mobile navigation">
        <button className={section === "Overview" ? "active" : ""} onClick={() => setSection("Overview")}><Home size={18}/><span>Home</span></button>
        <button className={section === "Unified Drive" || section === "PDF Library" ? "active" : ""} onClick={() => setSection("Unified Drive")}><HardDrive size={18}/><span>Drive</span></button>
        <button className="mobile-add" onClick={() => setShowQuickActions(true)} aria-label="Quick actions"><Plus size={22}/></button>
        <button className={section === "Sharing Requests" ? "active" : ""} onClick={() => setSection("Sharing Requests")}><ListChecks size={18}/><span>Requests</span>{requests.length > 0 && <i>{requests.length}</i>}</button>
        <button className={section === "Accounts" ? "active" : ""} onClick={() => setSection("Accounts")}><Users size={18}/><span>Accounts</span></button>
      </nav>
    </main>
    {showQuickActions && <div className="quick-sheet-backdrop" onClick={() => setShowQuickActions(false)}><div className="quick-sheet" onClick={e => e.stopPropagation()}><div className="sheet-grabber"/><div className="sheet-title"><div><b>Quick actions</b><small>Common tasks, one tap away</small></div><button className="icon-btn" onClick={() => setShowQuickActions(false)}><X size={18}/></button></div><button onClick={() => { setShowQuickActions(false); void connectAccount(); }}><Plus size={18}/><span><b>Connect Google account</b><small>Add another Drive to your workspace</small></span></button><button onClick={() => { setShowQuickActions(false); setSection("Unified Drive"); }}><Search size={18}/><span><b>Find a file</b><small>Search across connected accounts</small></span></button><button onClick={() => { setShowQuickActions(false); setSection("Sharing Requests"); }}><ListChecks size={18}/><span><b>Review access requests</b><small>{requests.length} pending request(s)</small></span></button><button onClick={() => { setShowQuickActions(false); void Promise.all(accounts.map(a => syncAccount(a.id))); }}><RefreshCw size={18}/><span><b>Sync all accounts</b><small>Refresh indexed Drive metadata</small></span></button><button onClick={() => { setShowQuickActions(false); setSection("Scheduled Access"); }}><Clock3 size={18}/><span><b>Scheduled access</b><small>Review future permission actions</small></span></button></div></div>}
    {previewFile && <PreviewModal file={previewFile} url={previewUrl} loading={previewLoading} error={previewError} onClose={()=>{setPreviewFile(null);setPreviewUrl("");}}/>}
    {showShare && <div className="modal-backdrop" onClick={() => setShowShare(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><h2>Share selected files</h2><p>Permissions are applied on the original Drive accounts.</p></div><button className="icon-btn" onClick={() => setShowShare(false)}><X/></button></div><label>Recipient email<input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="student@example.com"/></label><label>Permission<select value={role} onChange={e => setRole(e.target.value)}><option value="reader">Viewer</option><option value="commenter">Commenter</option><option value="writer">Editor</option></select></label><div className="modal-note"><ShieldCheck size={17}/> No public link sharing. The backend must verify account authority and record each result.</div><button className="btn primary full" onClick={shareSelected}>Review and share {selectedFiles.length} item(s)</button></div></div>}
  </div>;
}

function sectionDescription(s: Section) {
  const map: Partial<Record<Section, string>> = {
    Accounts: "Connect and monitor your independent Google identities.",
    "Unified Drive": "Browse files and folders across all authorized accounts.",
    "PDF Library": "A searchable view of your PDF materials.",
    "AI Library": "Private summaries and document classifications generated from indexed Drive files.",
    "Sharing Requests": "Review access requests collected from connected Gmail accounts.",
    "Sharing Manager": "Grant and manage permissions on original Drive items.",
    "Private Collections": "Build private cross-account file groups.",
    "Scheduled Access": "Plan permission changes for a future time.",
    "Audit Logs": "Review a timestamped history of workspace actions.",
    "Automation": "Configure exact-match approval rules in safe preview mode."
  };
  return map[s] || "Manage this workspace securely from one place.";
}

function Overview({accounts, files, requests, loading, onConnect, onNavigate}: {accounts:GoogleAccount[];files:DriveFile[];requests:ShareRequest[];loading:boolean;onConnect:()=>void;onNavigate:(s:Section)=>void}) {
  const metrics = [{label:"Connected accounts",value:accounts.length,icon:Users,sub:"Expandable connections"},{label:"Discovered files",value:files.length,icon:HardDrive,sub:"Metadata indexed"},{label:"PDF documents",value:files.filter(f=>f.mime_type==="application/pdf").length,icon:FileText,sub:"Across connected drives"},{label:"Pending requests",value:requests.length,icon:ListChecks,sub:"Awaiting review"}];
  return <><div className="metric-grid">{metrics.map(m=>{const I=m.icon;return <div className="metric-card" key={m.label}><div className="metric-top"><span>{m.label}</span><I size={18}/></div><strong>{loading?"—":m.value.toLocaleString()}</strong><small>{m.sub}</small></div>;})}</div><div className="two-col"><div className="panel"><div className="panel-head"><div><h3>Connected accounts</h3><p>Independent Google Drive identities</p></div><button className="text-btn" onClick={()=>onNavigate("Accounts")}>Manage <ArrowUpRight size={14}/></button></div>{accounts.length===0?<Empty icon={Cloud} title="No accounts connected" body="Connect your first Google account to start building your unified library." action={<button className="btn primary" onClick={onConnect}><Plus size={16}/>Connect Google</button>}/>:accounts.slice(0,5).map(a=><div className="account-row" key={a.id}><div className="account-avatar">{initials(a.email)}</div><div className="row-main"><b>{a.email}</b><small>{a.last_synced_at?`Synced ${new Date(a.last_synced_at).toLocaleString()}`:"Not synchronized yet"}</small></div><span className={`status ${a.status}`}>{a.status.replace("_"," ")}</span></div>)}</div><div className="panel"><div className="panel-head"><div><h3>Security posture</h3><p>Application safeguards</p></div><ShieldCheck size={19}/></div><div className="security-item"><Check/> Original files stay in Google Drive</div><div className="security-item"><Check/> No public sharing by default</div><div className="security-item"><Check/> Owner approval controls</div><div className="security-item"><Check/> Server-side credential storage</div><div className="callout"><LockKeyhole size={17}/><span>Automatic approvals should remain in preview mode until rules are tested.</span></div></div></div><div className="panel storage-panel"><div className="panel-head"><div><h3>Loaded storage estimate</h3><p>Latest 1,000 indexed records · not Google quota totals</p></div><Database size={18}/></div><div className="storage-total"><b>{prettyBytes(files.reduce((n,f)=>n+(f.size_bytes||0),0))}</b><span>{files.length.toLocaleString()} indexed files</span></div>{accounts.map(a=>{const list=files.filter(f=>f.account_id===a.id);const bytes=list.reduce((n,f)=>n+(f.size_bytes||0),0);const max=Math.max(1,...accounts.map(x=>files.filter(f=>f.account_id===x.id).reduce((n,f)=>n+(f.size_bytes||0),0)));return <div className="storage-account" key={a.id}><div><b>{a.email}</b><small>{prettyBytes(bytes)} · {list.length} files</small></div><div className="storage-track"><i style={{width:`${Math.max(1,bytes/max*100)}%`}}/></div></div>;})}</div><div className="panel recent-panel"><div className="panel-head"><div><h3>Recently updated</h3><p>Latest files discovered across connected accounts</p></div><button className="text-btn" onClick={()=>onNavigate("Unified Drive")}>View all <ArrowUpRight size={14}/></button></div>{files.length===0?<div className="recent-empty">Your recent files will appear here after the first Drive sync.</div>:files.slice().sort((a,b)=>new Date(b.modified_time||0).getTime()-new Date(a.modified_time||0).getTime()).slice(0,5).map(f=><div className="recent-file" key={`${f.account_id}:${f.id}`}><div className="recent-file-icon">{f.is_folder?<Folder size={16}/>:<FileText size={16}/>}</div><div className="row-main"><b>{f.name}</b><small>{f.account_email||"Connected account"} · {f.modified_time?new Date(f.modified_time).toLocaleDateString():"Date unavailable"}</small></div><span className="muted">{prettyBytes(f.size_bytes)}</span></div>)}</div><div className="panel"><div className="panel-head"><div><h3>Quick actions</h3><p>Common management tasks</p></div></div><div className="quick-grid"><button onClick={()=>onNavigate("Unified Drive")}><Search/>Search all drives<ArrowUpRight/></button><button onClick={()=>onNavigate("Sharing Requests")}><ListChecks/>Review requests<ArrowUpRight/></button><button onClick={()=>onNavigate("Sharing Manager")}><Link2/>Manage sharing<ArrowUpRight/></button><button onClick={()=>onNavigate("Scheduled Access")}><Clock3/>Schedule access<ArrowUpRight/></button></div></div></>;
}

function Accounts({accounts,onConnect,onSync}:{accounts:GoogleAccount[];onConnect:()=>void;onSync:(id:string)=>void}) {
  return <div className="panel"><div className="panel-head"><div><h3>Google accounts</h3><p>{accounts.length} connected identity/identities</p></div><button className="btn primary" onClick={onConnect}><Plus size={16}/>Connect account</button></div>{accounts.length===0?<Empty icon={Users} title="Your account list is empty" body="Connect multiple Google accounts. Each account authorizes access independently."/>:accounts.map(a=><div className="account-row large" key={a.id}><div className="account-avatar">{initials(a.email)}</div><div className="row-main"><b>{a.email}</b><small>{a.display_name||"Google account"} · {a.last_synced_at?`Last sync ${new Date(a.last_synced_at).toLocaleString()}`:"Never synced"}</small></div><span className={`status ${a.status}`}>{a.status.replace("_"," ")}</span><button className="btn secondary small" onClick={()=>onSync(a.id)}><RefreshCw size={14}/>Sync Drive</button><button className="btn secondary small" onClick={async()=>{try{const r=await api<{imported:number}>("/api/gmail/sync",{method:"POST",body:JSON.stringify({account_id:a.id})});window.alert(`Imported ${r.imported} notifications. They remain in manual review.`);}catch(e){window.alert(e instanceof Error?e.message:"Gmail sync failed.");}}}><Mail size={14}/>Sync Gmail</button></div>)}</div>;
}

function DriveExplorer({files,accounts,search,setSearch,selectedAccount,setSelectedAccount,selectedFiles,setSelectedFiles,onShare,onPreview,onSummarize,loading}:{files:DriveFile[];accounts:GoogleAccount[];search:string;setSearch:(v:string)=>void;selectedAccount:string;setSelectedAccount:(v:string)=>void;selectedFiles:string[];setSelectedFiles:(v:string[])=>void;onShare:()=>void;onPreview:(f:DriveFile)=>void;onSummarize:(f:DriveFile)=>void;loading:boolean}) {
  const [sort,setSort]=useState("recent");
  const sortedFiles=[...files].sort((a,b)=>sort==="name"?a.name.localeCompare(b.name):sort==="size"?(b.size_bytes||0)-(a.size_bytes||0):new Date(b.modified_time||0).getTime()-new Date(a.modified_time||0).getTime());
  function toggle(id:string) { setSelectedFiles(selectedFiles.includes(id)?selectedFiles.filter(x=>x!==id):[...selectedFiles,id]); }
 return <div className="panel"><div className="explorer-toolbar"><div className="searchbox"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search loaded files across accounts..."/></div><select value={selectedAccount} onChange={e=>setSelectedAccount(e.target.value)}><option value="all">All accounts</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.email}</option>)}</select><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort files"><option value="recent">Recently updated</option><option value="name">Name A–Z</option><option value="size">Largest first</option></select><button className="btn secondary" onClick={onShare} disabled={!selectedFiles.length}><Link2 size={15}/>Share ({selectedFiles.length})</button></div>{loading?<div className="loading">Loading files…</div>:files.length===0?<Empty icon={Folder} title="No matching files" body="Connect an account and run synchronization, or adjust your search filters."/>:<div className="file-list"><div className="file-header"><span></span><span>Name</span><span>Account</span><span>Modified</span><span>Size</span></div>{sortedFiles.map(f=><div className="file-row" key={`${f.account_id}:${f.id}`}><input type="checkbox" aria-label={`Select ${f.name}`} checked={selectedFiles.includes(`${f.account_id}:${f.id}`)} onChange={()=>toggle(`${f.account_id}:${f.id}`)}/><div className="file-name">{f.is_folder?<Folder size={18}/>:<FileText size={18}/>}<button className="file-open" onClick={()=>!f.is_folder&&f.mime_type==="application/pdf"&&onPreview(f)} disabled={f.is_folder||f.mime_type!=="application/pdf"}>{f.name}</button></div><span className="muted truncate">{f.account_email||accounts.find(a=>a.id===f.account_id)?.email||"—"}</span><span className="muted">{f.modified_time?new Date(f.modified_time).toLocaleDateString():"—"}</span><span className="muted">{prettyBytes(f.size_bytes)}</span><button className="icon-btn file-preview-btn" title="Preview PDF" disabled={f.mime_type!=="application/pdf"} onClick={()=>onPreview(f)}><Eye size={15}/></button><button className="icon-btn file-preview-btn" title="Analyze with AI" disabled={f.is_folder} onClick={()=>onSummarize(f)}><Sparkles size={15}/></button></div>)}</div>}{selectedFiles.length>0&&<div className="mobile-selection-bar"><span><b>{selectedFiles.length}</b> selected</span><button className="text-btn" onClick={()=>setSelectedFiles([])}>Clear</button><button className="btn primary small" onClick={onShare}><Link2 size={14}/>Share selected</button></div>}</div>;
}

function AiLibrary({insights,files,accounts,onSummarize,onBatch,loading}:{insights:DocumentInsight[];files:DriveFile[];accounts:GoogleAccount[];onSummarize:(f:DriveFile)=>void;onBatch:()=>void;loading:boolean}) {
  const fileByKey=new Map(files.map(file=>[`${file.account_id}:${file.id}`,file]));
  return <div className="panel"><div className="panel-head"><div><h3><Sparkles size={18}/> AI document library</h3><p>Only indexed metadata and extractable text are sent to Groq. PDF bytes stay private in Google Drive.</p></div><button className="btn primary" onClick={onBatch}><Sparkles size={15}/>Enrich up to 20 files</button></div>{loading?<div className="loading">Loading insights…</div>:insights.length===0?<Empty icon={Sparkles} title="No AI insights yet" body="Use Analyze with AI on a document or enrich the latest indexed files."/>:<div className="insight-list">{insights.map(insight=>{const file=fileByKey.get(`${insight.account_id}:${insight.google_file_id}`);const account=accounts.find(item=>item.id===insight.account_id);return <article className="insight-card" key={insight.id}><div className="insight-card-head"><div><span className="eyebrow">{insight.document_type} · {Math.round(insight.confidence*100)}% confidence</span><h4>{insight.title}</h4><small>{account?.email||"Connected account"} · {new Date(insight.updated_at).toLocaleString()}</small></div>{file&&<button className="btn secondary small" onClick={()=>onSummarize(file)}>Refresh AI</button>}</div><p>{insight.summary}</p>{insight.key_points.length>0&&<ul>{insight.key_points.slice(0,4).map(point=><li key={point}>{point}</li>)}</ul>}{insight.topics.length>0&&<div className="tag-row">{insight.topics.slice(0,6).map(topic=><span key={topic}>{topic}</span>)}</div>}</article>;})}</div>}</div>;
}

function Requests({requests,accounts,files,onApprove,onReject,onResolved}:{requests:ShareRequest[];accounts:GoogleAccount[];files:DriveFile[];onApprove:(id:string)=>void;onReject:(id:string)=>void;onResolved:()=>void}) {
  const [active,setActive]=useState<ShareRequest|null>(null),[accountId,setAccountId]=useState(""),[fileId,setFileId]=useState(""),[email,setEmail]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const candidates=files.filter(f=>f.account_id===accountId&&!f.is_folder);
  async function resolve(){if(!active||!accountId||!fileId||!email.includes("@"))return;setBusy(true);setError("");try{await api(`/api/requests/${active.id}/resolve`,{method:"POST",body:JSON.stringify({account_id:accountId,file_id:fileId,requester_email:email,confirmed:true})});setActive(null);onResolved();}catch(e){setError(e instanceof Error?e.message:"Could not verify request.");}finally{setBusy(false);}}
  return <><div className="panel"><div className="panel-head"><div><h3>Access request inbox</h3><p>Imported Gmail candidates require owner verification of the exact file, source account, and recipient.</p></div><span className="status pending">{requests.length} open</span></div>{requests.length===0?<Empty icon={ListChecks} title="No open requests" body="Sync Gmail from a connected account to discover sharing notifications."/>:requests.map(r=><div className="request-row" key={r.id}><div className="request-avatar">{(r.requester_name||r.requester_email||"?").slice(0,1).toUpperCase()}</div><div className="row-main"><b>{r.requester_name||r.requester_email||"Unknown requester"}</b><small>{r.requester_email||"Requester email needs confirmation"} · {r.item_name||"Drive item not identified"}</small><small>Source mailbox: {r.source_account_email} · {new Date(r.received_at).toLocaleString()}</small></div><span className={`status ${r.status}`}>{r.status}</span><div className="request-actions">{r.status==="needs_review"?<button className="btn primary small" onClick={()=>{setActive(r);setAccountId("");setFileId("");setEmail("");setError("");}}>Verify details</button>:<button className="btn primary small" onClick={()=>onApprove(r.id)}><Check size={14}/>Review & approve</button>}<button className="btn secondary small" onClick={()=>onReject(r.id)}>Reject</button></div></div>)}</div>
  {active&&<div className="modal-backdrop" onClick={()=>setActive(null)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><h2>Verify sharing request</h2><p>Check the original message separately. Do not assume the sender is the requested recipient.</p></div><button className="icon-btn" onClick={()=>setActive(null)}><X/></button></div><label>Source Google account<select value={accountId} onChange={e=>{setAccountId(e.target.value);setFileId("");}}><option value="">Choose account</option>{accounts.map(a=><option value={a.id} key={a.id}>{a.email}</option>)}</select></label><label>Exact Drive file<select value={fileId} onChange={e=>setFileId(e.target.value)}><option value="">Choose file</option>{candidates.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}</select></label><label>Recipient who should receive access<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="recipient@example.com"/></label><div className="modal-note"><ShieldCheck size={17}/>This step only verifies the request. It does not grant access. You will review and approve it separately.</div>{error&&<div className="alert error">{error}</div>}<button className="btn primary full" disabled={busy||!accountId||!fileId||!email.includes("@")} onClick={resolve}>Verify request details</button></div></div>}
  </>;
}

function SharingManager({accounts,onShare}:{accounts:GoogleAccount[];onShare:()=>void}) {
  const [permissions,setPermissions]=useState<any[]>([]),[error,setError]=useState("");
  async function load(){try{const r=await api<{permissions:any[]}>("/api/permissions");setPermissions(r.permissions||[]);setError("");}catch(e){setError(e instanceof Error?e.message:"Unable to load permission records.");}}
  async function revoke(id:string){if(!window.confirm("Revoke this recipient's access to the original Drive file?"))return;try{await api(`/api/permissions/${id}/revoke`,{method:"POST",body:JSON.stringify({confirmed:true})});await load();}catch(e){setError(e instanceof Error?e.message:"Could not revoke permission.");}}
  useEffect(()=>{void load();},[]);
  return <><div className="two-col"><div className="panel"><div className="panel-head"><div><h3>Direct Drive sharing</h3><p>Grant permissions on original files and folders.</p></div><ShieldCheck/></div><p className="body-copy">Select files in Unified Drive, then share them with an exact recipient email. Each selected file is resolved to its exact source account before a user-level permission is applied.</p><button className="btn primary" onClick={onShare}><Link2 size={16}/>Share selected files</button></div><div className="panel"><div className="panel-head"><div><h3>Account coverage</h3><p>Available source identities</p></div></div><h2 className="big-number">{accounts.length}</h2><p className="muted">Connected Google accounts available for permission operations.</p><div className="callout"><AlertCircle size={17}/> Bulk actions can partially succeed. Review individual results in the audit log.</div></div></div><div className="panel"><div className="panel-head"><div><h3>Recent permission records</h3><p>Permissions granted through this workspace</p></div><button className="text-btn" onClick={load}>Refresh</button></div>{error&&<div className="alert error">{error}</div>}{permissions.length===0?<Empty icon={ShieldCheck} title="No recorded permissions" body="Permission grants created through this workspace will appear here."/>:permissions.map(p=><div className="account-row" key={p.id}><div className="account-avatar"><Users size={15}/></div><div className="row-main"><b>{p.recipient_email}</b><small>{p.role} · {p.google_file_id} · {new Date(p.created_at).toLocaleString()}</small></div><span className={`status ${p.status==="active"?"connected":"pending"}`}>{p.status}</span>{p.status==="active"&&<button className="btn danger small" onClick={()=>revoke(p.id)}>Revoke</button>}</div>)}</div></>;
}



function AuthLoading({theme}:{theme:"dark"|"light"}) {
  return <div className="auth-screen" data-theme={theme}><div className="auth-card"><div className="auth-logo"><Cloud size={26}/></div><div className="eyebrow">PRIVATE OWNER WORKSPACE</div><h1>Verifying secure session</h1><p>Checking the owner-only access gate…</p><div className="auth-loader"/></div></div>;
}

function OwnerLogin({theme,onTheme,configured,onLogin,error}:{theme:"dark"|"light";onTheme:(v:"dark"|"light")=>void;configured:boolean;onLogin:()=>void;error:string}) {
  return <div className="auth-screen" data-theme={theme}><div className="auth-top"><span><Cloud size={17}/> DRIVE COMMAND CENTER</span><button className="theme-toggle" onClick={()=>onTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun size={16}/>:<Moon size={16}/>} {theme==="dark"?"Light":"Dark"}</button></div><div className="auth-card"><div className="auth-logo"><LockKeyhole size={26}/></div><div className="eyebrow">PRIVATE · SINGLE OWNER</div><h1>Welcome back, Dhirendra.</h1><p>Your first sign-in with the allowlisted Google account creates your owner workspace. This is restricted to Dhirendra's configured Google identity; there is no public registration or guest access.</p><button className="owner-google-btn" disabled={!configured} onClick={onLogin}><GoogleMark/>Continue with owner Google account</button>{!configured&&<div className="auth-error">Set VITE_API_BASE_URL and deploy the Cloudflare Worker before signing in.</div>}{error&&<div className="auth-error">{error}</div>}<div className="auth-assurance"><ShieldCheck size={17}/><span><b>Owner identity checked on the server</b><small>Only the email matching OWNER_EMAIL can create a session.</small></span></div><div className="auth-foot">No sign-up links · No public accounts · No shared dashboard access</div></div><div className="auth-bottom">Your Drive files remain private in their original Google accounts.</div></div>;
}

function GoogleMark(){return <svg viewBox="0 0 48 48" width="19" height="19" aria-hidden="true"><path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15z"/><path fill="#FF3D00" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44z"/><path fill="#4CAF50" d="M12.8 27.8a12 12 0 0 1 0-7.6V15H5.9a20 20 0 0 0 0 18z"/><path fill="#1976D2" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.9-5.9A19.7 19.7 0 0 0 24 4 20 20 0 0 0 5.9 15l6.9 5.2c1.6-4.7 6-8.1 11.2-8.1z"/></svg>}

function SecurityAccess() {
  const [data,setData]=useState<any>(null),[allSessions,setAllSessions]=useState<any[]>([]),[grantCount,setGrantCount]=useState<number|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState("");
  async function load(){
    try{
      const [overview,all,perms]=await Promise.all([api<any>("/api/security/overview"),api<{sessions:any[]}>("/api/security/sessions"),api<{permissions:any[]}>("/api/permissions")]);
      setData(overview);setAllSessions(all.sessions||[]);setGrantCount((perms.permissions||[]).filter((x:any)=>x.status==="active").length);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Could not load security activity.");}
  }
  useEffect(()=>{void load();const t=window.setInterval(()=>void load(),30_000);return()=>window.clearInterval(t);},[]);
  async function revoke(id:string){
    if(!window.confirm("End this device session? The device will need to sign in again."))return;
    setBusy(id);try{await api(`/api/security/sessions/${id}/revoke`,{method:"POST",body:"{}"});await load();}catch(e){setError(e instanceof Error?e.message:"Could not revoke session.");}finally{setBusy("");}
  }
  return <div className="security-page"><div className="security-intro"><div><div className="eyebrow">OWNER SECURITY</div><h2>Access & session monitoring</h2><p>See which of your signed-in devices are currently active, review sign-in signals and end sessions remotely.</p></div><button className="btn secondary" onClick={load}><RefreshCw size={15}/>Refresh</button></div>
    {error&&<div className="alert error">{error}</div>}
    <div className="security-metrics"><div className="security-metric"><span><MonitorSmartphone size={17}/>Active sessions</span><b>{data?.active_sessions??"—"}</b><small>Seen within the last 5 minutes</small></div><div className="security-metric"><span><ShieldCheck size={17}/>Account policy</span><b>Owner only</b><small>One allowlisted Google identity</small></div><div className="security-metric"><span><ShieldAlert size={17}/>Review signals</span><b>{(data?.events||[]).filter((e:any)=>e.risk_level==="review").length}</b><small>New device/network or denied sign-in events</small></div><div className="security-metric"><span><Users size={17}/>Tracked grants</span><b>{grantCount??"—"}</b><small>Active permission records created by this app</small></div></div>
    <div className="panel"><div className="panel-head"><div><h3>Current active devices</h3><p>A session is active when it has checked in during the last five minutes.</p></div><span className="status connected">{data?.active_sessions??0} online</span></div>{(data?.sessions||[]).length===0?<Empty icon={MonitorSmartphone} title="No active sessions found" body="Your current device should appear after the next heartbeat."/>:(data.sessions as any[]).map((s:any)=><div className="security-session" key={s.id}><div className="session-icon"><MonitorSmartphone size={18}/></div><div className="row-main"><b>{s.user_agent||"Unknown browser or device"}</b><small>Last active {new Date(s.last_seen_at).toLocaleString()} · Signed in {new Date(s.created_at).toLocaleString()}</small><small>{s.ip_label||"Network identifier protected"}</small></div><span className="status connected">Active</span></div>)}</div>
    <div className="panel"><div className="panel-head"><div><h3>All device sessions</h3><p>Revoke sessions you no longer recognize. Your current session cannot be revoked here.</p></div></div>{allSessions.map((s:any)=><div className="security-session" key={s.id}><div className="session-icon"><Smartphone size={17}/></div><div className="row-main"><b>{s.user_agent||"Unknown device"}</b><small>Last seen {new Date(s.last_seen_at).toLocaleString()}</small><small>Created {new Date(s.created_at).toLocaleString()}</small></div>{s.revoked_at?<span className="status">Ended</span>:s.id===data?.current_session_id?<span className="status connected">This device</span>:<button className="btn danger small" disabled={busy===s.id} onClick={()=>revoke(s.id)}>{busy===s.id?"Ending…":"Revoke session"}</button>}</div>)}</div>
    <div className="panel"><div className="panel-head"><div><h3>Recent access activity</h3><p>New device/network signals are review prompts, not proof of fraud.</p></div><Activity size={18}/></div>{(data?.events||[]).length===0?<Empty icon={Activity} title="No access events yet" body="Successful logins, sign-outs and session revocations will appear here."/>:(data.events as any[]).map((e:any)=><div className="access-event" key={e.id}><div className={`event-indicator ${e.risk_level==="review"?"review":""}`}/><div className="row-main"><b>{String(e.event_type).replaceAll("_"," ")}</b><small>{e.email} · {new Date(e.created_at).toLocaleString()}</small><small>{e.risk_reason||e.user_agent||"—"}</small></div><span className={`status ${e.risk_level==="review"?"pending":"connected"}`}>{e.risk_level==="review"?"Review":"Normal"}</span></div>)}</div>
    <div className="callout"><ShieldCheck size={17}/>This dashboard counts your active browser/device sessions, not other users. Public registration is disabled. Google sign-in is restricted by the Worker to the exact OWNER_EMAIL.</div>
  </div>;
}

function PreviewModal({file,url,loading,error,onClose}:{file:DriveFile;url:string;loading:boolean;error:string;onClose:()=>void}) {
  return <div className="modal-backdrop preview-backdrop" onClick={onClose}><div className="preview-modal" onClick={e=>e.stopPropagation()}><div className="preview-head"><div><b>{file.name}</b><small>{file.account_email||"Private Google Drive file"} · Secure streamed preview</small></div><button className="icon-btn" onClick={onClose}><X/></button></div>{loading?<div className="loading">Loading private PDF preview…</div>:error?<div className="empty"><div><AlertCircle/></div><b>Preview unavailable</b><p>{error}</p></div>:url?<iframe title={`PDF preview: ${file.name}`} src={url} className="pdf-frame"/>:<div className="loading">Preparing preview…</div>}</div></div>;
}

function CollectionsPanel({files,accounts}:{files:DriveFile[];accounts:GoogleAccount[]}) {
  const [items,setItems]=useState<any[]>([]),[name,setName]=useState(""),[description,setDescription]=useState(""),[selected,setSelected]=useState<string[]>([]),[target,setTarget]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function load(){try{const r=await api<{collections:any[]}>("/api/collections");setItems(r.collections||[]);}catch(e){setError(e instanceof Error?e.message:"Unable to load collections.");}}
  useEffect(()=>{void load();},[]);
  async function create(){if(!name.trim())return;setBusy(true);setError("");try{await api("/api/collections",{method:"POST",body:JSON.stringify({name,description})});setName("");setDescription("");await load();}catch(e){setError(e instanceof Error?e.message:"Could not create collection.");}finally{setBusy(false);}}
  async function addFiles(){const c=items.find(x=>x.id===target);if(!c||!selected.length)return;setBusy(true);setError("");try{const payload=selected.map(id=>{const f=files.find(x=>`${x.account_id}:${x.id}`===id)!;return {account_id:f.account_id,file_id:f.id};});await api(`/api/collections/${c.id}/files`,{method:"POST",body:JSON.stringify({files:payload})});setSelected([]);setError("Files added to private collection.");}catch(e){setError(e instanceof Error?e.message:"Could not add files.");}finally{setBusy(false);}}
  return <div className="two-col"><div className="panel"><div className="panel-head"><div><h3>Create a private collection</h3><p>Group files from different Google accounts for your own workspace.</p></div><PackageOpen/></div><label className="form-label">Collection name<input className="form-control" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Class 11 Chemistry"/></label><label className="form-label">Description<input className="form-control" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Optional note"/></label><button className="btn primary" disabled={busy||!name.trim()} onClick={create}><Plus size={15}/>Create collection</button><div className="callout"><LockKeyhole size={16}/>Collections are private owner-side groupings. Creating one does not grant anyone Drive access.</div></div><div className="panel"><div className="panel-head"><div><h3>Your collections</h3><p>{items.length} collection(s)</p></div><button className="text-btn" onClick={load}>Refresh</button></div>{items.length===0?<Empty icon={Folder} title="No collections yet" body="Create a collection to group selected files."/>:items.map(c=><div className="account-row" key={c.id}><div className="account-avatar"><Folder size={16}/></div><div className="row-main"><b>{c.name}</b><small>{c.description||"Private collection"} · {c.status}</small></div><span className="status connected">Private</span></div>)}</div><div className="panel"><div className="panel-head"><div><h3>Add files to a collection</h3><p>Select files across your connected accounts</p></div></div><label className="form-label">Destination<select className="form-control" value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choose collection</option>{items.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><div className="collection-file-list">{files.slice(0,150).map(f=><label className="collection-file" key={`${f.account_id}:${f.id}`}><input type="checkbox" checked={selected.includes(`${f.account_id}:${f.id}`)} onChange={e=>setSelected(v=>e.target.checked?[...v,`${f.account_id}:${f.id}`]:v.filter(x=>x!==`${f.account_id}:${f.id}`))}/><span>{f.name}</span><small>{f.account_email||accounts.find(a=>a.id===f.account_id)?.email}</small></label>)}</div><button className="btn primary" disabled={busy||!target||!selected.length} onClick={addFiles}>Add {selected.length} selected files</button></div>{error&&<div className="alert error">{error}</div>}</div>;
}

function AutomationPanel() {
  const [rules,setRules]=useState<any[]>([]),[name,setName]=useState("Exact requester review"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function load(){try{const r=await api<{rules:any[]}>("/api/automation/rules");setRules(r.rules||[]);}catch(e){setMessage(e instanceof Error?e.message:"Unable to load rules.");}}
  useEffect(()=>{void load();},[]);
  async function create(){setBusy(true);try{await api("/api/automation/rules",{method:"POST",body:JSON.stringify({name,conditions:{match:"exact_requester_and_source_account"},action:{mode:"manual_review"}})});setMessage("Rule saved in disabled preview-only mode.");await load();}catch(e){setMessage(e instanceof Error?e.message:"Could not create rule.");}finally{setBusy(false);}}
  return <div className="two-col"><div className="panel"><div className="panel-head"><div><h3>Approval rule builder</h3><p>Start with a rule name. Rules are created disabled and preview-only.</p></div><Activity/></div><label className="form-label">Rule name<input className="form-control" value={name} onChange={e=>setName(e.target.value)} maxLength={80}/></label><div className="callout"><ShieldCheck size={16}/>No automatic permissions are granted by this module. Exact matching and a tested execution engine are required before activation.</div><button className="btn primary" onClick={create} disabled={busy||!name.trim()}><Plus size={15}/>Save preview rule</button></div><div className="panel"><div className="panel-head"><div><h3>Saved rules</h3><p>{rules.length} rule(s)</p></div><button className="text-btn" onClick={load}>Refresh</button></div>{rules.length===0?<Empty icon={Activity} title="No rules configured" body="Create a disabled preview rule to begin."/>:rules.map(r=><div className="account-row" key={r.id}><div className="account-avatar"><ShieldCheck size={16}/></div><div className="row-main"><b>{r.name}</b><small>{r.preview_only?"Preview only":"Execution enabled"} · {r.enabled?"Enabled":"Disabled"}</small></div><span className="status pending">Preview</span></div>)}</div>{message&&<div className="alert success">{message}</div>}</div>;
}

function SchedulesPanel({files,accounts}:{files:DriveFile[];accounts:GoogleAccount[]}) {
  const [items,setItems]=useState<any[]>([]),[fileKey,setFileKey]=useState(""),[recipient,setRecipient]=useState(""),[action,setAction]=useState("grant"),[role,setRole]=useState("reader"),[runAt,setRunAt]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function load(){try{const r=await api<{schedules:any[]}>("/api/schedules");setItems(r.schedules||[]);}catch(e){setMessage(e instanceof Error?e.message:"Unable to load schedules.");}}
  useEffect(()=>{void load();},[]);
  async function save(){const f=files.find(x=>`${x.account_id}:${x.id}`===fileKey);if(!f)return;setBusy(true);try{const r=await api<{execution_enabled:boolean}>("/api/schedules",{method:"POST",body:JSON.stringify({account_id:f.account_id,file_id:f.id,recipient_email:recipient,action,role,run_at:new Date(runAt).toISOString()})});setMessage(r.execution_enabled?"Schedule saved. Cloudflare Cron checks due actions every five minutes.":"Schedule saved, but execution is not enabled.");await load();}catch(e){setMessage(e instanceof Error?e.message:"Could not save schedule.");}finally{setBusy(false);}}
  async function cancel(id:string){try{await api(`/api/schedules/${id}/cancel`,{method:"POST",body:"{}"});await load();}catch(e){setMessage(e instanceof Error?e.message:"Could not cancel schedule.");}}
  return <div className="two-col"><div className="panel"><div className="panel-head"><div><h3>Schedule a permission change</h3><p>Queue a future grant or revocation.</p></div><CalendarClock/></div><label className="form-label">Drive file<select className="form-control" value={fileKey} onChange={e=>setFileKey(e.target.value)}><option value="">Choose file</option>{files.filter(f=>!f.is_folder).map(f=><option key={`${f.account_id}:${f.id}`} value={`${f.account_id}:${f.id}`}>{f.name} · {f.account_email||accounts.find(a=>a.id===f.account_id)?.email}</option>)}</select></label><label className="form-label">Recipient email<input className="form-control" type="email" value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="person@example.com"/></label><div className="form-grid"><label className="form-label">Action<select className="form-control" value={action} onChange={e=>setAction(e.target.value)}><option value="grant">Grant access</option><option value="revoke">Revoke access</option></select></label><label className="form-label">Role<select className="form-control" value={role} onChange={e=>setRole(e.target.value)}><option value="reader">Viewer</option><option value="commenter">Commenter</option><option value="writer">Editor</option></select></label></div><label className="form-label">Run at<input className="form-control" type="datetime-local" value={runAt} onChange={e=>setRunAt(e.target.value)}/></label><button className="btn primary" disabled={busy||!fileKey||!recipient.includes("@")||!runAt} onClick={save}>Save scheduled action</button><div className="callout"><AlertCircle size={16}/>Cloudflare Cron checks every five minutes. Deploy and integration-test the Worker trigger before relying on the scheduled execution time.</div></div><div className="panel"><div className="panel-head"><div><h3>Scheduled actions</h3><p>{items.length} saved action(s)</p></div><button className="text-btn" onClick={load}>Refresh</button></div>{items.length===0?<Empty icon={Clock3} title="No scheduled actions" body="Your future permission changes will appear here."/>:items.map(x=><div className="account-row" key={x.id}><div className="account-avatar"><Clock3 size={16}/></div><div className="row-main"><b>{x.action} · {x.recipient_email}</b><small>{new Date(x.run_at).toLocaleString()} · {x.role} · {x.status}</small></div><span className={`status ${x.status==="succeeded"?"connected":"pending"}`}>{x.status}</span>{x.status==="pending"&&<button className="btn secondary small" onClick={()=>cancel(x.id)}>Cancel</button>}</div>)}</div>{message&&<div className="alert success">{message}</div>}</div>;
}

function AuditPanel() {
  const [logs,setLogs]=useState<any[]>([]),[error,setError]=useState("");
  async function load(){try{const r=await api<{logs:any[]}>("/api/audit");setLogs(r.logs||[]);setError("");}catch(e){setError(e instanceof Error?e.message:"Unable to load audit history.");}}
  useEffect(()=>{void load();},[]);
  return <div className="panel"><div className="panel-head"><div><h3>Security and activity history</h3><p>Owner-scoped record of permission and workspace actions.</p></div><button className="btn secondary small" onClick={load}><RefreshCw size={14}/>Refresh</button></div>{error&&<div className="alert error">{error}</div>}{logs.length===0?<Empty icon={Activity} title="No audit events yet" body="Actions recorded by the Worker will appear here."/>:logs.map(log=><div className="audit-row" key={log.id}><div className="audit-dot"/><div className="row-main"><b>{String(log.action).replaceAll("_"," ")}</b><small>{new Date(log.created_at).toLocaleString()}</small><pre>{JSON.stringify(log.details,null,2)}</pre></div></div>)}</div>;
}

function SettingsPanel({theme,onTheme,onInstall}:{theme:"dark"|"light";onTheme:(v:"dark"|"light")=>void;onInstall:()=>void}) { return <div className="panel"><h3>Application settings</h3><div className="setting-row"><div><b>Appearance</b><small>Choose a comfortable workspace theme</small></div><button className="btn secondary" onClick={()=>onTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun size={15}/>:<Moon size={15}/>} Switch to {theme==="dark"?"light":"dark"} mode</button></div><div className="setting-row"><div><b>Install on this device</b><small>Add the private workspace to your home screen when deployed over HTTPS.</small></div><button className="btn secondary" onClick={onInstall}><Smartphone size={15}/>Install guidance</button></div><div className="setting-row"><div><b>Default approval mode</b><small>Manual review with optional exact-match automation</small></div><span className="status pending">Manual default</span></div><div className="setting-row"><div><b>Public link sharing</b><small>Never enabled automatically</small></div><span className="status connected">Disabled by policy</span></div><div className="setting-row"><div><b>Automation emergency pause</b><small>Stops pending automated jobs; does not revoke existing permissions</small></div><button className="btn danger" disabled>Pause all · backend required</button></div><div className="setting-row"><div><b>Environment configuration</b><small>Supabase and Worker endpoint are required for live data.</small></div><span className="status pending">Check .env</span></div></div>; }
function Empty({icon:Icon,title,body,action}:{icon:typeof Folder;title:string;body:string;action?:React.ReactNode}) { return <div className="empty"><div><Icon size={24}/></div><b>{title}</b><p>{body}</p>{action}</div>; }
