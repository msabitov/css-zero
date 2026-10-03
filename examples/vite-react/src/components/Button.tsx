import { btn, btnBg, radiusKey } from '@css-zero/demo-lib/buttons';
import { paddingSmX } from '@css-zero/demo-lib/indents';

export function Button({
    radius = '1rem'
}: {
    radius?: string
}) {
    return (
        <div className={paddingSmX} style={{ [radiusKey]: radius }}>
            <button className={`${btn} ${btnBg.primary}`}>
                I use CSS from separate CSS-Zero styles lib
            </button>
        </div>
    );
}