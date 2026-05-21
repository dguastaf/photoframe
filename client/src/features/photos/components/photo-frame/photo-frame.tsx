import type { ReactNode } from 'react'
import './photo-frame.css'

type PhotoFrameProps = {
  children: ReactNode
}

export function PhotoFrame({ children }: PhotoFrameProps) {
  return <main className="frame">{children}</main>
}
