"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Search, 
  Activity, 
  Mail, 
  Clock, 
  ShieldCheck, 
  LogOut, 
  ChevronRight,
  Loader2,
  Calendar,
  Settings as SettingsIcon,
  UserX,
  UserCheck,
  RotateCcw,
  Save,
  Server,
  Info as InfoIcon,
  MessageSquare,
  Eye,
  EyeOff
} from "lucide-react";
import { formatDate, formatTime } from "../../lib/utils.js";
import { toast } from "../../lib/use-toast.js";
import { Button } from "../../components/ui/button.jsx";

export default function AdminDashboard() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("users");
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [settings, setSettings] = useState({
    smtp: { host: "", port: "", user: "", pass: "", from: "" },
    support_email: "",
    app_info: ""
  });
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);

      const settingsRes = await fetch('/api/admin/settings');
      const settingsData = await settingsRes.json();
      if (settingsData.settings) {
        setSettings({
          smtp: settingsData.settings.smtp_config ? JSON.parse(settingsData.settings.smtp_config) : { host: "", port: "", user: "", pass: "", from: "" },
          support_email: settingsData.settings.support_email || "",
          app_info: settingsData.settings.app_info || ""
        });
      }
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session || session.user.role !== 'admin') {
      router.replace('/admin/login');
      return;
    }
    fetchData();
  }, [session, authStatus, router]);

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast({ title: "Status Updated", description: "User permission changed successfully." });
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async (userId) => {
    if (!confirm("Are you sure you want to send a manual password reset link to this user?")) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'POST' });
      if (!res.ok) throw new Error("Check SMTP settings first");
      toast({ title: "Reset Sent", description: "Password reset link has been emailed." });
    } catch (err) {
      toast({ title: "Mailing Failed", description: "Ensure SMTP is configured in settings.", variant: "destructive" });
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            smtp_config: JSON.stringify(settings.smtp),
            support_email: settings.support_email,
            app_info: settings.app_info
          }
        })
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast({ title: "Settings Saved", description: "System configurations updated.", variant: "success" });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.display_name && u.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 text-foreground font-body transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <ShieldCheck size={22} />
             </div>
             <div>
                <h1 className="text-sm font-bold tracking-tight font-display uppercase">Admin Dashboard</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                   <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none">System Active</p>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-6">
             <nav className="flex items-center gap-1 bg-muted/60 p-1.5 rounded-xl border border-border/40">
                <button 
                  onClick={() => setActiveTab("users")}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-background text-primary shadow-sm border border-border/60' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Manage Users
                </button>
                <button 
                  onClick={() => setActiveTab("settings")}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-background text-primary shadow-sm border border-border/60' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  System Settings
                </button>
             </nav>
             <button onClick={() => signOut()} className="p-2 rounded-xl border border-border/60 hover:bg-destructive/10 hover:text-destructive transition-all">
                <LogOut size={18} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {activeTab === "users" ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="bg-card p-6 rounded-3xl border border-border/50 shadow-sm transition-all hover:border-primary/20">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
                     <Users size={20} />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Registered Users</p>
                  <p className="text-3xl font-display font-bold tabular-nums">{users.length}</p>
               </div>
               <div className="bg-card p-6 rounded-3xl border border-border/50 shadow-sm transition-all hover:border-emerald-500/20">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                     <UserCheck size={20} />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Active Accounts</p>
                  <p className="text-3xl font-display font-bold tabular-nums">{users.filter(u => u.is_active).length}</p>
               </div>
               <div className="bg-card p-6 rounded-3xl border border-border/50 shadow-sm transition-all hover:border-destructive/20">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                     <UserX size={20} />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Deactivated</p>
                  <p className="text-3xl font-display font-bold tabular-nums">{users.filter(u => !u.is_active).length}</p>
               </div>
               <div className="bg-card p-6 rounded-3xl border border-border/50 shadow-sm transition-all hover:border-orange-500/20">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4">
                     <Activity size={20} />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Monthly Active</p>
                  <p className="text-3xl font-display font-bold tabular-nums">{users.filter(u => parseInt(u.sessions_30d) > 0).length}</p>
               </div>
            </div>

            {/* List & Search */}
            <div className="bg-card rounded-3xl border border-border/50 overflow-hidden shadow-xl shadow-foreground/[0.02]">
               <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-lg font-bold font-display uppercase tracking-widest">Manage Users</h2>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Review and update user permissions</p>
                  </div>
                  <div className="relative w-full max-w-sm group">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={14} />
                     <input 
                        type="text" 
                        placeholder="Filter by name or email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-muted/40 border border-border/80 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold outline-none focus:bg-background focus:border-primary/50 transition-all placeholder:text-muted-foreground/40 shadow-inner"
                     />
                  </div>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-muted/30">
                           <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">User Detail</th>
                           <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Activity (30d)</th>
                           <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Last Active</th>
                           <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Role</th>
                           <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right pr-12">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-border/40">
                        {filteredUsers.map((user) => (
                           <tr key={user.id} className="group hover:bg-muted/10 transition-all duration-300">
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden border-2 transition-all ${user.is_active ? 'border-background shadow-sm' : 'border-destructive/20 opacity-50'}`}>
                                       {user.avatar_url ? (
                                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                       ) : (
                                          <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                                            <span className="text-xs font-black text-muted-foreground/60">
                                              {user.display_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                            </span>
                                          </div>
                                       )}
                                    </div>
                                    <div className="flex flex-col">
                                       <span className={`text-sm font-black tracking-tight ${!user.is_active && 'text-muted-foreground'}`}>{user.display_name || 'Incognito User'}</span>
                                       <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                                          <Mail size={10} className="text-muted-foreground/40" /> {user.email}
                                       </span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="flex-1 max-w-[120px] h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                                       <div 
                                          className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.2)]" 
                                          style={{ width: `${Math.min(100, (parseInt(user.sessions_30d) / 20) * 100)}%` }}
                                       />
                                    </div>
                                    <span className="text-[11px] font-black tabular-nums">{user.sessions_30d} Sessions</span>
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 {user.last_active ? (
                                    <div className="flex flex-col">
                                       <span className="text-xs font-bold">{formatDate(user.last_active)}</span>
                                       <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{formatTime(user.last_active)}</span>
                                    </div>
                                 ) : (
                                    <span className="text-[10px] font-black text-muted-foreground/30 uppercase italic">Never Active</span>
                                 )}
                              </td>
                              <td className="px-8 py-6">
                                 <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 transition-all ${
                                    user.role === 'admin' 
                                       ? 'bg-primary/10 text-primary border-primary/30' 
                                       : 'bg-muted/50 text-muted-foreground border-border/80'
                                 }`}>
                                    {user.role}
                                 </span>
                              </td>
                              <td className="px-8 py-6 pr-12">
                                 <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                    {user.role !== 'admin' && (
                                       <>
                                          <button 
                                             onClick={() => handleToggleStatus(user.id, user.is_active)}
                                             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                                               user.is_active 
                                                 ? 'border-destructive/10 text-destructive/70 hover:bg-destructive hover:text-white hover:border-destructive shadow-sm' 
                                                 : 'border-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm'
                                             }`}
                                          >
                                             {user.is_active ? 'Deactivate' : 'Activate'}
                                          </button>
                                          <button 
                                             onClick={() => handleResetPassword(user.id)}
                                             className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-border/60 text-muted-foreground hover:bg-foreground hover:text-background hover:border-foreground transition-all shadow-sm"
                                          >
                                             Reset Pass
                                          </button>
                                       </>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                     <div className="py-24 text-center">
                        <Search size={40} className="mx-auto text-muted/20 mb-4" />
                        <p className="text-muted-foreground font-black uppercase tracking-[0.2em] text-xs">No matching results found.</p>
                     </div>
                  )}
               </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* SMTP Config */}
                <div className="space-y-8">
                   <div className="flex items-center gap-3 mb-2 px-2">
                      <Server className="text-primary/70" size={20} />
                      <h3 className="text-sm font-black uppercase tracking-[0.2em]">Email Setup (SMTP)</h3>
                   </div>
                   <form onSubmit={handleSaveSettings} className="space-y-6 bg-card p-8 rounded-[2.5rem] border border-border/60 shadow-sm shadow-foreground/[0.01]">
                      <div className="grid grid-cols-1 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">SMTP Host</label>
                            <input 
                               type="text" 
                               value={settings.smtp.host}
                               onChange={(e) => setSettings({...settings, smtp: {...settings.smtp, host: e.target.value}})}
                               placeholder="smtp.gmail.com"
                               className="w-full bg-muted/20 border border-border/60 rounded-2xl py-4 px-5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 shadow-inner" 
                            />
                         </div>
                         <div className="grid grid-cols-3 gap-6">
                            <div className="col-span-1 space-y-2">
                               <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Port</label>
                               <input 
                                  type="text" 
                                  value={settings.smtp.port}
                                  onChange={(e) => setSettings({...settings, smtp: {...settings.smtp, port: e.target.value}})}
                                  placeholder="587"
                                  className="w-full bg-muted/20 border border-border/60 rounded-2xl py-4 px-5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all shadow-inner" 
                               />
                            </div>
                            <div className="col-span-2 space-y-2">
                               <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Send As Email</label>
                               <input 
                                  type="text" 
                                  value={settings.smtp.from}
                                  onChange={(e) => setSettings({...settings, smtp: {...settings.smtp, from: e.target.value}})}
                                  placeholder="noreply@timetrack.dev"
                                  className="w-full bg-muted/20 border border-border/60 rounded-2xl py-4 px-5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 shadow-inner" 
                               />
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">SMTP Username</label>
                            <input 
                               type="text" 
                               value={settings.smtp.user}
                               onChange={(e) => setSettings({...settings, smtp: {...settings.smtp, user: e.target.value}})}
                               className="w-full bg-muted/20 border border-border/60 rounded-2xl py-4 px-5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all shadow-inner" 
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">SMTP Password</label>
                            <div className="relative group/input">
                               <input 
                                  type={showSmtpPassword ? "text" : "password"}
                                  value={settings.smtp.pass}
                                  onChange={(e) => setSettings({...settings, smtp: {...settings.smtp, pass: e.target.value}})}
                                  className="w-full bg-muted/20 border border-border/60 rounded-2xl py-4 pl-5 pr-14 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all shadow-inner" 
                               />
                               <button
                                  type="button"
                                  onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-colors"
                               >
                                  {showSmtpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                               </button>
                            </div>
                         </div>
                      </div>
                   </form>
                </div>

                {/* General Settings */}
                <div className="space-y-12">
                   <div className="space-y-8">
                      <div className="flex items-center gap-3 mb-2 px-2">
                         <MessageSquare className="text-primary/70" size={20} />
                         <h3 className="text-sm font-black uppercase tracking-[0.2em]">Contact Channels</h3>
                      </div>
                      <div className="bg-card p-8 rounded-[2.5rem] border border-border/60 shadow-sm shadow-foreground/[0.01] space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Support Target Email</label>
                            <input 
                               type="email" 
                               value={settings.support_email}
                               onChange={(e) => setSettings({...settings, support_email: e.target.value})}
                               placeholder="support@example.com"
                               className="w-full bg-muted/20 border border-border/60 rounded-2xl py-4 px-5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 shadow-inner" 
                            />
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-2 ml-1">Incoming tickets will be sent to this address.</p>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <div className="flex items-center gap-3 mb-2 px-2">
                         <InfoIcon className="text-primary/70" size={20} />
                         <h3 className="text-sm font-black uppercase tracking-[0.2em]">App Information</h3>
                      </div>
                      <div className="bg-card p-8 rounded-[2.5rem] border border-border/60 shadow-sm shadow-foreground/[0.01] space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">About Text</label>
                            <textarea 
                               rows={4}
                               value={settings.app_info}
                               onChange={(e) => setSettings({...settings, app_info: e.target.value})}
                               placeholder="Enter details about this version of the app..."
                               className="w-full bg-muted/20 border border-border/60 rounded-2xl py-4 px-5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all resize-none placeholder:text-muted-foreground/30 shadow-inner" 
                            />
                         </div>
                      </div>
                   </div>

                   <div className="pt-2">
                      <Button 
                         onClick={handleSaveSettings}
                         disabled={savingSettings}
                         className="w-full h-14 rounded-3xl bg-foreground text-background hover:bg-foreground/90 transition-all font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-foreground/5 active:scale-[0.98]"
                      >
                         {savingSettings ? <Loader2 className="animate-spin" /> : <><Save size={18} className="mr-2" /> Save Settings</>}
                      </Button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
