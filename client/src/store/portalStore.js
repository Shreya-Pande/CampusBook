import { create } from 'zustand'

export const usePortalStore = create((set) => ({
  status: null, // 'open' | 'closed' | null
  nextOpen: null, // ISO string
  nextClose: null, // ISO string
  currentWeek: null, // { weekStartDate, weekEndDate }
  selectedDate: null, // Currently selected date on the resources page

  setPortalData: ({ status, nextOpen, nextClose, currentWeek }) =>
    set({ status, nextOpen, nextClose, currentWeek }),

  setSelectedDate: (selectedDate) => set({ selectedDate }),
}))

export default usePortalStore
