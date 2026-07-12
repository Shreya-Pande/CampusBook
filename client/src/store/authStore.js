import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const initialState = {
  user: null,
  role: null,
  designation: null,
  adminType: null,
  department: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
}

export const useAuthStore = create(
  persist(
    (set) => ({
      ...initialState,

      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          role: user?.role ?? null,
          designation: user?.designation ?? null,
          adminType: user?.adminType ?? null,
          department: user?.department ?? null,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      logout: () => set(initialState),
    }),
    { name: 'campusbook-auth' },
  ),
)

export default useAuthStore
