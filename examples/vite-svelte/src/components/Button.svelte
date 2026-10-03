<script lang="ts">
    import { btn, btnBg, radiusKey } from '@css-zero/demo-lib/buttons';
    import { paddingSmX } from '@css-zero/demo-lib/indents';

    let { radius = '1rem' }: { radius?: string } = $props();
</script>

<div class={paddingSmX} style={`${radiusKey}: ${radius}`}>
    <button class={`${btn} ${btnBg.primary}`}>
        I use CSS from separate CSS-Zero styles lib
    </button>
</div>