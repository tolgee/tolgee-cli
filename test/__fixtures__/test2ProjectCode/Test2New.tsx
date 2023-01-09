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
        <li>
          <T keyName="bird-name" /> goes <T keyName="bird-sound" />
        </li>
        <li>
          and <T keyName="mouse-name">Mouse</T> goes{' '}
          <T keyName="mouse-sound">Squeek</T>
        </li>
      </ul>
      <p>What does the fox say?</p>
    </Fragment>
  );
}
