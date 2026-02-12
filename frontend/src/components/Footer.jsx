export default function Footer() {
  return (
    <footer className="text-center py-6 mt-auto border-t border-border-subtle text-[11px] text-text-tertiary">
      <a href="https://github.com/yakabuff/redarc" className="hover:text-accent transition-colors">redarc</a>
      {' — self-hosted reddit archive — licensed under the '}
      <a href="http://opensource.org/licenses/MIT" className="hover:text-accent transition-colors">MIT License</a>
    </footer>
  );
}
