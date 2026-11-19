import { installStoreScopeFetch } from './infrastructure/http/storeScope';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

installStoreScopeFetch();
createRoot(document.getElementById('root')!).render(<App />);
