import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import type { BlogCategory, BlogPost } from '../../../../types';
import { normalizeSlug } from '../../../../shared/lib/slug';
import { Button, InputGroup, StyledInput, StyledSelect, StyledTextArea } from '../../../../shared/components/cms/FormControls';
import { NeonEditor } from '../../../../shared/components/cms/NeonEditor';
import { SeoGauge } from '../../../../shared/components/cms/SeoGauge';
import { useToast } from '../../../../app/providers/useToast';
import { useConfirm } from '../../../../app/providers/useConfirm';
import { logAudit } from '../../../../shared/lib/audit';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';

export const BlogPage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [formData, setFormData] = useState<Partial<BlogPost>>({ status: 'draft', social_shares: { wa: true, fb: false, li: true, tg: false, tw: false }, tags: [] });
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [showCatManager, setShowCatManager] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const loadData = useCallback(async () => {
    const { data: p } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    if (p) setPosts(p);
    const { data: c } = await supabase.from('blog_categories').select('*').order('name');
    if (c) setCategories(c);
  }, []);

  useEffect(() => { void Promise.resolve().then(loadData); }, [loadData]);

  const { seoChecks, seoScore } = useMemo(() => {
    if (!isEditing) return { seoChecks: [], seoScore: 0 };

    const title = formData.title || '';
    const content = formData.content || '';
    const keyword = (formData.keyword || '').trim().toLowerCase();
    let checksFound = 0;
    const checks: { id: string; label: string; status: string; message: string }[] = [];

    if (keyword) {
      if (title.toLowerCase().includes(keyword)) {
        checksFound++;
        checks.push({ id: '1', label: 'Título', status: 'good', message: 'Palavra-chave encontrada.' });
      } else {
        checks.push({ id: '1', label: 'Título', status: 'bad', message: 'Palavra-chave ausente.' });
      }

      if (content.toLowerCase().includes(keyword)) {
        checksFound++;
        checks.push({ id: '2', label: 'Conteúdo', status: 'good', message: 'Palavra-chave no texto.' });
      }

      if (content.length > 500) {
        checksFound++;
        checks.push({ id: '3', label: 'Tamanho', status: 'good', message: 'Conteúdo extenso.' });
      }
    }

    return {
      seoChecks: checks,
      seoScore: keyword ? Math.round((checksFound / 3) * 100) : 0,
    };
  }, [formData, isEditing]);

  const handleEdit = (post: BlogPost) => { setFormData(post); setEditingId(post.id); setIsEditing(true); };
  const handleCreate = () => { setFormData({ status: 'draft', tags: [] }); setEditingId(null); setIsEditing(true); };
  const handleDelete = async (id: number) => {
    const confirmed = await confirm({ title: 'Excluir post', message: 'Deseja excluir este post?', confirmText: 'Excluir' });
    if (confirmed) {
      await supabase.from('blog_posts').delete().eq('id', id);
      showToast('Post excluido.', 'success');
      void logAudit({ action: 'delete', entity: 'blog_posts', entityId: id });
      loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      showToast('Titulo obrigatorio.', 'error');
      return;
    }

    const slug = formData.slug || normalizeSlug(formData.title);
    const payload = { ...formData, slug, tags: formData.tags || [] };
    const { error } = editingId
      ? await supabase.from('blog_posts').update(payload).eq('id', editingId)
      : await supabase.from('blog_posts').insert([payload]);

    if (error) showToast(error.message, 'error');
    else {
      showToast('Post salvo com sucesso.', 'success');
      void logAudit({ action: editingId ? 'update' : 'create', entity: 'blog_posts', entityId: editingId || undefined, payload: { title: payload.title, status: payload.status } });
      setIsEditing(false);
      loadData();
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const name = `blog_${Date.now()}_${file.name}`;
    await supabase.storage.from('portfolio-images').upload(name, file);
    const { data } = supabase.storage.from('portfolio-images').getPublicUrl(name);
    setFormData({ ...formData, image: data.publicUrl });
  };

  const handleAddCategory = async () => {
    if (newCatName) {
      await supabase.from('blog_categories').insert([{ name: newCatName }]);
      setNewCatName('');
      void logAudit({ action: 'create', entity: 'blog_categories', payload: { name: newCatName } });
      loadData();
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const currentTags = formData.tags || [];
    if (!currentTags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...currentTags, tagInput.trim()] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: (formData.tags || []).filter((t) => t !== tagToRemove) });
  };

  if (!isEditing) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-between mb-6"><h3 className="text-heading text-xl">Blog</h3><Button onClick={handleCreate}>Novo Post</Button></div>
        {posts.length === 0 ? (
          <EmptyState icon="fa-solid fa-newspaper" title="Nenhum post cadastrado" description="Crie seu primeiro post para comecar a publicar conteudo." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {posts.map((post) => (
            <div key={post.id} className="bg-surface rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all shadow-sm hover:shadow-lg">
              <div className="h-44 bg-surface-elevated relative overflow-hidden">
                {post.image && <img src={post.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                <div className="absolute inset-0 bg-surface/20 backdrop-blur-[2px] flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleEdit(post)} className="w-9 h-9 bg-surface text-text-primary shadow-xl rounded-full flex items-center justify-center hover:text-neon-purple transition-colors"><i className="fa-solid fa-pen text-xs"></i></button>
                  <button onClick={() => handleDelete(post.id)} className="w-9 h-9 bg-surface text-text-primary shadow-xl rounded-full flex items-center justify-center hover:text-red-500 transition-colors"><i className="fa-solid fa-trash text-xs"></i></button>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-bold truncate">{post.title}</h4>
                <div className="text-xs text-text-muted opacity-80 mt-1">{post.status}</div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-surface rounded-2xl p-6 backdrop-blur-md shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-heading text-xl">{editingId ? 'Editar' : 'Novo'} Post</h3>
            <Button variant="outline" onClick={() => setShowCatManager(!showCatManager)} className="text-xs"><i className="fa-solid fa-tags"></i> Gerenciar Cats</Button>
          </div>

          {showCatManager && (
            <div className="mb-6 p-4 bg-surface-elevated rounded-xl border border-divider border-dashed animate-fade-in">
              <h4 className="text-sm font-bold text-text-muted mb-3 uppercase">Gerenciar Categorias</h4>
              <div className="flex gap-2 mb-4">
                <StyledInput placeholder="Nova categoria..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="!py-2" />
                <Button onClick={handleAddCategory} variant="secondary" className="!py-2"><i className="fa-solid fa-plus"></i></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.length === 0 && <span className="text-xs text-text-muted opacity-60 italic">Nenhuma categoria cadastrada.</span>}
                {categories.map((c) => (
                  <div key={c.id} className="bg-neon-purple/10 border border-neon-purple/30 px-3 py-1.5 rounded-lg text-xs font-medium text-text-primary flex items-center gap-2 group hover:bg-neon-purple/20 transition-colors">
                    {c.name}
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        const confirmed = await confirm({ title: 'Excluir categoria', message: `Excluir a categoria "${c.name}"?`, confirmText: 'Excluir' });
                        if (confirmed) {
                          const { error } = await supabase.from('blog_categories').delete().eq('id', c.id);
                          if (error) showToast('Erro ao excluir: ' + error.message, 'error');
                          else {
                            void logAudit({ action: 'delete', entity: 'blog_categories', entityId: c.id, payload: { name: c.name } });
                            loadData();
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

          <form onSubmit={handleSave} className="space-y-4">
            <InputGroup label="Título"><StyledInput value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></InputGroup>

            <InputGroup label="Slug (URL Amigável)">
              <div className="relative">
                <StyledInput value={formData.slug || ''} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} onBlur={(e) => setFormData({ ...formData, slug: normalizeSlug(e.target.value) })} placeholder="ex: meu-artigo-incrivel" className="pl-20" />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted opacity-70 text-xs select-none">/blog/</span>
              </div>
            </InputGroup>

            <InputGroup label="Resumo (Excerpt)">
              <StyledTextArea value={formData.excerpt || ''} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} rows={3} placeholder="Um breve resumo do artigo para aparecer nos cards..." />
            </InputGroup>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputGroup label="Categoria"><StyledSelect value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })}><option value="">Selecione...</option>{categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</StyledSelect></InputGroup>
              <InputGroup label="Status"><StyledSelect value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as BlogPost['status'] })}><option value="draft">Rascunho</option><option value="published">Publicado</option></StyledSelect></InputGroup>
              <InputGroup label="Tempo de Leitura"><StyledInput value={formData.read_time || ''} onChange={(e) => setFormData({ ...formData, read_time: e.target.value })} placeholder="ex: 5 min" /></InputGroup>
            </div>

            <InputGroup label="Tags">
              <div className="flex gap-2 mb-2">
                <StyledInput value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} placeholder="Adicionar tag e pressione Enter..." />
                <Button onClick={handleAddTag} variant="secondary"><i className="fa-solid fa-plus"></i></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.tags || []).map((tag, i) => (
                  <span key={i} className="bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan px-3 py-1 rounded-full text-xs flex items-center gap-2">
                    {tag}
                    <i className="fa-solid fa-xmark cursor-pointer hover:text-text-primary" onClick={() => handleRemoveTag(tag)}></i>
                  </span>
                ))}
                {(formData.tags || []).length === 0 && <span className="text-text-muted opacity-60 text-xs italic">Nenhuma tag adicionada.</span>}
              </div>
            </InputGroup>

            <InputGroup label="Conteúdo">
              <NeonEditor
                value={formData.content || ''}
                onChange={(c) => {
                  const text = c.replace(/<[^>]*>?/gm, '');
                  const words = text.split(/\s+/).filter((x) => x).length;
                  const mins = Math.ceil(words / 200);
                  const autoTime = `${mins} min`;

                  setFormData((prev) => ({ ...prev, content: c, read_time: prev.read_time ? prev.read_time : autoTime }));
                }}
              />
            </InputGroup>

            <InputGroup label="Imagem de Capa">
              <div className="bg-surface-elevated rounded-xl p-6 text-center hover:shadow-md transition-all relative h-full flex flex-col items-center justify-center shadow-sm">
                {formData.image ? <img src={formData.image} className="h-40 object-cover rounded-lg mb-3 shadow-sm" /> : <i className="fa-solid fa-image text-4xl text-text-muted opacity-20 mb-3"></i>}
                <label className="cursor-pointer text-neon-cyan text-sm font-bold hover:underline">{formData.image ? 'Alterar Capa' : 'Escolher Capa'}<input type="file" hidden accept="image/*" onChange={handleImage} /></label>
              </div>
            </InputGroup>

            <div className="flex gap-2 mt-4"><Button type="submit">Salvar</Button><Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button></div>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-surface border border-divider rounded-2xl p-6 backdrop-blur-md">
          <h3 className="font-bold mb-4">SEO & Preview</h3>
          <InputGroup label="Palavra-chave Foco"><StyledInput value={formData.keyword || ''} onChange={(e) => setFormData({ ...formData, keyword: e.target.value })} /></InputGroup>
          <SeoGauge score={seoScore} />

          <div className="mt-6 space-y-4 border-t border-divider border pt-4">
            <InputGroup label="Meta Title"><div className="relative"><StyledInput value={formData.meta_title || ''} onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })} maxLength={100} /><span className="absolute right-3 top-3 text-[10px] text-text-muted opacity-70">{formData.meta_title?.length || 0}/100</span></div></InputGroup>
            <InputGroup label="Meta Description"><div className="relative"><StyledTextArea value={formData.meta_description || ''} onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })} maxLength={160} rows={3} className="min-h-[80px]" /><span className="absolute right-3 bottom-3 text-[10px] text-text-muted opacity-70">{formData.meta_description?.length || 0}/160</span></div></InputGroup>
          </div>

          <div className="mt-4 border-t border-divider border pt-4 text-xs text-text-muted opacity-80">
            <div className="mt-2 flex flex-col gap-1">
              {seoChecks.map((c) => <span key={c.id} className={c.status === 'good' ? 'text-green-400' : 'text-red-400'}>{c.message}</span>)}
            </div>
          </div>
        </div>

        <div className="bg-[#ffffff] text-[#000000] rounded-xl overflow-hidden shadow-lg border border-divider">
          <div className="bg-[#1f1f1f] p-3 flex justify-between items-center text-text-primary border-b border-divider border">
            <span className="text-xs font-bold flex items-center gap-2"><i className="fa-brands fa-google"></i> Google Preview</span>
            <div className="flex bg-surface-elevated rounded-full p-1 gap-1">
              <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded-full text-xs transition-colors ${previewMode === 'mobile' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-text-muted opacity-80 hover:text-text-primary'}`}><i className="fa-solid fa-mobile-screen"></i></button>
              <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded-full text-xs transition-colors ${previewMode === 'desktop' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-text-muted opacity-80 hover:text-text-primary'}`}><i className="fa-solid fa-desktop"></i></button>
            </div>
          </div>
          <div className="p-4 font-arial max-w-full overflow-hidden bg-[#ffffff]">
            {previewMode === 'mobile' ? (
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center border border-gray-200">{formData.image ? <img src={formData.image} className="w-full h-full object-cover" /> : <i className="fa-solid fa-globe text-gray-400 text-xs"></i>}</div>
                  <div className="flex flex-col leading-tight"><span className="text-[#202124] font-bold text-xs">UX Vision</span><span className="text-[#4d5156] text-[10px] truncate">uxvision.com.br › blog › {formData.slug || 'post-slug'}</span></div>
                </div>
                <div className="text-[#1a0dab] text-lg leading-tight mb-1 hover:underline cursor-pointer font-medium">{formData.meta_title || formData.title || 'Título do Artigo'}</div>
              </div>
            ) : (
              <div className="text-sm">
                <div className="text-[#202124] text-xs mb-1 flex items-center gap-1">{formData.image && <img src={formData.image} className="w-4 h-4 rounded-full object-cover border border-gray-200" />}<span>uxvision.com.br › blog › {formData.slug || 'post-slug'}</span></div>
                <div className="text-[#1a0dab] text-xl cursor-pointer hover:underline mb-1 font-medium">{formData.meta_title || formData.title || 'Título do Artigo'}</div>
              </div>
            )}
            <div className="text-[#4d5156] text-sm leading-snug"><span className="text-[#70757a]">{new Date().toLocaleDateString()} — </span>{formData.meta_description || 'A descrição do seu artigo aparecerá aqui nos resultados de busca do Google. Certifique-se de incluir a palavra-chave foco para melhor ranqueamento.'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
