// @ts-nocheck

import { T } from '@tolgee/react';

export default function App() {
  return (
    <Fragment>
      <ul>
        <li>
          <T keyName="cat-name" /> goes <T keyName="cat-sound" />
        </li>
        <li>
          <T keyName="dog-name" /> goes <T keyName="dog-sound" />
        </li>
        <li>Bird goes Tweet</li>
        <li>and Mouse goes Squeek</li>
        <li>...</li>
      </ul>
      <p>What does the fox say?</p>
    </Fragment>
  );
}
