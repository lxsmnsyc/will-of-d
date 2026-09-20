import { HydrationScript } from '@solidjs/web';
import type { ParentProps } from 'solid-js';

export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Will of D. — One Piece relationship graph</title>
        <meta
          name="description"
          content="Who raised, trained, inspired and saved whom across One Piece, as a self-balancing graph."
        />
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
