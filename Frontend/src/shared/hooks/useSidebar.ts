import { useContext } from "react";
import { SidebarContext } from "../../context/SidebarContext";
import type { SidebarContextType } from "../types";

/**
 * useSidebar Hook — akses sidebar context
 */
export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error(
      "useSidebar must be used within a SidebarProvider. " +
      "Make sure your component is wrapped with <SidebarProvider>"
    );
  }

  return context;
};

// Convenience hooks — disesuaikan dengan field SidebarContextType asli
// (isCollapsed, toggleSidebar, isMobileMenuOpen, toggleMobileMenu, closeMobileMenu)

export const useSidebarIsOpen = (): boolean => {
  const { isCollapsed } = useSidebar();
  return !isCollapsed; // isCollapsed = true artinya sidebar TERTUTUP
};

export const useSidebarIsMobile = (): boolean => {
  const { isMobileMenuOpen } = useSidebar();
  return isMobileMenuOpen;
};

export const useSidebarToggle = () => {
  const { toggleSidebar } = useSidebar();
  return toggleSidebar;
};

export const useSidebarClose = () => {
  const { closeMobileMenu } = useSidebar();
  return closeMobileMenu;
};

export const useSidebarOpen = () => {
  const { toggleMobileMenu } = useSidebar();
  return toggleMobileMenu;
};