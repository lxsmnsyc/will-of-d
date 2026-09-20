import { Show } from 'solid-js';
import { hasPortrait, initials, portraitUrl } from '../graph/portraits';

export interface AvatarProps {
  id: string;
  name: string;
  size: number;
}

export function Avatar(props: AvatarProps) {
  return (
    <span
      class="avatar"
      style={{ width: `${props.size}px`, height: `${props.size}px` }}
      aria-hidden="true"
    >
      <Show
        when={hasPortrait(props.id)}
        fallback={
          <span style={{ 'font-size': `${Math.round(props.size * 0.4)}px` }}>
            {initials(props.name)}
          </span>
        }
      >
        <img src={portraitUrl(props.id)} alt="" loading="lazy" />
      </Show>
    </span>
  );
}
