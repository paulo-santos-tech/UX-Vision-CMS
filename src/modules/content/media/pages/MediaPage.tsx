import { useEffect, useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { useToast } from '../../../../app/providers/useToast';
import { useConfirm } from '../../../../app/providers/useConfirm';
import { logAudit } from '../../../../shared/lib/audit';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';

export const MediaPage = () => {
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const load = async () => {
    const { data } = await supabase.storage.from('portfolio-images').list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
    if (data) {
      setImages(
        data
          .filter((f) => f.name !== '.emptyFolderPlaceholder')
          .map((f) => ({ name: f.name, url: supabase.storage.from('portfolio-images').getPublicUrl(f.name).data.publicUrl }))
      );
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    await supabase.storage.from('portfolio-images').upload(`${Date.now()}_${file.name}`, file);
    void logAudit({ action: 'create', entity: 'media', payload: { file_name: file.name } });
    load();
  };

  const handleDeleteImage = async (imageName: string) => {
    const confirmed = await confirm({
      title: 'Excluir imagem',
      message: 'Tem certeza que deseja apagar esta imagem permanentemente?',
      confirmText: 'Excluir',
    });
    if (!confirmed) return;
    const { error } = await supabase.storage.from('portfolio-images').remove([imageName]);
    if (error) {
      showToast('Erro ao excluir imagem: ' + error.message, 'error');
    } else {
      void logAudit({ action: 'delete', entity: 'media', entityId: imageName, payload: { file_name: imageName } });
      showToast('Imagem excluida.', 'success');
      load();
    }
  };

  return (
    <div className="bg-surface rounded-2xl p-6 backdrop-blur-md animate-fade-in shadow-sm">
      <div className="flex justify-between items-center mb-6"><h3 className="text-heading text-xl">Galeria</h3><label className="cursor-pointer bg-surface-elevated px-4 py-2 rounded hover:bg-surface-elevated border border-divider/20 text-sm">Upload<input type="file" hidden onChange={handleUpload} /></label></div>
      {images.length === 0 ? (
        <EmptyState icon="fa-solid fa-images" title="Biblioteca vazia" description="Envie sua primeira imagem para comecar a montar os conteudos visuais." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {images.map((img) => (
            <div key={img.name} className="aspect-square bg-surface-elevated rounded-xl overflow-hidden relative group shadow-sm hover:shadow-md transition-all">
              <img src={img.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-surface/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all gap-3">
                <button onClick={() => { navigator.clipboard.writeText(img.url); showToast('URL copiada.', 'success'); }} className="w-8 h-8 rounded-full bg-surface text-text-primary shadow-lg hover:text-neon-cyan flex items-center justify-center transition-colors"><i className="fa-solid fa-link text-xs"></i></button>
                <button onClick={() => handleDeleteImage(img.name)} className="w-8 h-8 rounded-full bg-surface text-text-primary shadow-lg hover:text-red-500 flex items-center justify-center transition-colors" title="Excluir"><i className="fa-solid fa-trash text-xs"></i></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
