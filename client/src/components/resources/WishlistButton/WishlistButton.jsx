import { useState } from 'react'
import { Heart } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMutation } from '@tanstack/react-query'
import { toggleSaveResource } from '../../../api/resource.api'
import { useAuthStore } from '../../../store/authStore'
import './WishlistButton.css'

const WishlistButton = ({ resourceId, className = '' }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const savedResources = useAuthStore((state) => state.user?.savedResources)
  const [isSaved, setIsSaved] = useState(() => (savedResources || []).some((id) => id === resourceId))

  const mutation = useMutation({
    mutationFn: () => toggleSaveResource(resourceId),
    onSuccess: (res) => {
      setIsSaved(res.data.saved)
      toast.success(res.data.saved ? 'Added to wishlist' : 'Removed from wishlist')
    },
    onError: () => toast.error('Could not update wishlist'),
  })

  const handleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isAuthenticated) {
      toast('Login to save resources', { icon: '🔒' })
      return
    }
    mutation.mutate()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={mutation.isPending}
      aria-label={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`wishlist-button flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow hover:text-rose-500 dark:bg-gray-900/90 dark:text-gray-400 ${className}`}
    >
      <Heart size={16} className={isSaved ? 'is-saved fill-rose-500 text-rose-500' : ''} />
    </button>
  )
}

export default WishlistButton
