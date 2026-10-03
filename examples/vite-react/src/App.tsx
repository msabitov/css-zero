import { Button } from './components/Button';
import { Card } from './components/Card';

export function App() {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: 24,
            }}
        >
            <Button />
            <Card />
        </div>
    );
}
