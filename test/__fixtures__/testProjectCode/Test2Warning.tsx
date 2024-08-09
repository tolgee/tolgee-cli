// @ts-nocheck

import { T } from '@tolgee/react';
import { bird } from '#earth/animals';

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
          <T keyName="bird-name" /> goes{' '}
          <T keyName="bird-sound" defaultValue={bird.sound} />
        </li>
        <li>and Mouse goes Squeek</li>
        <li>...</li>
      </ul>
      <p>What does the fox say?</p>
    </Fragment>
  );
}
