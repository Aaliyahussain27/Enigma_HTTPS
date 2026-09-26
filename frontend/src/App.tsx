import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Welcome } from './pages/Welcome';
import { Upload } from './pages/Upload';
import { Processing } from './pages/Processing';
import { Home } from './pages/Home';
import { Assets } from './pages/Assets';
import { AssetDetail } from './pages/AssetDetail';
import { Actions } from './pages/Actions';
import { Closure } from './pages/Closure';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Welcome />} />
          <Route path="upload" element={<Upload />} />
          <Route path="processing" element={<Processing />} />
          <Route path="home" element={<Home />} />
          <Route path="assets" element={<Assets />} />
          <Route path="assets/:id" element={<AssetDetail />} />
          <Route path="actions" element={<Actions />} />
          <Route path="closure" element={<Closure />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
