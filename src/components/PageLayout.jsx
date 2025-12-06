import { clsx } from "clsx";

export default function PageLayout({
  children,
  title,
  subtitle,
  icon: Icon,
  action,
  className,
}) {
  return (
    <div className="min-h-full flex flex-col">
      <div
        className={clsx(
          "flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8",
          className
        )}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 shrink-0">
                <Icon size={24} />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              {subtitle && <p className="text-zinc-400 mt-1">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>

        {/* Content */}
        <div className="flex-1">{children}</div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-zinc-600 text-sm mt-auto border-t border-zinc-800/50">
        <p>
          Powered by{" "}
          <a
            href="https://racoondevs.com"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-500 hover:text-emerald-500 transition-colors font-medium"
          >
            RacoonDevs
          </a>
        </p>
      </footer>
    </div>
  );
}
