import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google';

createRoot(document.getElementById('root')).render(
<GoogleOAuthProvider clientId="876673268691-scqmciamd7gcmec4jrg2v0hv2a0hkerj.apps.googleusercontent.com">
  <App />
</GoogleOAuthProvider>
)
