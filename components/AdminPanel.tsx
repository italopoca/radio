import React, { useState, useRef } from 'react';
import { X, Shield, Send, Lock, Image as ImageIcon, Upload, Link as LinkIcon, CheckCircle, Loader2 } from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabMode = 'url' | 'upload';
type Status = 'idle' | 'sending' | 'success' | 'error';

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Form State
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Aviso da Rádio');
  const [imageMode, setImageMode] = useState<TabMode>('url');
  const [imageUrl, setImageUrl] = useState(''); // Stores URL or Base64
  const [fileName, setFileName] = useState('');
  
  // Feedback State
  const [status, setStatus] = useState<Status>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '9309') {
      setIsAuthenticated(true);
    } else {
      alert('Acesso Negado: PIN Incorreto');
      setPin('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecione apenas arquivos de imagem.');
        return;
      }

      setFileName(file.name);
      setStatus('idle');

      // Convert file to Base64 to use in Notification without backend
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações.");
      return;
    }

    if (Notification.permission !== "granted") {
        alert("Permissão de notificação não concedida.");
        return;
    }

    setStatus('sending');

    // Simulate network delay for realism
    setTimeout(() => {
      try {
        // Trigger the actual browser notification
        new Notification(title, {
          body: message,
          icon: imageUrl || undefined, // Standard icon
          image: imageUrl || undefined, // Large image (on supported devices/browsers)
          requireInteraction: true,
          silent: false,
        } as NotificationOptions & { image?: string });

        setStatus('success');
        setMessage('');
        
        // Reset success message after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);

      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    }, 1500);
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

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {!isAuthenticated ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 mb-4 border border-slate-700">
                  <Lock size={32} className="text-slate-500" />
                </div>
                <p className="text-slate-400 text-sm font-medium">ÁREA RESTRITA</p>
              </div>
              <div className="space-y-2">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-center text-3xl tracking-[0.5em] text-white rounded-xl p-4 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:tracking-normal placeholder:text-lg"
                  placeholder="Digite o PIN"
                  maxLength={4}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-red-600/20"
              >
                ACESSAR
              </button>
            </form>
          ) : (
            <form onSubmit={handlePush} className="space-y-4">
              
              {/* Status Banner */}
              {status === 'success' && (
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400 animate-[fadeIn_0.3s_ease-out]">
                    <CheckCircle size={18} />
                    <span className="text-sm font-semibold">Notificação enviada com sucesso!</span>
                </div>
              )}
               {status === 'error' && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 animate-[fadeIn_0.3s_ease-out]">
                    <X size={18} />
                    <span className="text-sm font-semibold">Erro ao enviar. Verifique as permissões.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  placeholder="Ex: Rádio Ao Vivo"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Mensagem</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 h-24 resize-none focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  placeholder="Digite o aviso para os ouvintes..."
                  required
                />
              </div>

              {/* Image Section with Tabs */}
              <div>
                <div className="flex items-center justify-between mb-2 ml-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Imagem da Notificação</label>
                    <div className="flex bg-slate-800 rounded-lg p-0.5">
                        <button
                            type="button"
                            onClick={() => { setImageMode('url'); setImageUrl(''); }}
                            className={`p-1.5 rounded-md transition-all ${imageMode === 'url' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            title="Usar URL"
                        >
                            <LinkIcon size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => { setImageMode('upload'); setImageUrl(''); }}
                            className={`p-1.5 rounded-md transition-all ${imageMode === 'upload' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            title="Fazer Upload"
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
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-20 border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group"
                    >
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                        {imageUrl ? (
                            <div className="flex items-center gap-2 text-indigo-400">
                                <CheckCircle size={18} />
                                <span className="text-xs font-medium truncate max-w-[200px]">{fileName}</span>
                            </div>
                        ) : (
                            <>
                                <Upload size={20} className="text-slate-500 group-hover:text-indigo-400 mb-1" />
                                <span className="text-xs text-slate-500 group-hover:text-slate-300">Clique para enviar imagem</span>
                            </>
                        )}
                    </div>
                )}
                
                {/* Image Preview Tiny */}
                {imageUrl && (
                    <div className="mt-2 flex justify-end">
                        <img src={imageUrl} alt="Preview" className="h-12 w-12 object-cover rounded-lg border border-slate-700" />
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
                        DISPARAR PUSH
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};