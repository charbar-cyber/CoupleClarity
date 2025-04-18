import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize theme from localStorage or use light as default
function initializeTheme() {
  const storedTheme = localStorage.getItem('theme');

  if (storedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (storedTheme === 'system') {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  } else {
    // Use light theme as default
    document.documentElement.classList.remove('dark');
  }
}

// Run theme initialization before rendering the app
initializeTheme();

window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);