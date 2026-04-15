import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import type { PortfolioCategory, PortfolioItem } from '../../../../types';
import { normalizeSlug } from '../../../../shared/lib/slug';
import { NeonEditor } from '../../../../shared/components/cms/NeonEditor';
import { Button, InputGroup, StyledInput, StyledSelect, StyledTextArea } from '../../../../shared/components/cms/FormControls';
import { useToast } from '../../../../app/providers/useToast';
import { useConfirm } from '../../../../app/providers/useConfirm';
import { logAudit } from '../../../../shared/lib/audit';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';

export const PortfolioPage = () => {
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<PortfolioItem>>({});
  const [techInput, setTechInput] = useState('');
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [showCatManager, setShowCatManager] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    const { data: p } = await supabase.from('portfolio').select('*').order('created_at', { ascending: false });
    if (p) setProjects(p);
    const { data: c } = await supabase.from('portfolio_categories').select('*').order('name');
    if (c) setCategories(c);
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await supabase.from('portfolio_categories').insert([{ name: newCatName.trim() }]);
    if (error) showToast('Erro: ' + error.message, 'error');
    else {
      void logAudit({ action: 'create', entity: 'portfolio_categories', payload: { name: newCatName.trim() } });
      setNewCatName('');
      load();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      showToast('O titulo e obrigatorio.', 'error');
      return;
    }

    const slug = formData.slug || normalizeSlug(formData.title);
    const payload = {
      title: formData.title,
      category: formData.category,
      description: formData.description,
      image: formData.image,
      client: formData.client,
      year: formData.year,
      link: formData.link,
      slug,
      challenge: formData.challenge,
      solution: formData.solution,
      full_description: formData.full_description,
      technologies: formData.technologies || [],
      gallery: formData.gallery || [],
    };

    const { error } = formData.id
      ? await supabase.from('portfolio').update(payload).eq('id', formData.id)
      : await supabase.from('portfolio').insert([payload]);

    if (error) showToast('Erro: ' + error.message, 'error');
    else {
      showToast('Projeto salvo com sucesso.', 'success');
      void logAudit({ action: formData.id ? 'update' : 'create', entity: 'portfolio', entityId: formData.id, payload: { title: payload.title, category: payload.category } });
      setIsEditing(false);
      load();
    }
  };

  const handleCoverImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const name = `pf_cover_${Date.now()}_${file.name}`;
    await supabase.storage.from('portfolio-images').upload(name, file);
    const { data: { publicUrl } } = supabase.storage.from('portfolio-images').getPublicUrl(name);
    setFormData((p) => ({ ...p, image: publicUrl }));
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploadingGallery(true);
    const files = Array.from(e.target.files);
    const newUrls: string[] = [];

    for (const file of files) {
      const name = `pf_gallery_${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('portfolio-images').upload(name, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('portfolio-images').getPublicUrl(name);
        newUrls.push(publicUrl);
      }
    }

    setFormData((p) => ({ ...p, gallery: [...(p.gallery || []), ...newUrls] }));
    setIsUploadingGallery(false);
  };

  const removeGalleryImage = (index: number) => {
    setFormData((p) => {
      const newGallery = [...(p.gallery || [])];
      newGallery.splice(index, 1);
      return { ...p, gallery: newGallery };
    });
  };

  const addTech = (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
    if (e.type === 'keydown' && 'key' in e && e.key !== 'Enter') return;
    if (techInput.trim()) {
      e.preventDefault();
      setFormData((p) => ({ ...p, technologies: [...(p.technologies || []), techInput.trim()] }));
      setTechInput('');
    }
  };

  const removeTech = (index: number) => {
    setFormData((p) => {
      const newTech = [...(p.technologies || [])];
      newTech.splice(index, 1);
      return { ...p, technologies: newTech };
    });
  };

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto bg-surface rounded-2xl p-8 backdrop-blur-md animate-fade-in shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-heading text-xl">{formData.id ? 'Editar Projeto' : 'Novo Projeto'}</h3>
          <Button variant="outline" onClick={() => setShowCatManager(!showCatManager)} className="text-xs"><i className="fa-solid fa-tags"></i> Gerenciar Cats</Button>
        </div>

        {showCatManager && (
          <div className="mb-6 p-4 bg-surface-elevated rounded-xl border border-divider border-dashed animate-fade-in">
            <h4 className="text-sm font-bold text-text-muted mb-3 uppercase">Categorias do Portfólio</h4>
            <div className="flex gap-2 mb-4">
              <StyledInput placeholder="Nova categoria..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="!py-2" />
              <Button onClick={handleAddCategory} variant="secondary" className="!py-2"><i className="fa-solid fa-plus"></i></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 && <span className="text-xs text-text-muted opacity-60 italic">Nenhuma categoria encontrada.</span>}
              {categories.map((c) => (
                <div key={c.id} className="bg-neon-purple/10 border border-neon-purple/30 px-3 py-1.5 rounded-lg text-xs font-medium text-text-primary flex items-center gap-2 group hover:bg-neon-purple/20 transition-colors">
                  {c.name}
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      const confirmed = await confirm({ title: 'Excluir categoria', message: `Excluir a categoria "${c.name}"?`, confirmText: 'Excluir' });
                      if (confirmed) {
                        const { error } = await supabase.from('portfolio_categories').delete().eq('id', c.id);
                        if (error) showToast('Erro ao excluir: ' + error.message, 'error');
                        else {
                          void logAudit({ action: 'delete', entity: 'portfolio_categories', entityId: c.id, payload: { name: c.name } });
                          load();
                        }
                      }
                    }}
                    className="w-5 h-5 rounded flex items-center justify-center text-text-muted opacity-70 hover:text-red-400 hover:bg-surface-elevated transition-colors"
                    title="Excluir Categoria"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputGroup label="Título do Projeto"><StyledInput value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></InputGroup>
            <InputGroup label="Categoria"><StyledSelect value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })}><option value="">Selecione...</option>{categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</StyledSelect></InputGroup>
            <InputGroup label="Cliente"><StyledInput value={formData.client || ''} onChange={(e) => setFormData({ ...formData, client: e.target.value })} placeholder="Ex: Nike, Startup X" /></InputGroup>
            <div className="flex gap-4">
              <InputGroup label="Ano"><StyledInput value={formData.year || ''} onChange={(e) => setFormData({ ...formData, year: e.target.value })} placeholder="Ex: 2024" /></InputGroup>
              <InputGroup label="Link do Projeto"><StyledInput value={formData.link || ''} onChange={(e) => setFormData({ ...formData, link: e.target.value })} placeholder="https://..." /></InputGroup>
            </div>
          </div>

          <InputGroup label="Slug do Projeto (URL)">
            <div className="relative">
              <StyledInput value={formData.slug || ''} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} onBlur={(e) => setFormData({ ...formData, slug: normalizeSlug(e.target.value) })} placeholder="ex: nome-do-projeto" className="pl-24" />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted opacity-70 text-xs select-none">/projeto/</span>
            </div>
          </InputGroup>

          <div className="bg-surface-elevated p-4 rounded-xl border border-divider">
            <label className="block mb-2 text-xs text-text-muted uppercase font-semibold">Tecnologias Utilizadas</label>
            <div className="flex gap-2 mb-3">
              <StyledInput value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={addTech} placeholder="Digite e aperte Enter (ex: React, Node, Figma)..." className="flex-1" />
              <Button onClick={addTech} variant="secondary"><i className="fa-solid fa-plus"></i></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.technologies?.map((tech, i) => (
                <span key={i} className="bg-neon-purple/20 border border-neon-purple/30 text-text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {tech}
                  <button type="button" onClick={() => removeTech(i)} className="hover:text-red-400"><i className="fa-solid fa-xmark"></i></button>
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label="Imagem de Capa (Principal)"><div className="bg-surface-elevated rounded-xl p-4 text-center hover:shadow-md transition-all relative h-full flex flex-col items-center justify-center shadow-sm">{formData.image ? <img src={formData.image} className="h-32 object-cover rounded-lg mb-2" /> : <i className="fa-solid fa-image text-3xl text-text-muted opacity-20 mb-2"></i>}<label className="cursor-pointer text-neon-cyan text-sm font-bold hover:underline">Alterar Capa<input type="file" hidden accept="image/*" onChange={handleCoverImage} /></label></div></InputGroup>
            <InputGroup label="Galeria de Imagens (Detalhes)"><div className="bg-surface-elevated rounded-xl p-4 min-h-[160px] shadow-sm"><div className="flex flex-wrap gap-2 mb-4">{formData.gallery?.map((url, i) => <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden group shadow-sm"><img src={url} className="w-full h-full object-cover" /><button type="button" onClick={() => removeGalleryImage(i)} className="absolute inset-0 bg-surface/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-500 transition-all"><i className="fa-solid fa-trash text-xs"></i></button></div>)}</div><label className={`block text-center cursor-pointer bg-surface py-2 rounded-lg hover:shadow-md transition-all ${isUploadingGallery ? 'opacity-50 pointer-events-none' : ''}`}>{isUploadingGallery ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-plus text-xs mr-1"></i> Adicionar Imagens</>}<input type="file" hidden multiple accept="image/*" onChange={handleGalleryUpload} /></label></div></InputGroup>
          </div>

          <InputGroup label="Descrição Curta (Resumo)"><StyledTextArea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="Aparece no card da home..." /></InputGroup>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputGroup label="O Desafio"><NeonEditor value={formData.challenge || ''} onChange={(val) => setFormData({ ...formData, challenge: val })} placeholder="Qual era o problema a ser resolvido?" /></InputGroup>
            <InputGroup label="A Solução"><NeonEditor value={formData.solution || ''} onChange={(val) => setFormData({ ...formData, solution: val })} placeholder="Como você resolveu o problema?" /></InputGroup>
          </div>

          <InputGroup label="História Completa (Visão Geral)"><NeonEditor value={formData.full_description || ''} onChange={(val) => setFormData({ ...formData, full_description: val })} placeholder="Escreva os detalhes completos do projeto, insira imagens extras, formate texto..." /></InputGroup>

          <div className="flex gap-3 pt-4 border-t border-divider border">
            <Button type="submit" className="flex-1">Salvar Projeto</Button>
            <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-heading text-xl">Projetos</h3>
        <Button onClick={() => { setFormData({}); setIsEditing(true); }}><i className="fa-solid fa-plus"></i> Novo</Button>
      </div>
      {projects.length === 0 ? (
        <EmptyState icon="fa-solid fa-briefcase" title="Sem projetos no portfolio" description="Cadastre projetos para exibir cases e provas sociais." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {projects.map((p) => (
            <div key={p.id} className="bg-surface rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-lg">
            <div className="h-44 overflow-hidden relative">
              <img src={p.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-surface/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-all duration-300">
                <button onClick={() => { setFormData(p); setIsEditing(true); }} className="w-9 h-9 rounded-full bg-surface text-text-primary shadow-xl hover:text-neon-cyan flex items-center justify-center transition-colors"><i className="fa-solid fa-pen text-xs"></i></button>
                <button onClick={async () => { const confirmed = await confirm({ title: 'Excluir projeto', message: 'Deseja excluir este projeto?', confirmText: 'Excluir' }); if (confirmed) { await supabase.from('portfolio').delete().eq('id', p.id); void logAudit({ action: 'delete', entity: 'portfolio', entityId: p.id, payload: { title: p.title } }); showToast('Projeto excluido.', 'success'); load(); } }} className="w-9 h-9 rounded-full bg-surface text-text-primary shadow-xl hover:text-red-500 flex items-center justify-center transition-colors"><i className="fa-solid fa-trash text-xs"></i></button>
              </div>
            </div>
            <div className="p-4">
              <span className="text-xs text-neon-cyan uppercase font-bold tracking-wider">{p.category}</span>
              <h4 className="text-lg font-bold text-text-primary mt-1 truncate">{p.title}</h4>
              <p className="text-text-muted opacity-80 text-xs mt-1 truncate">{p.client ? `Cliente: ${p.client}` : 'Cliente Confidencial'}</p>
            </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
