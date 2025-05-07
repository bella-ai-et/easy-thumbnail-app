import { createFileRoute } from '@tanstack/react-router';
import CartoonHero from '../components/cartoon-hero';

export const Route = createFileRoute('/')({
    component: Index,
    ssr: true,
})

function Index() {
    return (
        <CartoonHero />
    )
}