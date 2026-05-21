import './loading-spinner.css'

type LoadingSpinnerProps = {
  'aria-label'?: string
  className?: string
}

export function LoadingSpinner({
  'aria-label': ariaLabel = 'Loading',
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={className ? `loading-spinner ${className}` : 'loading-spinner'}
      role="status"
      aria-label={ariaLabel}
    />
  )
}
