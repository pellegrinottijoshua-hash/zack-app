import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// No StrictMode: svgcanvas owns its DOM subtree and is not React-aware, so the
// deliberate double-mount would build two editors into the same container.
createRoot(document.getElementById('root')).render(<App />);
