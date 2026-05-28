import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import './photo-frame.css'

type PhotoFrameProps = {
  children: ReactNode
} & ComponentPropsWithoutRef<'main'>

export function PhotoFrame({ children, className, ...mainProps }: PhotoFrameProps) {
  const classes = className ? `frame ${className}` : 'frame'
  return (
    <main className={classes} {...mainProps}>
      {children}
    </main>
  )
}
