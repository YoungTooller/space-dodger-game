import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Reviews from './pages/Reviews.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/reviews" element={<Reviews />} />
    </Routes>
  );
}
