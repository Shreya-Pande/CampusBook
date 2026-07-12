import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'campusbook-theme'

const getInitialIsDark = () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Shared by the public navbar and the authenticated Topbar so toggling in
// either place stays in sync via the same localStorage-backed class on <html>.
export const useDarkMode = () => {
  const [isDark, setIsDark] = useState(getInitialIsDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  const toggle = useCallback(() => setIsDark((prev) => !prev), [])

  return { isDark, toggle }
}

export default useDarkMode
