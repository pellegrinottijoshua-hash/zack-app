import { createRoot } from 'react-dom/client';
import Landing from './Landing.jsx';
import './landing.css';

// Entrata separata dall'app di proposito: la pagina che deve convincere non
// può caricare ONNX Runtime e i modelli. È la differenza fra aprirsi subito e
// far aspettare qualcuno che non ha ancora deciso di restare.
createRoot(document.getElementById('root')).render(<Landing />);
