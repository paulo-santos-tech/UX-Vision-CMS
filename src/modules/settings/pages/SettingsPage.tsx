import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase, supabaseKey, supabaseUrl } from '../../../supabaseClient';
import type { SiteSettings, UserRole, ViewState } from '../../../types';
import { Button, InputGroup, StyledInput, StyledTextArea } from '../../../shared/components/cms/FormControls';
import { useFeatureFlags } from '../../../app/providers/useFeatureFlags';
import { useToast } from '../../../app/providers/useToast';
import { useConfirm } from '../../../app/providers/useConfirm';
import { logAudit } from '../../../shared/lib/audit';

type MainTab = 'general' | 'modules' | 'team';
type GeneralSection = 'profile' | 'marketing' | 'infra' | 'install';

const generalSections: { id: GeneralSection; label: string; icon: string; helper: string }[] = [
  { id: 'profile', label: 'Marca e Perfil', icon: 'fa-solid fa-id-card', helper: 'Nome, avatar e redes.' },
  { id: 'marketing', label: 'Marketing', icon: 'fa-solid fa-bullhorn', helper: 'Pixels e tracking IDs.' },
  { id: 'infra', label: 'Infra e Scripts', icon: 'fa-solid fa-server', helper: 'Deploy e scripts globais.' },
  { id: 'install', label: 'Instalacao', icon: 'fa-solid fa-code', helper: 'Snippet para frontend.' },
];

const modulePresets: { id: string; label: string; flags: Partial<Record<ViewState, boolean>> }[] = [
  {
    id: 'full',
    label: 'Pacote Completo',
    flags: { blog: true, portfolio: true, microsaas: true, media: true, settings: true },
  },
  {
    id: 'institutional',
    label: 'Institucional',
    flags: { blog: true, portfolio: true, microsaas: false, media: true, settings: true },
  },
  {
    id: 'landing',
    label: 'Landing Simples',
    flags: { blog: false, portfolio: false, microsaas: false, media: true, settings: true },
  },
];

