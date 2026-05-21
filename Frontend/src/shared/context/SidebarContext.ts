// Re-export SidebarContext dari lokasi asli (src/context/SidebarContext.tsx)
// Dibutuhkan oleh shared/hooks/useSidebar.ts yang import dari '../context/SidebarContext'
export { SidebarContext, SidebarProvider } from '../../context/SidebarContext';