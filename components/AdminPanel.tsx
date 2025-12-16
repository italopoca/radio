import React, { useState, useRef } from 'react';
import { X, Shield, Send, Lock, Image as ImageIcon, Upload, Link as LinkIcon, CheckCircle, Loader2, Trash2, Mic2, Zap } from 'lucide-react';
import { BroadcastStatus } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: BroadcastStatus;
  onStatusChange: (status: BroadcastStatus) => void;
}

type TabMode = 'url' | 'upload';
type Status = 'idle' | 'sending' | 'success' | 'error';

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, currentStatus, onStatusChange }) => {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Form State
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Aviso da Rádio');
  const [imageMode, setImageMode] = useState<TabMode>('url');
  const [imageUrl, setImageUrl] = useState(''); 
  const [fileName, setFileName] = useState('');
  
  // Feedback State
  const [status, setStatus] = useState<Status>('idle');
  const [isDragging, setIsDragging] = useState(false);
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
      e.stopPropagation(); // Prevent triggering the file input click
      setImageUrl('');
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Push Logic ---
  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações.");
      return;
    }

    if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            alert("Permissão de notificação negada.");
            return;
        }
    }

    setStatus('sending');

    setTimeout(() => {
      try {
        new Notification(title, {
          body: message,
          icon: imageUrl || undefined,
          requireInteraction: false, // Cleaner behavior on mobile
          silent: false,
          tag: 'radio-update', // Groups notifications
        } as NotificationOptions);

        setStatus('success');
        setMessage('');
        
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
            <div className="space-y-8">
                
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
                    Enviar Notificação
                </h3>

                {/* Status Banner */}
                {status === 'success' && (
                    <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400 animate-[fadeIn_0.3s_ease-out]">
                        <CheckCircle size={18} />
                        <span className="text-sm font-semibold">Enviado com sucesso!</span>
                    </div>
                )}
                {status === 'error' && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 animate-[fadeIn_0.3s_ease-out]">
                        <X size={18} />
                        <span className="text-sm font-semibold">Erro. Permita notificações.</span>
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
                    placeholder="Digite a mensagem..."
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
        </div>
      </div>
    </div>
  );
};