export const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('general');
  const [activeGeneralSection, setActiveGeneralSection] = useState<GeneralSection>('profile');
  const [data, setData] = useState<Partial<SiteSettings>>({});
  const [deploying, setDeploying] = useState(false);
  const [teamMembers, setTeamMembers] = useState<UserRole[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [savingFlags, setSavingFlags] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const { flags, setFlag, saveFlags } = useFeatureFlags();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const importFileRef = useRef<HTMLInputElement>(null);

  const loadTeam = async () => {
    setLoadingTeam(true);
    const { data } = await supabase.from('user_roles').select('*');
    if (data) setTeamMembers(data);
    setLoadingTeam(false);
  };

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('id', 1).single().then(({ data }) => {
      if (data) setData(data);
    });

    const timeout = window.setTimeout(() => {
      void loadTeam();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase.from('site_settings').update(data).eq('id', 1);
    if (error) {
      const { error: insertError } = await supabase.from('site_settings').insert([{ ...data, id: 1 }]);
      if (insertError) showToast('Erro: ' + insertError.message, 'error');
      else showToast('Configuracoes salvas.', 'success');
    } else {
      showToast('Configuracoes atualizadas.', 'success');
      void logAudit({ action: 'update', entity: 'site_settings', entityId: 1, payload: { section: activeGeneralSection } });
    }
    setSavingSettings(false);
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const name = `avatar_${Date.now()}`;
    await supabase.storage.from('portfolio-images').upload(name, file);
    const { data } = supabase.storage.from('portfolio-images').getPublicUrl(name);
    setData((p) => ({ ...p, author_avatar: data.publicUrl }));
  };

  const handleTriggerDeploy = async () => {
    setDeploying(true);
    await new Promise((r) => setTimeout(r, 2000));
    void logAudit({ action: 'trigger', entity: 'deploy', payload: { source: 'settings' } });
    showToast('Webhook disparado. O site esta sendo atualizado.', 'success');
    setDeploying(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const confirmed = await confirm({
      title: 'Alterar cargo',
      message: 'Tem certeza que deseja alterar o cargo deste usuario?',
      confirmText: 'Alterar',
    });
    if (!confirmed) return;
    const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
    if (error) showToast('Erro: ' + error.message, 'error');
    else {
      void logAudit({ action: 'update', entity: 'user_roles', entityId: userId, payload: { role: newRole } });
      showToast('Cargo atualizado.', 'success');
      loadTeam();
    }
  };

  const handleRemoveUser = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Remover acesso',
      message: 'Remover o acesso deste usuario? Ele nao podera mais logar no CMS.',
      confirmText: 'Remover',
    });
    if (!confirmed) return;
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (error) showToast('Erro: ' + error.message, 'error');
    else {
      void logAudit({ action: 'delete', entity: 'user_roles', entityId: userId });
      showToast('Acesso removido.', 'success');
      loadTeam();
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = modulePresets.find((p) => p.id === presetId);
    if (!preset) return;
    (Object.entries(preset.flags) as [ViewState, boolean][]).forEach(([feature, enabled]) => {
      setFlag(feature, enabled);
    });
    showToast(`Preset aplicado: ${preset.label}`, 'info');
  };

  const handleExportSettings = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      site_settings: data,
      enabled_modules: flags,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cms-settings-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Configuracoes exportadas.', 'success');
  };

  const handleImportSettings = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await file.text();

    try {
      const parsed = JSON.parse(raw) as {
        site_settings?: Partial<SiteSettings>;
        enabled_modules?: Partial<Record<ViewState, boolean>>;
      };
      if (parsed.site_settings) {
        setData((prev) => ({ ...prev, ...parsed.site_settings }));
      }
      if (parsed.enabled_modules) {
        (Object.entries(parsed.enabled_modules) as [ViewState, boolean][]).forEach(([feature, enabled]) => {
          setFlag(feature, Boolean(enabled));
        });
      }
      showToast('Configuracoes importadas para edicao. Clique em salvar para persistir.', 'info');
    } catch {
      showToast('Arquivo invalido para importacao.', 'error');
    }

    e.target.value = '';
  };

  const filteredTeam = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return teamMembers;
    return teamMembers.filter((member) => (member.email || '').toLowerCase().includes(q));
  }, [memberSearch, teamMembers]);

  const trackerSnippet = `
// Copie este código para o seu site frontend
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  '${supabaseUrl}',
  '${supabaseKey}'
);

const trackView = async () => {
  try {
    await supabase.from('page_analytics').insert([{
      path: window.location.pathname + window.location.search,
      referrer: document.referrer,
      user_agent: navigator.userAgent
    }]);
  } catch (e) { console.error('Analytics Error', e); }
};

trackView();
`;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-gradient-to-r from-neon-purple/10 to-neon-cyan/5 rounded-2xl p-6 backdrop-blur-md shadow-sm">
        <h2 className="text-heading">Configuracoes do CMS</h2>
        <p className="text-sm text-text-muted mt-1">Central unica para branding, operacao, modulos e equipe desta instancia.</p>
      </div>

      <div className="flex gap-2 pb-2 overflow-x-auto">
        <button onClick={() => setActiveTab('general')} className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${activeTab === 'general' ? 'bg-text-primary text-base shadow-md' : 'text-text-muted hover:text-text-primary'}`}>Geral</button>
        <button onClick={() => setActiveTab('modules')} className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${activeTab === 'modules' ? 'bg-text-primary text-base shadow-md' : 'text-text-muted hover:text-text-primary'}`}>Modulos</button>
        <button onClick={() => setActiveTab('team')} className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${activeTab === 'team' ? 'bg-text-primary text-base shadow-md' : 'text-text-muted hover:text-text-primary'}`}>Equipe</button>
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3 bg-surface rounded-2xl p-4 h-fit lg:sticky lg:top-24 shadow-sm">
            <div className="space-y-2">
              {generalSections.map((section) => (
                <button key={section.id} onClick={() => setActiveGeneralSection(section.id)} className={`w-full text-left px-4 py-3 rounded-2xl transition-all ${activeGeneralSection === section.id ? 'bg-neon-purple/10 text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'}`}>
                  <div className="flex items-center gap-2 text-sm font-bold"><i className={section.icon}></i>{section.label}</div>
                  <div className="text-[10px] text-text-muted opacity-60 mt-0.5 uppercase tracking-tight">{section.helper}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-2 space-y-2">
              <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full shadow-md">{savingSettings ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Salvando...</> : <><i className="fa-solid fa-floppy-disk"></i> Salvar Geral</>}</Button>
              <Button variant="secondary" onClick={handleTriggerDeploy} disabled={deploying} className="w-full">{deploying ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Atualizando...</> : <><i className="fa-solid fa-bolt"></i> Publicar</>}</Button>
              <Button variant="outline" onClick={handleExportSettings} className="w-full text-xs opacity-80"><i className="fa-solid fa-download"></i> Exportar</Button>
              <input ref={importFileRef} type="file" hidden accept="application/json" onChange={handleImportSettings} />
              <Button variant="outline" onClick={() => importFileRef.current?.click()} className="w-full text-xs opacity-80"><i className="fa-solid fa-upload"></i> Importar</Button>
            </div>
          </aside>

          <section className="lg:col-span-9 space-y-6">
            {activeGeneralSection === 'profile' && (
              <div className="bg-surface rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-5">Marca e Perfil</h3>
                <div className="flex flex-col items-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-surface-elevated overflow-hidden mb-2 relative group cursor-pointer shadow-inner">
                    <img src={data.author_avatar || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-surface/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><i className="fa-solid fa-camera text-text-primary"></i></div>
                    <input type="file" hidden className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatar} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="Nome"><StyledInput value={data.author_name || ''} onChange={(e) => setData({ ...data, author_name: e.target.value })} /></InputGroup>
                  <InputGroup label="Bio"><StyledTextArea value={data.author_bio || ''} onChange={(e) => setData({ ...data, author_bio: e.target.value })} rows={3} /></InputGroup>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                  <InputGroup icon="fa-brands fa-whatsapp"><StyledInput placeholder="WhatsApp" value={data.whatsapp || ''} onChange={(e) => setData({ ...data, whatsapp: e.target.value })} hasIcon /></InputGroup>
                  <InputGroup icon="fa-brands fa-instagram"><StyledInput placeholder="Instagram" value={data.instagram || ''} onChange={(e) => setData({ ...data, instagram: e.target.value })} hasIcon /></InputGroup>
                  <InputGroup icon="fa-brands fa-linkedin"><StyledInput placeholder="LinkedIn" value={data.linkedin || ''} onChange={(e) => setData({ ...data, linkedin: e.target.value })} hasIcon /></InputGroup>
                  <InputGroup icon="fa-brands fa-facebook"><StyledInput placeholder="Facebook" value={data.facebook || ''} onChange={(e) => setData({ ...data, facebook: e.target.value })} hasIcon /></InputGroup>
                  <InputGroup icon="fa-brands fa-telegram"><StyledInput placeholder="Telegram" value={data.telegram || ''} onChange={(e) => setData({ ...data, telegram: e.target.value })} hasIcon /></InputGroup>
                </div>
                <InputGroup label="Texto do Rodape (Copyright)"><StyledInput value={data.footer_text || ''} onChange={(e) => setData({ ...data, footer_text: e.target.value })} placeholder="© 2026 Nome do Cliente" /></InputGroup>
              </div>
            )}

            {activeGeneralSection === 'marketing' && (
              <div className="bg-surface rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Pixels e Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="GA4 ID"><StyledInput value={data.pixel_google || ''} onChange={(e) => setData({ ...data, pixel_google: e.target.value })} placeholder="G-XXXXX" /></InputGroup>
                  <InputGroup label="Meta Pixel"><StyledInput value={data.pixel_meta || ''} onChange={(e) => setData({ ...data, pixel_meta: e.target.value })} placeholder="ID 12345..." /></InputGroup>
                  <InputGroup label="TikTok Pixel"><StyledInput value={data.pixel_tiktok || ''} onChange={(e) => setData({ ...data, pixel_tiktok: e.target.value })} placeholder="ID..." /></InputGroup>
                  <InputGroup label="LinkedIn Tag"><StyledInput value={data.pixel_linkedin || ''} onChange={(e) => setData({ ...data, pixel_linkedin: e.target.value })} placeholder="ID..." /></InputGroup>
                </div>
              </div>
            )}

            {activeGeneralSection === 'infra' && (
              <div className="space-y-6">
                <div className="bg-surface rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold mb-4">Deploy</h3>
                  <p className="text-xs text-text-muted mb-4">Dispare uma atualizacao manual no frontend.</p>
                  <Button onClick={handleTriggerDeploy} disabled={deploying}>{deploying ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Atualizando...</> : <><i className="fa-solid fa-bolt"></i> Publicar Alteracoes</>}</Button>
                </div>
                <div className="bg-surface rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold mb-4">Scripts Globais</h3>
                  <InputGroup label="HEAD Scripts"><StyledTextArea value={data.head_scripts || ''} onChange={(e) => setData({ ...data, head_scripts: e.target.value })} className="font-mono text-xs" placeholder="<script>...</script>" /></InputGroup>
                  <InputGroup label="BODY Scripts"><StyledTextArea value={data.body_scripts || ''} onChange={(e) => setData({ ...data, body_scripts: e.target.value })} className="font-mono text-xs" placeholder="<script>...</script>" /></InputGroup>
                </div>
              </div>
            )}

            {activeGeneralSection === 'install' && (
              <div className="bg-surface rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Snippet de instalacao</h3>
                <div className="bg-surface-elevated p-4 rounded text-[10px] font-mono overflow-x-auto relative group">
                  {trackerSnippet.trim()}
                  <button type="button" onClick={() => { navigator.clipboard.writeText(trackerSnippet); showToast('Snippet copiado.', 'success'); }} className="absolute top-2 right-2 text-text-muted opacity-80 hover:text-text-primary"><i className="fa-solid fa-copy"></i></button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="bg-surface rounded-2xl p-6 backdrop-blur-md animate-fade-in space-y-6 shadow-sm">
          <div>
            <h3 className="text-heading text-xl text-text-primary">Feature Flags por instancia</h3>
            <p className="text-sm text-text-muted opacity-80">Ative ou desative modulos para este cliente sem alterar codigo.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {modulePresets.map((preset) => (
              <Button key={preset.id} variant="outline" onClick={() => handleApplyPreset(preset.id)} className="!py-2 text-xs">
                <i className="fa-solid fa-layer-group"></i> {preset.label}
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            {([
              ['blog', 'Blog'],
              ['portfolio', 'Portfolio'],
              ['microsaas', 'Microsaas'],
              ['media', 'Midia'],
              ['settings', 'Configuracoes'],
            ] as [ViewState, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between bg-surface-elevated rounded-xl px-4 py-3 shadow-sm">
                <div>
                  <p className="font-bold text-text-primary">{label}</p>
                  <p className="text-[10px] text-text-muted opacity-70 uppercase tracking-tight">Controle de visibilidade no menu e rotas</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFlag(key, !flags[key])}
                  className={`w-12 h-6 rounded-full transition-all relative ${flags[key] ? 'bg-neon-cyan shadow-[0_0_10px_rgba(0,226,255,0.4)]' : 'bg-text-muted/20'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${flags[key] ? 'left-6.5' : 'left-0.5'}`}></span>
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={async () => {
                setSavingFlags(true);
                const result = await saveFlags();
                setSavingFlags(false);
                if (!result.ok) {
                  showToast(result.message || 'Falha ao salvar modulos.', 'error');
                  return;
                }
                void logAudit({ action: 'update', entity: 'feature_flags', entityId: 1, payload: { flags } });
                showToast('Modulos salvos com sucesso.', 'success');
              }}
              disabled={savingFlags}
            >
              {savingFlags ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Salvando...</> : <><i className="fa-solid fa-toggle-on"></i> Salvar Modulos</>}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="bg-surface rounded-2xl p-6 backdrop-blur-md animate-fade-in shadow-sm">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-heading text-xl text-text-primary">Equipe do CMS</h3>
              <p className="text-sm text-text-muted opacity-80">Gerencie quem tem acesso ao painel administrativo.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadTeam}><i className="fa-solid fa-rotate"></i> Atualizar</Button>
              <Button onClick={() => showToast('Crie no Supabase Auth e adicione em user_roles.', 'info')}><i className="fa-solid fa-user-plus"></i> Novo Usuario</Button>
            </div>
          </div>

          <div className="mb-4">
            <StyledInput value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Buscar por e-mail..." />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-text-muted opacity-60 uppercase tracking-widest bg-surface-elevated/50">
                  <th className="py-4 px-4 font-bold rounded-l-xl">Usuario</th>
                  <th className="py-4 px-4 font-bold">Cargo</th>
                  <th className="py-4 px-4 font-bold text-right rounded-r-xl">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeam.map((member) => (
                  <tr key={member.user_id} className="hover:bg-surface-elevated/40 transition-all group">
                    <td className="py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 flex items-center justify-center text-xs font-bold text-text-primary border border-divider">
                        {member.email ? member.email[0].toUpperCase() : <i className="fa-solid fa-user"></i>}
                      </div>
                      <span className="text-sm text-text-primary opacity-90 font-medium">{member.email || 'Email oculto'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <select value={member.role} onChange={(e) => handleRoleChange(member.user_id, e.target.value)} className={`bg-transparent border-none text-[11px] font-black uppercase tracking-widest outline-none focus:ring-0 ${member.role === 'admin' ? 'text-neon-cyan' : 'text-text-muted'}`}>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button onClick={() => { void handleRemoveUser(member.user_id); }} className="text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-2" title="Remover Acesso"><i className="fa-solid fa-trash-can text-xs"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTeam.length === 0 && !loadingTeam && <div className="text-center py-8 text-text-muted opacity-60 italic">Nenhum membro encontrado.</div>}
          </div>
        </div>
      )}
    </div>
  );
};
