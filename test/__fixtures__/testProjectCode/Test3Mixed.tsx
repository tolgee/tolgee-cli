// @ts-nocheck

import { T } from '@tolgee/react';

export default function App() {
  return (
    <Fragment>
      <section>
        <h1>
          <T keyName="welcome">Welcome!</T>
        </h1>
        <ul>
          <li>
            <T keyName="table" ns="furniture" />
          </li>
          <li>
            <T keyName="chair" ns="furniture" />
          </li>
          <li>
            <T keyName="plate" />
          </li>
          <li>
            <T keyName="fork" />
          </li>
          <li>
            <T keyName="knife" />
          </li>
        </ul>
      </section>
      <section>
        <h2>drinks</h2>
        <ul>
          <li>
            <T keyName="water" ns="drinks" />
          </li>
        </ul>
      </section>
      <section>
        <h2>foods</h2>
        <ul>
          <li>
            <T keyName="salad" ns="food" />
          </li>
          <li>
            <T keyName="tomato" ns="food" />
          </li>
          <li>
            <T keyName="onions" ns="food" />
          </li>
          <li>
            <T keyName="cookies" ns="food" />
          </li>
        </ul>
      </section>
    </Fragment>
  );
}
