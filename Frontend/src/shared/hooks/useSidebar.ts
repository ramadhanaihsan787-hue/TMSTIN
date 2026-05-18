import { useContext } from "react";
import { SidebarContext } from "../../context/SidebarContext";

/**
 * useSidebar Hook
 * Custom hook for accessing sidebar context
 * Simplifies sidebar state management across components
 *
 * @returns {SidebarContextType} Sidebar context with state and control methods
 * @throws {Error} If used outside SidebarProvider
 *
 * @example
 * const { isOpen, isMobile, toggle, close, open } = useSidebar();
 */
export const useSidebar = (): any => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error(
      "useSidebar must be used within a SidebarProvider. " +
      "Make sure your component is wrapped with <SidebarProvider>"
    );
  }

  return context;
};

/**
 * Convenience hook to check if sidebar is open
 */
export const useSidebarIsOpen = (): boolean => {
  const { isOpen } = useSidebar();
  return isOpen;
};

/**
 * Convenience hook to check if device is mobile
 */
export const useSidebarIsMobile = (): boolean => {
  const { isMobile } = useSidebar();
  return isMobile;
};

/**
 * Convenience hook to get sidebar toggle function
 */
export const useSidebarToggle = () => {
  const { toggle } = useSidebar();
  return toggle;
};

/**
 * Convenience hook to get sidebar close function
 */
export const useSidebarClose = () => {
  const { close } = useSidebar();
  return close;
};

/**
 * Convenience hook to get sidebar open function
 */
export const useSidebarOpen = () => {
  const { open } = useSidebar();
  return open;
};
