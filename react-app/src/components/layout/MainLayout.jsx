import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navigation from './Navigation';
import MobileNavigation from './MobileNavigation';
import './Layout.css';

export default function MainLayout() {
  return (
    <div className="app-layout">
      <Header />
      <Navigation />
      <main className="main-content">
        <Outlet />
      </main>
      <MobileNavigation />
    </div>
  );
}
