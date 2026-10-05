import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants'
import { Brand } from '../components/Brand'
import { Footer } from '../components/Footer'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <title>{`Not found · ${APP_NAME}`}</title>
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <Link to="/" className="mb-8 text-foreground"><Brand /></Link>
        <h1 className="mb-2 font-mono text-5xl font-black text-foreground">404</h1>
        <p className="mb-6 text-muted-foreground">Page not found</p>
        <Link
          to="/home"
          className="rounded-md bg-primary px-5 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90"
        >
          Go to the duels
        </Link>
      </div>
      <Footer />
    </div>
  )
}
