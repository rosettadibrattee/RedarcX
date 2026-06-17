export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border-subtle py-6 text-center">
      <div className="flex flex-col items-center gap-2 px-4">
        <a
          href="https://github.com/rosettadibrattee"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
        >
          github.com/rosettadibrattee
        </a>
        <div className="text-[11px] text-text-tertiary">
          <span>RedarcX - Self-Hostable Reddit Archive</span>
          {' · '}
          <a
            href="https://github.com/rosettadibrattee/RedarcX"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            GitHub Project
          </a>
          {' · '}
          <a
            href="https://github.com/Yakabuff/redarc"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            Original Yakabuff/redarc
          </a>
          {' · '}
          <a
            href="http://opensource.org/licenses/MIT"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            MIT License
          </a>
        </div>
      </div>
    </footer>
  );
}
