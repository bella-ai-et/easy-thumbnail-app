import { createFileRoute } from '@tanstack/react-router';
import ThumbnailEditor from '../components/thumbnail-editor';

export const Route = createFileRoute('/')({
    component: Index,
    ssr: true,
})

function Index() {
    return (
        <ThumbnailEditor />
    )
}