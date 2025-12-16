import React, { useState, useRef, useEffect } from 'react';
import { X, Shield, Send, Lock, Image as ImageIcon, Upload, Link as LinkIcon, CheckCircle, Loader2, Trash2, Mic2, Zap, LogOut, User, Users, Plus } from 'lucide-react';
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

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, currentStatus, onStatusChange }) => {
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
  const [imageMode, setImageMode] = useState<TabMode>('url');
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

  // Check active session on mount
  useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
          setUser(session?.user ?? null);
      });
  }, []);

  // Fetch Admins List when tab changes to 'users' and user is logged in
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
      if (error) console.error("Erro ao buscar admins:", error);
      setLoadingAdmins(false);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAdminEmail) return;

      const { error } = await supabase
          .from('authorized_admins')
          .insert([{ email: newAdminEmail }]);

      if (error) {
          alert('Erro ao adicionar: ' + error.message);
      } else {
          setNewAdminEmail('');
          fetchAdmins();
      }
  };

  const handleRemoveAdmin = async (id: string) => {
      if (!confirm('Tem certeza que deseja remover este administrador?')) return;

      const { error } = await supabase
          .from('authorized_admins')
          .delete()
          .eq('id', id);

      if (error) {
          alert('Erro ao remover: ' + error.message);
      } else {
          fetchAdmins();
      }
  };

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);

    // 1. Tenta fazer o Login Padrão
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        // 2. Lógica Especial para Master Admin (Backdoor para criação inicial)
        if (email === 'italopoca13@gmail.com' && password === 'radicais') {
             console.log("Admin específico não encontrado. Tentando cadastro automático...");
             
             const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: 'Ítalo Poca',
                        avatar_url: `https://ui-avatars.com/api/?name=Italo+Poca&background=ef4444&color=fff&size=128`
                    }
                }
             });
             
             if (signUpError) {
                 setAuthError("Erro ao criar conta admin: " + signUpError.message);
             } else if (signUpData.user) {
                 setUser(signUpData.user);
                 setAuthError(null);
             } else {
                 setAuthError(error.message);
             }
        } else {
            setAuthError("Credenciais inválidas ou acesso não autorizado.");
        }
    } else {
        // Opcional: Verificar na tabela authorized_admins se este e-mail ainda tem permissão
        // Para manter simples, assumimos que se tem login, pode entrar.
        setUser(data.user);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setUser(null);
      setEmail('');
      setPassword('');
      setActiveTab('broadcast');
  };

  // --- Drag & Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
        alert('Por favor selecione apenas arquivos de imagem.');
        return;
    }

    setFileName(file.name);
    setStatus('idle');

    const reader = new FileReader();
    reader.onloadend = () => {
        setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        processFile(file);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setImageUrl('');
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Robust Push Logic using Service Worker ---
  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações.");
      return;
    }

    setStatus('sending');

    try {
        let permission = Notification.permission;
        if (permission !== 'granted') permission = await Notification.requestPermission();

        const options: any = {
            body: message,
            icon: imageUrl || '/icon.png', 
            image: imageUrl || undefined, 
            vibrate: [200, 100, 200],
            tag: 'radio-admin-msg',
            requireInteraction: false,
            renotify: true,
            silent: false,
        };

        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, options);
        } else {
            new Notification(title, options);
        }

        setStatus('success');
        setMessage(''); 
        
        setTimeout(() => setStatus('idle'), 3000);

    } catch (err) {
        console.error("Push Error:", err);
        setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-2 text-red-500">
            <Shield size={20} />
            <h2 className="font-bold tracking-wider">PAINEL ADM</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-0 overflow-hidden flex flex-col h-full">
          {!user ? (
            <div className="p-6 overflow-y-auto">
                <form onSubmit={handleLogin} className="space-y-6">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 mb-4 border border-slate-700">
                    <Lock size={32} className="text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">ÁREA RESTRITA</p>
                    {authError && <p className="text-red-400 text-xs mt-2">{authError}</p>}
                </div>
                <div className="space-y-3">
                    <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                    placeholder="E-mail"
                    required
                    />
                    <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                    placeholder="Senha"
                    required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                    {loading ? 'ENTRANDO...' : 'ACESSAR'}
                </button>
                </form>
            </div>
          ) : (
            <div className="flex flex-col h-full">
                {/* User Profile Info */}
                <div className="flex items-center justify-between bg-slate-800/40 p-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        {user.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                <User size={20} className="text-slate-400" />
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-bold text-white">{user.user_metadata?.full_name || 'Admin'}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[120px]">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-white transition-colors" title="Sair">
                        <LogOut size={18} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-800">
                    <button 
                        onClick={() => setActiveTab('broadcast')}
                        className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'broadcast' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <Mic2 size={16} />
                        Transmissão
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'users' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <Users size={16} />
                        Usuários
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    
                    {/* --- BROADCAST TAB --- */}
                    {activeTab === 'broadcast' && (
                        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                            {/* Broadcast Status Toggle */}
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                    Status do Player
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => onStatusChange('LIVE')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                                            currentStatus === 'LIVE' 
                                            ? 'bg-red-500/20 border-red-500 text-red-400' 
                                            : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                                        }`}
                                    >
                                        <Mic2 size={18} />
                                        <span className="font-bold text-sm">AO VIVO</span>
                                    </button>
                                    <button
                                        onClick={() => onStatusChange('AUTODJ')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                                            currentStatus === 'AUTODJ' 
                                            ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                                            : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                                        }`}
                                    >
                                        <Zap size={18} />
                                        <span className="font-bold text-sm">AUTO DJ</span>
                                    </button>
                                </div>
                            </div>

                            <div className="h-px bg-slate-800"></div>

                            {/* Push Form */}
                            <form onSubmit={handlePush} className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    Enviar Notificação (Broadcast)
                                </h3>

                                {/* Status Banner */}
                                {status === 'success' && (
                                    <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400">
                                        <CheckCircle size={18} />
                                        <span className="text-sm font-semibold">Enviado com sucesso!</span>
                                    </div>
                                )}
                                {status === 'error' && (
                                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
                                        <X size={18} />
                                        <span className="text-sm font-semibold">Erro. Verifique permissões.</span>
                                    </div>
                                )}

                                <div>
                                    <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm font-semibold"
                                    placeholder="Título da Notificação"
                                    />
                                </div>
                                
                                <div>
                                    <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 h-24 resize-none focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
                                    placeholder="Digite a mensagem para todos os usuários..."
                                    required
                                    />
                                </div>

                                {/* Image Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Imagem</span>
                                        <div className="flex bg-slate-800 rounded-lg p-0.5">
                                            <button
                                                type="button"
                                                onClick={() => { setImageMode('url'); setImageUrl(''); }}
                                                className={`p-1.5 rounded-md transition-all ${imageMode === 'url' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                <LinkIcon size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setImageMode('upload'); setImageUrl(''); }}
                                                className={`p-1.5 rounded-md transition-all ${imageMode === 'upload' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                <Upload size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {imageMode === 'url' ? (
                                        <div className="relative">
                                            <ImageIcon size={18} className="absolute left-3 top-3 text-slate-600" />
                                            <input
                                                type="url"
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 pl-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    ) : (
                                        <div 
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`w-full h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden ${
                                                isDragging 
                                                ? 'border-indigo-500 bg-indigo-500/10' 
                                                : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <input 
                                                ref={fileInputRef}
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={handleFileChange}
                                            />
                                            
                                            {imageUrl ? (
                                                <>
                                                    <img src={imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
                                                        <CheckCircle size={18} className="text-green-400" />
                                                        <span className="text-xs font-medium text-white truncate max-w-[150px]">{fileName}</span>
                                                    </div>
                                                    <button 
                                                        onClick={clearImage}
                                                        className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors z-10"
                                                        title="Remover imagem"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={20} className={`mb-1 transition-colors ${isDragging ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                                                    <span className={`text-xs transition-colors ${isDragging ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                                        {isDragging ? 'Solte para enviar' : 'Clique ou arraste imagem'}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="pt-2">
                                    <button
                                    type="submit"
                                    disabled={status === 'sending'}
                                    className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg 
                                        ${status === 'sending' 
                                            ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]'
                                        }`}
                                    >
                                    {status === 'sending' ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            ENVIANDO...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            ENVIAR PUSH
                                        </>
                                    )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* --- USERS TAB --- */}
                    {activeTab === 'users' && (
                        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Adicionar Administrador</h3>
                                <form onSubmit={handleAddAdmin} className="flex gap-2">
                                    <input 
                                        type="email" 
                                        placeholder="novo.admin@email.com"
                                        value={newAdminEmail}
                                        onChange={(e) => setNewAdminEmail(e.target.value)}
                                        className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                                        required
                                    />
                                    <button 
                                        type="submit"
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-lg transition-colors"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </form>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center justify-between">
                                    <span>Administradores Autorizados</span>
                                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">{adminList.length}</span>
                                </h3>
                                
                                {loadingAdmins ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 size={24} className="animate-spin text-indigo-500" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {adminList.length === 0 ? (
                                            <p className="text-center text-slate-600 text-sm py-4">Nenhum usuário cadastrado na lista.</p>
                                        ) : (
                                            adminList.map((admin) => (
                                                <div key={admin.id} className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-800 rounded-lg group hover:border-slate-700 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <img 
                                                            src={`https://ui-avatars.com/api/?name=${admin.email}&background=random&color=fff&size=64`} 
                                                            alt="Avatar" 
                                                            className="w-8 h-8 rounded-full opacity-80"
                                                        />
                                                        <span className="text-sm font-medium text-slate-200">{admin.email}</span>
                                                    </div>
                                                    {admin.email !== 'italopoca13@gmail.com' && (
                                                        <button 
                                                            onClick={() => handleRemoveAdmin(admin.id)}
                                                            className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Remover acesso"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};