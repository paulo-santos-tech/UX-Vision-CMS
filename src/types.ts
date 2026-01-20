
// Define a estrutura de um item do Portfólio
export interface PortfolioItem {
  id: number;
  created_at: string;
  title: string;
  category: string;
  image: string; // Capa (image_url)
  description: string; // Descrição curta
  
  // Novos Campos
  full_description?: string; // HTML Rico
  challenge?: string;
  solution?: string;
  client?: string;
  year?: string;
  link?: string;
  technologies?: string[]; // Array de strings (ex: ["React", "Node"])
  gallery?: string[]; // Array de URLs de imagens
}

// Define a estrutura de um produto Microsaas
export interface MicrosaasItem {
  id: number;
  created_at: string;
  name: string;
  description: string; // Agora suportará HTML
  image?: string; // Novo campo para Ícone/Logo
  status: 'Venda' | 'Uso' | 'Beta';
  price: string;
  link: string;
  features: string[];
}

// Define a estrutura de um Post do Blog
export interface BlogPost {
  id: number;
  created_at: string;
  title: string;
  slug: string;
  excerpt?: string; // Resumo curto
  category: string;
  content: string;
  image: string;
  author?: string; // Nome do autor
  read_time?: string; // Tempo de leitura (ex: "5 min")
  meta_title: string;
  meta_description: string;
  keyword: string;
  status: 'published' | 'draft' | 'scheduled';
  scheduled_at: string | null;
  social_shares: {
    wa: boolean;
    fb: boolean;
    li: boolean;
    tg: boolean;
    tw: boolean;
  };
}

// Define a estrutura para itens de verificação de SEO
export interface SeoCheckItem {
  id: string;
  label: string;
  status: 'good' | 'warning' | 'bad';
  message: string;
}

// Define a estrutura de uma Categoria
export interface BlogCategory {
  id: number;
  created_at: string;
  name: string;
}

// Define a estrutura das Configurações do Site
export interface SiteSettings {
  id: number;
  whatsapp: string;
  instagram: string;
  linkedin: string;
  facebook: string;
  telegram: string;
  author_name: string;
  author_bio: string;
  author_avatar: string;
  pixel_google: string;
  pixel_meta: string;
  pixel_tiktok: string;
  pixel_linkedin: string;
  footer_text: string;
  head_scripts: string;
  body_scripts: string;
}

// Dados de Analytics
export interface PageView {
  id: number;
  created_at: string;
  path: string;
  referrer: string | null;
  user_agent: string | null;
}

// Define os papéis de usuário
export interface UserRole {
  user_id: string;
  role: 'admin' | 'editor';
}

// Define as telas disponíveis para navegação
export type ViewState = 'dashboard' | 'blog' | 'portfolio' | 'microsaas' | 'media' | 'settings';
