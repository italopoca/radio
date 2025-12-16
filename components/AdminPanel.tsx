import React, { useState, useRef, useEffect } from 'react';
import { X, Shield, Send, Lock, Image as ImageIcon, Upload, Link as LinkIcon, CheckCircle, Loader2, Trash2, Mic2, Zap, LogOut, User, Users, Plus, Radio } from 'lucide-react';
import { BroadcastStatus } from '../types';
import { supabase } from '../lib/supabaseClient';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: BroadcastStatus;
  onStatusChange: (status: BroadcastStatus) => void;
}

type TabMode = 'url' | 'upload';
type PanelTab = 'broadcast' | 'users';
type Status = 'idle' | 'sending' | 'success' | 'error';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, currentStatus }) => {
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Panel Navigation
  const [activeTab, setActiveTab] = useState<PanelTab>('broadcast');

  // Broadcast Form State
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Aviso da Rádio');
  const [imageUrl, setImageUrl] = useState(''); 
  const [fileName, setFileName] = useState('');
  
  // Users Management State
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  
  // Feedback State
  const [status, setStatus] = useState<Status>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LOCK BODY SCROLL WHEN OPEN ---
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Check active session on mount
  useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
          setUser(session?.user ?? null);
      });
  }, []);

  // Fetch Admins
  useEffect(() => {
    if (user && activeTab === 'users') {
        fetchAdmins();
    }
  }, [user, activeTab]);

  const fetchAdmins = async () => {
      setLoadingAdmins(true);
      const { data, error } = await supabase
          .from('authorized_admins')
          .select('*')
          .order('created_at', { ascending: false });
      
      if (data) setAdminList(data);
      setLoadingAdmins(false);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAdminEmail) return;
      const { error } = await supabase.from('authorized_admins').insert([{ email: newAdminEmail }]);
      if (error) alert('Erro ao adicionar: ' + error.message);
      else { setNewAdminEmail(''); fetchAdmins(); }
  };

  const handleRemoveAdmin = async (id: string) => {
      if (!confirm('Tem certeza?')) return;
      const { error } = await supabase.from('authorized_admins').delete().eq('id', id);
      if (!error) fetchAdmins();
  };

  // --- GLOBAL STATUS CHANGE ---
  const changeGlobalStatus = async (newStatus: BroadcastStatus) => {
      try {
        // We use UPSERT to ensure it works even if ID 1 doesn't exist yet
        const { error } = await supabase
          .from('site_settings')
          .upsert({ id: 1, status: newStatus }, { onConflict: 'id' });
          
        if (error) {
            console.error("Erro DB Status:", error);
            alert("Erro ao mudar status: " + error.message + ". Verifique se criou a tabela 'site_settings'.");
        } else {
            console.log("Status mudado para", newStatus);
        }
      } catch (err: any) {
        alert("Erro crítico: " + err.message);
      }
  };

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        if (email === 'italopoca13@gmail.com' && password === 'radicais') {
             const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: 'Ítalo Poca', avatar_url: `https://ui-avatars.com/api/?name=Italo+Poca&background=ef4444&color=fff&size=128` } }
             });
             if (signUpData.user) setUser(signUpData.user);
             else setAuthError(signUpError?.message || error.message);
        } else {
            setAuthError("Credenciais inválidas.");
        }
    } else {
        setUser(data.user);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setUser(null);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // --- PERSISTENT NOTIFICATION SENDING ---
  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
        // We INSERT into 'notifications' table.
        // App.tsx listens to this INSERT and triggers the local notification on all connected clients.
        const { error } = await supabase
            .from('notifications')
            .insert({ 
                title, 
                message, 
                image: imageUrl || null
            });

        if (error) {
            console.error("Notification DB Error:", error);
            alert("Erro ao enviar. Verifique permissões da tabela 'notifications'. Detalhes no console.");
            setStatus('error');
        } else {
            setStatus('success');
            setMessage('');
            setTimeout(() => setStatus('idle'), 3000);
        }

    } catch (err) {
        console.error("Broadcast Error:", err);
        setStatus('error');
    }
  };

  return (
    // Full screen overlay, high Z-index, no scrolling on background
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col animate-[fadeIn_0.2s_ease-out] w-full h-[100dvh] overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-900 flex-shrink-0 safe-area-top">
        <div className="flex items-center gap-3 text-red-500">
          <div className="bg-red-500/10 p-2 rounded-lg">
             <Shield size={24} />
          </div>
          <div>
            <h2 className="font-bold tracking-wider text-lg">PAINEL ADM</h2>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Controle Global</p>
          </div>
        </div>
        <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative w-full max-w-4xl mx-auto flex flex-col">
        {!user ? (
          <div className="h-full overflow-y-auto p-6 flex flex-col items-center justify-center">
             <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-slate-800 mb-6 border border-slate-700 shadow-2xl">
                       <Lock size={40} className="text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Área Restrita</h3>
                    <p className="text-slate-400 text-sm">Apenas equipe autorizada da rádio.</p>
                    {authError && <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-xs">{authError}</div>}
                </div>
                <div className="space-y-4">
                    <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-4 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all text-lg"
                    placeholder="E-mail"
                    required
                    />
                    <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-4 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all text-lg"
                    placeholder="Senha"
                    required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50 text-lg tracking-wide"
                >
                    {loading ? 'VERIFICANDO...' : 'ACESSAR SISTEMA'}
                </button>
             </form>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
              {/* User Bar */}
              <div className="flex items-center justify-between bg-slate-800/30 p-4 border-b border-slate-800 flex-shrink-0">
                  <div className="flex items-center gap-3">
                      {user.user_metadata?.avatar_url ? (
                          <img src={user.user_metadata.avatar_url} alt="Profile" className="w-12 h-12 rounded-xl object-cover border border-slate-600" />
                      ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center">
                              <User size={24} className="text-slate-400" />
                          </div>
                      )}
                      <div>
                          <p className="text-base font-bold text-white">{user.user_metadata?.full_name || 'Admin'}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                  </div>
                  <button onClick={handleLogout} className="p-3 bg-slate-800 hover:bg-red-500/20 hover:text-red-500 rounded-lg text-slate-500 transition-colors">
                      <LogOut size={20} />
                  </button>
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-2 p-4 gap-4 bg-slate-900 border-b border-slate-800 flex-shrink-0">
                  <button 
                      onClick={() => setActiveTab('broadcast')}
                      className={`py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                          activeTab === 'broadcast' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                  >
                      <Radio size={18} />
                      CONTROLE
                  </button>
                  <button 
                      onClick={() => setActiveTab('users')}
                      className={`py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                          activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                  >
                      <Users size={18} />
                      EQUIPE
                  </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  
                  {activeTab === 'broadcast' && (
                      <div className="space-y-8 max-w-2xl mx-auto pb-10">
                          {/* Global Status Control */}
                          <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/50">
                              <h3 className="text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                  Status da Transmissão (Global)
                              </h3>
                              <div className="grid grid-cols-2 gap-4">
                                  <button
                                      onClick={() => changeGlobalStatus('LIVE')}
                                      className={`relative flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 transition-all duration-300 ${
                                          currentStatus === 'LIVE' 
                                          ? 'bg-red-500/10 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' 
                                          : 'bg-slate-900 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                                      }`}
                                  >
                                      <Mic2 size={32} className={currentStatus === 'LIVE' ? 'text-red-500' : 'text-slate-500'} />
                                      <span className={`font-bold text-lg ${currentStatus === 'LIVE' ? 'text-red-500' : 'text-slate-400'}`}>AO VIVO</span>
                                      {currentStatus === 'LIVE' && <span className="absolute top-3 right-3 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
                                  </button>
                                  <button
                                      onClick={() => changeGlobalStatus('AUTODJ')}
                                      className={`relative flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 transition-all duration-300 ${
                                          currentStatus === 'AUTODJ' 
                                          ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)]' 
                                          : 'bg-slate-900 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                                      }`}
                                  >
                                      <Zap size={32} className={currentStatus === 'AUTODJ' ? 'text-blue-500' : 'text-slate-500'} />
                                      <span className={`font-bold text-lg ${currentStatus === 'AUTODJ' ? 'text-blue-500' : 'text-slate-400'}`}>AUTO DJ</span>
                                  </button>
                              </div>
                          </div>

                          {/* Push Form */}
                          <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/50">
                            <h3 className="text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                Notificação para Ouvintes
                            </h3>
                            <form onSubmit={handlePush} className="space-y-4">
                                {status === 'success' && (
                                    <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-3 text-green-400 animate-pulse">
                                        <CheckCircle size={24} />
                                        <span className="font-bold">Notificação enviada com sucesso!</span>
                                    </div>
                                )}
                                {status === 'error' && (
                                    <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
                                        <X size={24} />
                                        <span className="font-bold">Erro ao enviar. Verifique permissões.</span>
                                    </div>
                                )}
                                
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-4 focus:border-indigo-500 focus:outline-none transition-all font-bold placeholder:font-normal"
                                    placeholder="Título (Ex: Estamos Ao Vivo!)"
                                />
                                
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-4 h-32 resize-none focus:border-indigo-500 focus:outline-none transition-all"
                                    placeholder="Mensagem..."
                                    required
                                />

                                {/* Image Uploader */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-xl p-3 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Upload size={18} />
                                        {imageUrl ? 'Alterar Imagem' : 'Adicionar Imagem'}
                                    </button>
                                    {imageUrl && (
                                        <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden relative group/img">
                                            <img src={imageUrl} className="w-full h-full object-cover" />
                                            <button onClick={(e) => { e.stopPropagation(); setImageUrl(''); }} className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white"><Trash2 size={16}/></button>
                                        </div>
                                    )}
                                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => {
                                        if(e.target.files?.[0]) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => setImageUrl(reader.result as string);
                                            reader.readAsDataURL(e.target.files[0]);
                                        }
                                    }}/>
                                </div>
                                
                                <button
                                type="submit"
                                disabled={status === 'sending'}
                                className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg 
                                    ${status === 'sending' 
                                        ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/20 active:scale-[0.98]'
                                    }`}
                                >
                                {status === 'sending' ? <Loader2 size={24} className="animate-spin" /> : <><Send size={20} /> ENVIAR AGORA</>}
                                </button>
                            </form>
                          </div>
                      </div>
                  )}

                  {activeTab === 'users' && (
                      <div className="space-y-6 max-w-2xl mx-auto">
                          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                              <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Novo Administrador</h3>
                              <form onSubmit={handleAddAdmin} className="flex gap-2">
                                  <input 
                                      type="email" 
                                      placeholder="email@exemplo.com"
                                      value={newAdminEmail}
                                      onChange={(e) => setNewAdminEmail(e.target.value)}
                                      className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl p-3 focus:border-indigo-500 focus:outline-none"
                                      required
                                  />
                                  <button type="submit" className="bg-indigo-600 text-white px-6 rounded-xl font-bold hover:bg-indigo-500 transition-colors">
                                      ADD
                                  </button>
                              </form>
                          </div>

                          <div className="space-y-3">
                              {loadingAdmins ? (
                                  <div className="flex justify-center py-10"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>
                              ) : (
                                  adminList.map((admin) => (
                                      <div key={admin.id} className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-800 rounded-xl">
                                          <div className="flex items-center gap-3">
                                              <img src={`https://ui-avatars.com/api/?name=${admin.email}&background=random&color=fff`} className="w-10 h-10 rounded-full" />
                                              <span className="font-medium text-white">{admin.email}</span>
                                          </div>
                                          {admin.email !== 'italopoca13@gmail.com' && (
                                              <button onClick={() => handleRemoveAdmin(admin.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg">
                                                  <Trash2 size={18} />
                                              </button>
                                          )}
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  )}
              </div>
          </div>
        )}
      </div>
    </div>
  );
};