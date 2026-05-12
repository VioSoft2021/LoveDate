export type Circle = {
  id: string
  name: string
  theme: string
  description: string
  tags: string[]
  memberCount: number
  hero: string
  events: Array<{
    id: string
    title: string
    when: string
    where: string
  }>
}

export type CirclePost = {
  id: string
  circleId: string
  author: string
  text: string
  createdAt: number
}
