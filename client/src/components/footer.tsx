export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 py-4 mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
        <div className="text-sm text-neutral-500 mb-3 md:mb-0">
          © {new Date().getFullYear()} CoupleClarity. All rights reserved.
        </div>
        <div className="flex space-x-6">
          <a href="#" className="text-sm text-neutral-500 hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="text-sm text-neutral-500 hover:text-primary transition-colors">Terms</a>
          <a href="#" className="text-sm text-neutral-500 hover:text-primary transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
}
