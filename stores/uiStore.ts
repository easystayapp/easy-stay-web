import { create } from 'zustand';

interface UIState {
    sidebarOpen: boolean;
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;
    toggleCollapse: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    sidebarOpen: false,
    sidebarCollapsed: false,
    toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    closeSidebar: () => set({ sidebarOpen: false }),
    toggleCollapse: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
