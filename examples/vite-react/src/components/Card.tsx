import { card, cardSize, title } from '../styles/card.css';

export function Card() {
    return (
        <div className={`${card} ${cardSize.md}`}>
            <h3 className={title}>Card title</h3>
            <p style={{margin: '0 auto', width: 'max-content'}}>Built with CSS-Zero contract modules</p>
        </div>
    );
}