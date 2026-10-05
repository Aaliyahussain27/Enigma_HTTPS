import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Welcome } from './pages/Welcome';
import { Home } from './pages/Home';
import { AssetDetail } from './pages/AssetDetail';
import { Actions } from './pages/Actions';
import { Closure } from './pages/Closure';
import { Documents } from './pages/Documents';
import { CategoryBrowser } from './pages/CategoryBrowser';
import { Upload } from './pages/Upload';
import Login from './pages/login';
import EstateSetup from './pages/estate-setup';

const ProtectedRoute = () => {
  const token = localStorage.getItem('jwt');
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
};

import { ChatWidget } from './components/ChatWidget';

const EstateSelectedRoute = () => {
  const estateId = localStorage.getItem('current_estate_id');
  const location = useLocation();
  if (!estateId) {
    return <Navigate to="/estate-setup" state={{ from: location }} replace />;
  }
  return (
    <>
      <Outlet />
      <ChatWidget />
    </>
  );
};

const RootRedirect = () => {
  const token = localStorage.getItem('jwt');
  if (!token) return <Navigate to="/login" replace />;
  const estateId = localStorage.getItem('current_estate_id');
  if (!estateId) return <Navigate to="/estate-setup" replace />;
  return <Navigate to="/home" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/estate-setup" element={<EstateSetup />} />

          <Route element={<EstateSelectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/welcome" element={<Welcome />} />
              {/* Category picker leads to upload */}
              <Route path="/upload" element={<CategoryBrowser />} />
              <Route path="/uploads" element={<CategoryBrowser />} />
              <Route path="/upload/file" element={<Upload />} />
              <Route path="/home" element={<Home />} />
              <Route path="/assets/:id" element={<AssetDetail />} />
              <Route path="/actions" element={<Actions />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/closure" element={<Closure />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
