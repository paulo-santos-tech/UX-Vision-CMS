import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import type { MicrosaasItem } from '../../../../types';
import { NeonEditor } from '../../../../shared/components/cms/NeonEditor';
import { Button, InputGroup, StyledInput, StyledSelect } from '../../../../shared/components/cms/FormControls';
import { useToast } from '../../../../app/providers/useToast';
import { useConfirm } from '../../../../app/providers/useConfirm';
import { logAudit } from '../../../../shared/lib/audit';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const MicrosaasPage = () => {
  const [items, setItems] = useState<MicrosaasItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<MicrosaasItem>>({});
  const [featureInput, setFeatureInput] = useState('');
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    const { data } = await supabase.from('microsaas').select('*').order('created_at', { ascending: false });
    if (data) setItems(data);
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('O nome e obrigatorio.', 'error');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      image: formData.image,
      status: formData.status || 'Beta',
      price: formData.price,
      link: formData.link,
      features: formData.features || [],
    };

    const { error } = formData.id
      ? await supabase.from('microsaas').update(payload).eq('id', formData.id)
      : await supabase.from('microsaas').insert([payload]);

    if (error) showToast('Erro: ' + error.message, 'error');
    else {
      showToast('MicroSaaS salvo com sucesso.', 'success');
      void logAudit({ action: formData.id ? 'update' : 'create', entity: 'microsaas', entityId: formData.id, payload: { name: payload.name, status: payload.status } });
      setIsEditing(false);
      load();
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const name = `ms_${Date.now()}_${file.name}`;
    await supabase.storage.from('portfolio-images').upload(name, file);
    const { data } = supabase.storage.from('portfolio-images').getPublicUrl(name);
    setFormData((prev) => ({ ...prev, image: data.publicUrl }));
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    setFormData((prev) => ({ ...prev, features: [...(prev.features || []), featureInput.trim()] }));
    setFeatureInput('');
  };

  const removeFeature = (idx: number) => {
    setFormData((prev) => {
      const newFeatures = [...(prev.features || [])];
      newFeatures.splice(idx, 1);
      return { ...prev, features: newFeatures };
    });
  };

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto bg-surface border border-divider rounded-2xl p-8 backdrop-blur-md animate-fade-in">
        <h3 className="text-heading text-xl mb-6">{formData.id ? 'Editar MicroSaaS' : 'Novo MicroSaaS'}</h3>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputGroup label="Nome do Produto"><StyledInput value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></InputGroup>
            <InputGroup label="Status"><StyledSelect value={formData.status || 'Beta'} onChange={(e) => setFormData({ ...formData, status: e.target.value as MicrosaasItem['status'] })}><option value="Beta">Beta / Construção</option><option value="Uso">Em Uso (Privado)</option><option value="Venda">Venda / Aberto</option></StyledSelect></InputGroup>
            <InputGroup label="Preço (Texto)"><StyledInput value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="Ex: R$ 49/mês ou Grátis" /></InputGroup>
            <InputGroup label="Link de Acesso"><StyledInput value={formData.link || ''} onChange={(e) => setFormData({ ...formData, link: e.target.value })} placeholder="https://..." /></InputGroup>
          </div>

          <InputGroup label="Logo / Ícone"><div className="flex items-center gap-4 p-4 border border-dashed border-divider border rounded-xl bg-surface-elevated">{formData.image ? <img src={formData.image} className="w-16 h-16 object-contain bg-black/20 rounded-lg p-2" /> : <div className="w-16 h-16 bg-surface-elevated rounded-lg flex items-center justify-center text-white/20"><i className="fa-solid fa-image"></i></div>}<label className="cursor-pointer text-neon-cyan font-bold hover:underline">Escolher Imagem<input type="file" hidden accept="image/*" onChange={handleImage} /></label></div></InputGroup>

          <InputGroup label="Descrição"><NeonEditor value={formData.description || ''} onChange={(val) => setFormData({ ...formData, description: val })} placeholder="Descreva o produto..." /></InputGroup>

          <div className="bg-surface-elevated p-4 rounded-xl border border-divider">
            <label className="block mb-2 text-xs text-text-muted uppercase font-semibold">Recursos / Features</label>
            <div className="flex gap-2 mb-3">
              <StyledInput value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())} placeholder="Digite um recurso e enter..." className="flex-1" />
              <Button onClick={addFeature} variant="secondary"><i className="fa-solid fa-plus"></i></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.features?.map((feat, i) => (
                <span key={i} className="flex items-center gap-2 bg-neon-cyan/10 border border-neon-cyan/20 px-3 py-1 rounded-full text-sm text-neon-cyan">
                  {feat}
                  <button type="button" onClick={() => removeFeature(i)} className="hover:text-text-primary"><i className="fa-solid fa-xmark"></i></button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-divider border">
            <Button type="submit" className="flex-1">Salvar</Button>
            <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-heading text-xl">Meus MicroSaaS</h3>
        <Button onClick={() => { setFormData({ status: 'Beta', features: [] }); setIsEditing(true); }}><i className="fa-solid fa-plus"></i> Novo</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-surface-elevated border border-divider rounded-2xl overflow-hidden flex flex-col group hover:bg-surface-elevated transition-colors">
            <div className="p-6 flex items-start justify-between">
              <div className="w-12 h-12 bg-surface-elevated rounded-lg flex items-center justify-center p-2 border border-divider">{item.image ? <img src={item.image} className="w-full h-full object-contain" /> : <i className="fa-solid fa-cube text-text-muted opacity-70"></i>}</div>
              <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${item.status === 'Venda' ? 'bg-green-500/10 text-green-400 border-green-500/20' : item.status === 'Uso' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>{item.status}</div>
            </div>
            <div className="px-6 pb-4 flex-grow">
              <h4 className="font-bold text-lg text-text-primary mb-1">{item.name}</h4>
              <p className="text-sm text-text-muted line-clamp-2 mb-4">{stripHtml(item.description || '')}</p>
              {item.features && item.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {item.features.slice(0, 3).map((f, i) => <span key={i} className="text-[10px] bg-surface-elevated px-2 py-0.5 rounded text-text-muted">{f}</span>)}
                  {item.features.length > 3 && <span className="text-[10px] text-text-muted opacity-70">+{item.features.length - 3}</span>}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-divider border flex items-center justify-between bg-black/20">
              <span className="font-mono text-xs text-neon-cyan">{item.price}</span>
              <div className="flex gap-2">
                <button onClick={() => { setFormData(item); setIsEditing(true); }} className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded"><i className="fa-solid fa-pen"></i></button>
                <button onClick={async () => { const confirmed = await confirm({ title: 'Excluir item', message: 'Deseja excluir este item?', confirmText: 'Excluir' }); if (confirmed) { await supabase.from('microsaas').delete().eq('id', item.id); void logAudit({ action: 'delete', entity: 'microsaas', entityId: item.id, payload: { name: item.name } }); showToast('Item excluido.', 'success'); load(); } }} className="p-2 text-text-muted hover:text-red-400 hover:bg-surface-elevated rounded"><i className="fa-solid fa-trash"></i></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-full"><EmptyState icon="fa-solid fa-cube" title="Nenhum MicroSaaS cadastrado" description="Adicione produtos para alimentar a vitrine de solucoes." /></div>}
      </div>
    </div>
  );
};
