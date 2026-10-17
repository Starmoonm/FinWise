import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure html/body never have dark class; light theme only
document.documentElement.classList.remove('dark');
document.body.classList.remove('dark');
localStorage.removeItem('mk_theme_preference');
localStorage.removeItem('mk_dark_mode');

createRoot(document.getElementById('root')!).render(<App />);
