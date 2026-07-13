export default function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="mb-2 text-xs font-black uppercase tracking-wider text-teal-700">{eyebrow}</p>
        <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>}
      </div>
      {children}
    </div>
  );
}
