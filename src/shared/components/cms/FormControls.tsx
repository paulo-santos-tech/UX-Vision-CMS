import type React from 'react';

export const InputGroup = ({ label, children, icon, className = '' }: { label?: string; children?: React.ReactNode; icon?: string; className?: string }) => (
  <div className={`mb-5 w-full relative ${className}`}>
    {label && <label className="block mb-2 text-xs text-text-muted uppercase tracking-wide font-semibold">{label}</label>}
    <div className="relative">
      {icon && <i className={`${icon} absolute left-4 top-1/2 -translate-y-1/2 text-lg text-neon-cyan opacity-80 pointer-events-none z-10`}></i>}
      {children}
    </div>
  </div>
);

export const StyledInput = (props: React.InputHTMLAttributes<HTMLInputElement> & { hasIcon?: boolean }) => (
  <input {...props} className={`w-full bg-surface-elevated border border-divider rounded-xl text-text-primary text-sm transition-all focus:border-neon-purple focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-neon-purple/20 ${props.hasIcon ? 'pl-12 py-4' : 'px-4 py-3'} ${props.className}`} />
);

export const StyledTextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasIcon?: boolean }) => (
  <textarea {...props} className={`w-full bg-surface-elevated border border-divider rounded-xl text-text-primary text-sm transition-all focus:border-neon-purple focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-neon-purple/20 min-h-[100px] resize-y ${props.hasIcon ? 'pl-12 py-4' : 'px-4 py-3'} ${props.className}`} />
);

export const StyledSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={`w-full bg-surface-elevated border border-divider rounded-xl text-text-primary text-sm transition-all focus:border-neon-purple focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-neon-purple/20 px-4 py-3 appearance-none ${props.className}`}>
    {props.children}
  </select>
);

export const Button = ({ children, onClick, variant = 'primary', type = 'button', className = '', disabled }: { children?: React.ReactNode; onClick?: React.MouseEventHandler<HTMLButtonElement>; variant?: 'primary' | 'secondary' | 'danger' | 'outline'; type?: 'button' | 'submit'; className?: string; disabled?: boolean }) => {
  const baseStyle = 'px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2';
  const variants = {
    primary: 'bg-gradient-to-br from-[#b200ff] to-[#7b00ff] text-text-primary shadow-lg shadow-neon-purple/20 hover:-translate-y-0.5 hover:shadow-neon-purple/30',
    secondary: 'bg-surface-elevated border border-divider text-text-primary hover:bg-surface-elevated hover:border-divider border',
    danger: 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40',
    outline: 'bg-transparent border border-divider text-text-primary opacity-80 hover:text-text-primary hover:border-neon-cyan/40 hover:bg-neon-cyan/5',
  };

  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>{children}</button>;
};

export const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-cyan"></div>
  </div>
);
