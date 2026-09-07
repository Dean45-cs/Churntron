import { redirect } from 'next/navigation'

export default function Home() {
  // Die Middleware schickt nicht angemeldete Nutzer von hier aus auf /login.
  redirect('/dashboard')
}
