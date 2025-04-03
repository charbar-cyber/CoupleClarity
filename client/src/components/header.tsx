import { useState } from 'react';
import { Link } from 'wouter';

export default function Header() {
  const [user] = useState({
    initials: 'JS',
  });

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <div className="h-10 w-10 rounded-full overflow-hidden gradient-bg flex items-center justify-center mr-3">
              <span className="text-white text-xl font-heading font-bold">CC</span>
            </div>
            <h1 className="text-xl font-heading font-semibold text-primary">CoupleClarity</h1>
          </div>
        </Link>
        
        <div className="flex items-center space-x-4">
          <Link href="/history">
            <button className="text-neutral-700 hover:text-primary transition-colors">
              <i className="fas fa-history text-lg"></i>
            </button>
          </Link>
          <button className="text-neutral-700 hover:text-primary transition-colors">
            <i className="fas fa-cog text-lg"></i>
          </button>
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
              <span className="font-medium text-sm">{user.initials}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
