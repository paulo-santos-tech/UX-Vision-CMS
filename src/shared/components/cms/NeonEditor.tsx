import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useToast } from '../../../app/providers/useToast';

export const NeonEditor = ({ value, onChange, placeholder }: { value: string; onChange: (val: string) => void; placeholder?: string }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const exec = (command: string, valueArg: string | undefined = undefined) => {
    if (editorRef.current) editorRef.current.focus();
    document.execCommand(command, false, valueArg);
    handleInput();
  };

  const addLink = () => {
    const url = prompt('URL do link:');
    if (url) exec('createLink', url);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploading(true);
    const file = e.target.files[0];
    const fileName = `editor_${Date.now()}_${file.name.replace(/\s/g, '_')}`;

    try {
      const { error } = await supabase.storage.from('portfolio-images').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('portfolio-images').getPublicUrl(fileName);
      exec('insertImage', publicUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      showToast('Erro ao enviar imagem: ' + message, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border border-divider rounded-xl overflow-hidden bg-surface-elevated flex flex-col h-[400px] shadow-inner">
      <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />

      <div className="bg-surface-elevated border-b border-divider border p-2 flex flex-wrap gap-2 items-center select-none">
        <select
          onChange={(e) => {
            const val = e.target.value;
            if (val) exec('formatBlock', val);
            e.target.value = '';
          }}
          defaultValue=""
          className="bg-surface-elevated text-text-primary opacity-90 text-xs font-bold border border-divider rounded px-2 py-1.5 outline-none cursor-pointer focus:border-neon-purple/50 transition-colors"
        >
          <option value="" disabled>Estilo de Texto</option>
          <option value="P">Texto Normal (P)</option>
          <option value="H2">Título H2</option>
          <option value="H3">Título H3</option>
          <option value="H4">Título H4</option>
          <option value="H5">Título H5</option>
        </select>

        <div className="w-px h-4 bg-surface-elevated mx-2"></div>

        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors" title="Negrito"><i className="fa-solid fa-bold text-xs"></i></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors" title="Itálico"><i className="fa-solid fa-italic text-xs"></i></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors" title="Lista"><i className="fa-solid fa-list-ul text-xs"></i></button>
        <div className="w-px h-4 bg-surface-elevated mx-2"></div>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); addLink(); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-elevated text-text-muted hover:text-neon-cyan transition-colors" title="Link"><i className="fa-solid fa-link text-xs"></i></button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-8 h-8 flex items-center justify-center rounded hover:bg-surface-elevated transition-colors ${isUploading ? 'text-neon-purple animate-pulse' : 'text-text-muted hover:text-neon-purple'}`} title="Inserir Imagem">
          <i className={`fa-solid ${isUploading ? 'fa-spinner fa-spin' : 'fa-image'} text-xs`}></i>
        </button>
      </div>

      <div ref={editorRef} contentEditable onInput={handleInput} className="flex-grow p-4 outline-none overflow-y-auto neon-editor-content bg-transparent font-sans text-sm text-gray-200 leading-relaxed" data-placeholder={placeholder} />
    </div>
  );
};
