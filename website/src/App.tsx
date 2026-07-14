import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Roulette } from './pages/Roulette';
import { Games } from './pages/Games';
import { Admin } from './pages/Admin';
import { PrivateSection } from './pages/PrivateSection';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="auth/discord/callback" element={<Profile />} />
          <Route path="profile" element={<Profile />} />
          <Route path="roulette" element={<Roulette />} />
          <Route path="games" element={<Games />} />
          <Route path="private" element={<PrivateSection />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
