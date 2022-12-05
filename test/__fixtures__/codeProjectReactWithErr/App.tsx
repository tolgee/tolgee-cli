// @ts-nocheck

import React, { useMemo } from 'react';
import { T } from '@tolgee/react';

import HelloWorld from './HelloWorld';

export default function App() {
  const luckyNumber = useMemo(() => Math.floor(Math.random() * 10), []);
  return (
    <main>
      <h1>
        <T keyName="welcome" defaultValue="Welcome!" />
      </h1>
      <section>
        <HelloWorld />
      </section>
      <section>
        <h2>
          <T
            keyName="lucky-quote-heading"
            defaultValue="Here's your lucky quote!"
          />
        </h2>
        <p>
          <T keyName={`lucky-quote-${luckyNumber}`} />
        </p>
      </section>
    </main>
  );
}
